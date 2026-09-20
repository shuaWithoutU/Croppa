import { env, pipeline } from '@huggingface/transformers';
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js';

import ortMjsUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url';

import {
  isLikelyVertical,
  toBitmapCrop,
  type SelectionRect,
  type ViewportSize,
} from '../shared/geometry';
import {
  isProcessorRequest,
  type ErrorResult,
  type OperationResult,
  type ProcessingStage,
  type ProcessorRequest,
} from '../shared/messages';
import { MODEL_VERSION, STORAGE_KEYS } from '../shared/storage';

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
  void task.then(sendResponse);
  return true;
});

function configureLocalRuntime(): void {
  env.allowLocalModels = false;
  env.useBrowserCache = true;
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
      await prepareModels(message.sessionId);
      return { ok: true };
    }

    await prepareModels(message.sessionId);

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

    const image = await cropCapture(message.captureDataUrl, message.rect, message.viewport);
    const sourceText = await recognize(image, message.sessionId, isLikelyVertical(message.rect));
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
    await chrome.storage.local.set({
      [STORAGE_KEYS.modelReady]: false,
      [STORAGE_KEYS.lastModelError]: safeMessage,
    });
    return errorResult('PROCESSING_FAILED', safeMessage);
  }
}

async function prepareModels(sessionId: string): Promise<void> {
  await Promise.all([getOcrWorker(sessionId), getTranslator(sessionId)]);
  await chrome.storage.local.set({
    [STORAGE_KEYS.modelReady]: true,
    [STORAGE_KEYS.modelVersion]: MODEL_VERSION,
    [STORAGE_KEYS.lastModelError]: '',
  });
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
    sendProgress(sessionId, 'translating', 0);
    translatorPromise = pipeline('translation', TRANSLATION_MODEL, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (progress: unknown) => {
        const normalized = extractProgress(progress);
        sendProgress(activeProgressSessionId, 'translating', normalized);
      },
    }).catch((error) => {
      translatorPromise = undefined;
      throw error;
    });
  }

  return translatorPromise;
}

async function recognize(
  image: HTMLCanvasElement,
  sessionId: string,
  vertical: boolean,
): Promise<string> {
  sendProgress(sessionId, 'recognizing', 0);
  const worker = await getOcrWorker(sessionId);
  await worker.setParameters({
    tessedit_pageseg_mode: vertical ? PSM.SINGLE_BLOCK_VERT_TEXT : PSM.AUTO,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  });
  const result = await worker.recognize(image);
  return cleanRecognizedText(result.data.text);
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

async function cropCapture(
  captureDataUrl: string,
  rect: SelectionRect,
  viewport: ViewportSize,
): Promise<HTMLCanvasElement> {
  const blob = await (await fetch(captureDataUrl)).blob();
  const bitmap = await createImageBitmap(blob);

  try {
    const crop = toBitmapCrop(rect, viewport, {
      width: bitmap.width,
      height: bitmap.height,
    });
    const upscale = Math.max(crop.width, crop.height) < 1200 ? 2 : 1;
    const canvas = document.createElement('canvas');
    canvas.width = crop.width * upscale;
    canvas.height = crop.height * upscale;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Croppa could not create an image-processing canvas.');
    }

    context.filter = 'grayscale(1) contrast(1.2)';
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return canvas;
  } finally {
    bitmap.close();
  }
}

function sendProgress(sessionId: string, stage: ProcessingStage, progress?: number): void {
  void chrome.runtime.sendMessage({
    target: 'background',
    type: 'PROCESSOR_PROGRESS',
    sessionId,
    stage,
    progress,
  });
}

function cleanRecognizedText(value: string): string {
  return value
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractProgress(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null || !('progress' in value)) {
    return undefined;
  }
  const progress = (value as { progress?: unknown }).progress;
  return typeof progress === 'number' ? Math.min(1, Math.max(0, progress)) : undefined;
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
    return error.message;
  }
  return 'Croppa could not process this selection.';
}

function errorResult(code: ErrorResult['code'], error: string): ErrorResult {
  return { ok: false, code, error };
}
