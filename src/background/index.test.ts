import { beforeEach, describe, expect, it, vi } from 'vitest';

let receive: (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  respond: (value: any) => void,
) => boolean;
const sendMessage = vi.fn();
const set = vi.fn().mockResolvedValue(undefined);
const closeDocument = vi.fn().mockResolvedValue(undefined);
const captureVisibleTab = vi.fn().mockResolvedValue('data:image/png;base64,AQ==');
const query = vi.fn();
const extensionUrl = (path: string) => `chrome-extension://croppa/${path}`;
const page = { tab: { id: 1, windowId: 1 }, frameId: 0 } as chrome.runtime.MessageSender;
const options = { url: extensionUrl('options.html') };
const request = {
  target: 'background',
  type: 'CAPTURE_REGION',
  sessionId: 'capture',
  rect: { x: 0, y: 0, width: 200, height: 100 },
  viewport: { width: 1000, height: 800 },
};

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  query.mockResolvedValue([{ id: 1 }]);
  sendMessage.mockResolvedValue({ ok: true });
  closeDocument.mockResolvedValue(undefined);
  vi.stubGlobal('chrome', {
    runtime: {
      getURL: extensionUrl,
      onMessage: {
        addListener: (listener: typeof receive) => {
          receive = listener;
        },
      },
      onInstalled: { addListener: vi.fn() },
      getContexts: vi.fn().mockResolvedValue([{}]),
      ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
      getPlatformInfo: vi.fn().mockResolvedValue({}),
      sendMessage,
    },
    tabs: {
      query,
      captureVisibleTab,
      sendMessage: vi.fn().mockResolvedValue(undefined),
      onRemoved: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
    },
    action: { onClicked: { addListener: vi.fn() } },
    storage: { local: { set, get: vi.fn().mockResolvedValue({}) } },
    offscreen: { closeDocument },
  });
  await import('./index');
});

function dispatch(message: unknown, sender = page): Promise<any> {
  return new Promise((resolve) => {
    receive(message, sender, resolve);
  });
}

describe('background coordination', () => {
  it('refuses to capture a different active tab', async () => {
    query.mockResolvedValue([{ id: 2 }]);
    expect(await dispatch(request)).toMatchObject({ ok: false, code: 'CAPTURE_FAILED' });
    expect(captureVisibleTab).not.toHaveBeenCalled();
  });

  it('does not retain captures or texts in extension storage', async () => {
    await dispatch(request);
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'PROCESS_CAPTURE' }));
    expect(set).not.toHaveBeenCalled();
  });

  it('rejects competing work and only lets the owning tab cancel', async () => {
    let finish!: (result: unknown) => void;
    sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = dispatch(request);
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalled());
    expect(await dispatch({ ...request, sessionId: 'second' })).toMatchObject({ code: 'BUSY' });
    await dispatch({ target: 'background', type: 'CANCEL_SESSION', sessionId: 'capture' }, {
      tab: { id: 2 },
    } as chrome.runtime.MessageSender);
    expect(closeDocument).not.toHaveBeenCalled();
    await dispatch({ target: 'background', type: 'CANCEL_SESSION', sessionId: 'capture' });
    expect(closeDocument).toHaveBeenCalledOnce();
    finish({ ok: true });
    expect(await pending).toMatchObject({ code: 'CANCELLED' });
    expect(set).not.toHaveBeenCalled();
  });

  it('cancels setup without storing a false success or an error from the closed channel', async () => {
    let reject!: (error: Error) => void;
    sendMessage.mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const pending = dispatch(
      { target: 'background', type: 'PREPARE_MODELS', sessionId: 'setup' },
      options,
    );
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalled());
    await dispatch({ target: 'background', type: 'CANCEL_SESSION', sessionId: 'setup' }, options);
    reject(new Error('message channel closed'));
    expect(await pending).toMatchObject({ code: 'CANCELLED' });
    expect(set).not.toHaveBeenCalled();
  });

  it('does not allow a web content script to start model setup', async () => {
    expect(
      await dispatch({ target: 'background', type: 'PREPARE_MODELS', sessionId: 'setup' }),
    ).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
