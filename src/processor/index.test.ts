import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorker } from 'tesseract.js';

const runtime = vi.hoisted(() => ({
  listener: undefined as
    | ((
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response: unknown) => void,
      ) => boolean | undefined)
    | undefined,
  sendMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@huggingface/transformers', () => ({
  env: {
    allowLocalModels: true,
    useBrowserCache: false,
    useWasmCache: true,
    backends: { onnx: { wasm: {} } },
  },
  pipeline: vi.fn().mockResolvedValue(vi.fn().mockResolvedValue([{ translation_text: 'Test' }])),
}));

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({}),
  OEM: { LSTM_ONLY: 1 },
  PSM: { AUTO: 3, SINGLE_BLOCK_VERT_TEXT: 5, SINGLE_BLOCK: 6, SINGLE_LINE: 7 },
}));

describe('offscreen processor messaging', () => {
  beforeEach(() => {
    vi.resetModules();
    runtime.listener = undefined;
    runtime.sendMessage.mockClear();
    vi.stubGlobal('location', { href: 'chrome-extension://croppa/processor.html' });
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: (path: string) => `chrome-extension://croppa/${path}`,
        onMessage: {
          addListener: (listener: typeof runtime.listener) => {
            runtime.listener = listener;
          },
        },
        sendMessage: runtime.sendMessage,
      },
    });
  });

  it('retries uncertain OCR, chooses the stronger Chinese candidate, and releases pixels', async () => {
    const worker = {
      setParameters: vi.fn().mockResolvedValue(undefined),
      recognize: vi
        .fn()
        .mockResolvedValueOnce({ data: { text: '错', confidence: 40 } })
        .mockResolvedValueOnce({ data: { text: '测试', confidence: 92 } }),
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(createWorker).mockResolvedValueOnce(
      worker as unknown as Awaited<ReturnType<typeof createWorker>>,
    );
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: () => ({
          width: 1,
          height: 1,
          data: new Uint8ClampedArray([255, 255, 255, 255]),
        }),
        putImageData: vi.fn(),
      }),
    };
    vi.stubGlobal('document', { createElement: () => canvas });
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 640, height: 480, close }),
    );
    await import('./index');
    const message = {
      target: 'processor',
      type: 'PROCESS_CAPTURE',
      sessionId: 'ocr',
      captureDataUrl: 'data:image/png;base64,AQ==',
      rect: { x: 0, y: 0, width: 200, height: 60 },
      viewport: { width: 640, height: 480 },
    };
    const response = await new Promise((resolve) => runtime.listener?.(message, {}, resolve));
    expect(response).toMatchObject({ ok: true, sourceText: '测试', translatedText: 'Test' });
    expect(worker.recognize).toHaveBeenCalledTimes(2);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(message.captureDataUrl).toBe('');
  });

  it('prepares models without requiring the unavailable storage API', async () => {
    await import('./index');

    const response = new Promise<unknown>((resolve) => {
      const keepsChannelOpen = runtime.listener?.(
        {
          target: 'processor',
          type: 'PROCESS_PREPARE',
          sessionId: 'prepare-session',
        },
        {},
        resolve,
      );
      expect(keepsChannelOpen).toBe(true);
    });

    await expect(response).resolves.toEqual({ ok: true });
    expect('storage' in chrome).toBe(false);
  });
});
