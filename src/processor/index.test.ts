import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  pipeline: vi.fn().mockResolvedValue(vi.fn()),
}));

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({}),
  OEM: { LSTM_ONLY: 1 },
  PSM: { AUTO: 3, SINGLE_BLOCK_VERT_TEXT: 5 },
}));

describe('offscreen processor messaging', () => {
  beforeEach(() => {
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
