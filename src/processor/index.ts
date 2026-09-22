import { env, pipeline } from '@huggingface/transformers';
import { createWorker, OEM, type Worker } from 'tesseract.js';

import ortMjsUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url';

import { captureDataUrlToBlob } from './capture';
import { downloadProgress } from '../shared/progress';
import { getOcrModes, normalizeOcrPolarity } from './ocr';
import { toBitmapCrop, type SelectionRect, type ViewportSize } from '../shared/geometry';
import {
  isProcessorRequest,
  type ErrorResult,
  type OperationResult,
  type ProcessingStage,
  type ProcessorRequest,
} from '../shared/messages';
const TRANSLATION_MODEL = 'Xenova/opus-mt-zh-en';

let ocrWorkerPromise: Promise<Worker> | undefined;
let translatorPromise: Promise<any> | undefined;
let activeProgressSessionId = '';
let processingQueue = Promise.resolve();

configureLocalRuntime();

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isProcessorRequest(message)) {
    return false;
  }

  const task = processingQueue.then(() => handleProcessorRequest(message));
  processingQueue = task.then(
    () => undefined,
    () => undefined,
  );
  void task.then(sendResponse, (error: unknown) => {
    sendResponse(errorResult('PROCESSING_FAILED', getSafeErrorMessage(error)));
  });
  return true;
});

/** Configures packaged WebAssembly assets without caching extension-scheme URLs. */
function configureLocalRuntime(): void {
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  env.useWasmCache = false;
  const wasm = env.backends.onnx.wasm;
  if (!wasm) {
    throw new Error('The local WebAssembly translation runtime is unavailable.');
  }
  wasm.proxy = false;
  wasm.numThreads = 1;
  wasm.wasmPaths = {
    mjs: new URL(ortMjsUrl, location.href).href,
    wasm: new URL(ortWasmUrl, location.href).href,
  };
}

async function handleProcessorRequest(message: ProcessorRequest): Promise<OperationResult> {
  const startedAt = performance.now();
  activeProgressSessionId = message.sessionId;

  try {
    if (message.type === 'PROCESS_PREPARE') {
      try {
        await prepareModels(message.sessionId);
      } catch {
        return errorResult(
          'MODEL_FAILED',
          'Model setup failed. Check your connection and free disk space, then retry in Croppa settings.',
        );
      }
      return { ok: true };
    }

    try {
      await prepareModels(message.sessionId);
    } catch {
      return errorResult(
        'MODEL_FAILED',
        'Local models could not load. Open Croppa settings and prepare them again.',
      );
    }

    if (message.type === 'PROCESS_TRANSLATION') {
      const sourceText = cleanRecognizedText(message.sourceText);
      if (!sourceText) {
        return errorResult('NO_TEXT', 'Enter Chinese text before translating.');
      }
      const translatedText = await translate(sourceText, message.sessionId);
      return {
        ok: true,
        sourceText,
        translatedText,
        durationMs: Math.round(performance.now() - startedAt),
      };
    }

    let image: HTMLCanvasElement;
    try {
      image = await cropCapture(message.captureDataUrl, message.rect, message.viewport);
      message.captureDataUrl = '';
    } catch {
      return errorResult(
        'CAPTURE_FAILED',
        'Croppa could not read the captured image. Try selecting the region again.',
      );
    }
    let sourceText: string;
    try {
      sourceText = await recognize(image, message.sessionId, message.rect);
    } finally {
      image.width = 0;
      image.height = 0;
    }
    if (!sourceText) {
      return errorResult(
        'NO_TEXT',
        'No readable Simplified Chinese text was found. Try a tighter or clearer selection.',
      );
    }

    const translatedText = await translate(sourceText, message.sessionId);
    return {
      ok: true,
      sourceText,
      translatedText,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    return errorResult('PROCESSING_FAILED', safeMessage);
  } finally {
    activeProgressSessionId = '';
    if (message.type === 'PROCESS_CAPTURE') message.captureDataUrl = '';
    if (message.type === 'PROCESS_TRANSLATION') message.sourceText = '';
  }
}

/** Initializes the packaged OCR runtime and cached translation pipeline in parallel. */
async function prepareModels(sessionId: string): Promise<void> {
  await Promise.all([getOcrWorker(sessionId), getTranslator(sessionId)]);
}

async function getOcrWorker(sessionId: string): Promise<Worker> {
  if (!ocrWorkerPromise) {
    sendProgress(sessionId, 'preparing-ocr', 0);
    ocrWorkerPromise = createWorker('chi_sim', OEM.LSTM_ONLY, {
      workerPath: chrome.runtime.getURL('tesseract/worker.min.js'),
      corePath: chrome.runtime.getURL('tesseract/core'),
      langPath: chrome.runtime.getURL('tesseract/lang'),
      gzip: true,
      workerBlobURL: false,
      logger: (message) => {
        if (message.status.includes('recognizing')) {
          sendProgress(activeProgressSessionId, 'recognizing', message.progress);
        } else {
          sendProgress(activeProgressSessionId, 'preparing-ocr', message.progress);
        }
      },
    }).catch((error) => {
      ocrWorkerPromise = undefined;
      throw error;
    });
  }

  return ocrWorkerPromise;
}

async function getTranslator(sessionId: string): Promise<any> {
  if (!translatorPromise) {
    sendProgress(sessionId, 'downloading', 0);
    translatorPromise = pipeline('translation', TRANSLATION_MODEL, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (progress: unknown) => {
        const normalized = downloadProgress(progress);
        sendProgress(activeProgressSessionId, 'downloading', normalized);
      },
    }).catch((error) => {
      translatorPromise = undefined;
      throw error;
    });
  }

  return translatorPromise;
}

/** Tries a second layout for uncertain OCR and keeps the most confident Chinese candidate. */
async function recognize(
  image: HTMLCanvasElement,
  sessionId: string,
  rect: SelectionRect,
): Promise<string> {
  sendProgress(sessionId, 'recognizing', 0);
  const worker = await getOcrWorker(sessionId);
  let best = { text: '', confidence: -1 };
  try {
    for (const mode of getOcrModes(rect)) {
      await worker.setParameters({
        tessedit_pageseg_mode: mode,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });
      const result = await worker.recognize(image);
      const text = cleanRecognizedText(result.data.text);
      if (!/[\u3400-\u9fff]/u.test(text)) continue;
      const confidence = Number.isFinite(result.data.confidence) ? result.data.confidence : 0;
      if (confidence > best.confidence) best = { text, confidence };
      if (confidence >= 85) break;
    }
    return best.text;
  } finally {
    // Tesseract retains its last image internally; release the worker after each capture.
    ocrWorkerPromise = undefined;
    await worker.terminate();
  }
}

async function translate(sourceText: string, sessionId: string): Promise<string> {
  sendProgress(sessionId, 'translating', 0);
  const translator = await getTranslator(sessionId);
  const output = await translator(sourceText, {
    max_new_tokens: 256,
  });
  const translatedText = extractTranslation(output);

  if (!translatedText) {
    throw new Error('The local translation model returned no English text.');
  }

  return translatedText;
}

/** Crops the screenshot into an OCR-only canvas; pixels never leave memory. */
async function cropCapture(
  captureDataUrl: string,
  rect: SelectionRect,
  viewport: ViewportSize,
): Promise<HTMLCanvasElement> {
  const blob = captureDataUrlToBlob(captureDataUrl);
  const bitmap = await createImageBitmap(blob);

  try {
    const crop = toBitmapCrop(rect, viewport, {
      width: bitmap.width,
      height: bitmap.height,
    });
    const upscale = Math.max(crop.width, crop.height) < 1200 ? 2 : 1;
    const padding = 12;
    const imageWidth = crop.width * upscale;
    const imageHeight = crop.height * upscale;
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth + padding * 2;
    canvas.height = imageHeight + padding * 2;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Croppa could not create an image-processing canvas.');
    }

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = 'grayscale(1) contrast(1.2)';
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      padding,
      padding,
      imageWidth,
      imageHeight,
    );
    const pixels = context.getImageData(padding, padding, imageWidth, imageHeight);
    if (normalizeOcrPolarity(pixels)) {
      context.putImageData(pixels, padding, padding);
    }
    return canvas;
  } finally {
    bitmap.close();
  }
}

function sendProgress(sessionId: string, stage: ProcessingStage, progress?: number): void {
  void chrome.runtime
    .sendMessage({
      target: 'background',
      type: 'PROCESSOR_PROGRESS',
      sessionId,
      stage,
      progress,
    })
    .catch(() => undefined);
}

function cleanRecognizedText(value: string): string {
  return value
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractTranslation(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return '';
  }
  const first = value[0] as { translation_text?: unknown };
  return typeof first.translation_text === 'string' ? first.translation_text.trim() : '';
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (/network|fetch|download/i.test(error.message)) {
      return 'Croppa could not download or load its local models. Check your connection and retry.';
    }
    return 'Local processing failed. Retry with a clearer region or enter the Chinese text using Edit source.';
  }
  return 'Croppa could not process this selection.';
}

function errorResult(code: ErrorResult['code'], error: string): ErrorResult {
  return { ok: false, code, error };
}
