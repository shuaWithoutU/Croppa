// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let receive: (message: unknown) => void;
let root: ShadowRoot;
let resolveCapture: (result: unknown) => void;
const sendMessage = vi.fn();

/** Exercises the real content entry point with browser APIs replaced, never using real captures. */
beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = '<button id="page-button">Page control</button>';
  const attach = Element.prototype.attachShadow;
  vi.spyOn(Element.prototype, 'attachShadow').mockImplementation(function (this: Element, init) {
    root = attach.call(this, init);
    return root;
  });
  HTMLElement.prototype.setPointerCapture = vi.fn();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  sendMessage.mockReset().mockImplementation((message) =>
    message.type === 'CAPTURE_REGION'
      ? new Promise((resolve) => {
          resolveCapture = resolve;
        })
      : Promise.resolve({ ok: true }),
  );
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage,
      onMessage: {
        addListener: (listener: typeof receive) => {
          receive = listener;
        },
      },
    },
  });
  await import('./index');
});

afterEach(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function selectRegion() {
  receive({ target: 'content', type: 'START_SELECTION' });
  const layer = root.querySelector('.croppa-selection-layer')!;
  layer.dispatchEvent(new MouseEvent('pointerdown', { clientX: 20, clientY: 20, button: 0 }));
  layer.dispatchEvent(new MouseEvent('pointerup', { clientX: 320, clientY: 120, button: 0 }));
  await vi.waitFor(() =>
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'CAPTURE_REGION' })),
  );
}

function button(label: string) {
  return Array.from(root.querySelectorAll('button')).find((item) => item.textContent === label)!;
}

const result = { ok: true, sourceText: '测试', translatedText: 'Test', durationMs: 100 };

describe('capture and result interactions', () => {
  it('clears prior source and translation after a failed correction request', async () => {
    await selectRegion();
    resolveCapture(result);
    await vi.waitFor(() => expect(button('Edit source')).toBeDefined());
    button('Edit source').click();
    sendMessage.mockRejectedValueOnce(new Error('processor disconnected'));
    button('Translate').click();
    await vi.waitFor(() => expect(root.textContent).toContain('could not translate'));
    button('Edit source').click();
    expect(root.querySelector('textarea')!.value).toBe('');
  });
  it('hides the overlay before capture and before Retry, then reveals processing after capture', async () => {
    await selectRegion();
    const host = document.getElementById('croppa-extension-root')!;
    expect(host.style.visibility).toBe('hidden');
    const request = sendMessage.mock.calls[0][0];
    receive({
      target: 'content',
      type: 'PROCESS_PROGRESS',
      sessionId: request.sessionId,
      stage: 'recognizing',
    });
    expect(host.style.visibility).toBe('visible');
    resolveCapture(result);
    await vi.waitFor(() => expect(button('Retry')).toBeDefined());
    button('Retry').click();
    expect(host.style.visibility).toBe('hidden');
  });

  it('cancels processing and ignores a result arriving after Close', async () => {
    await selectRegion();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'CANCEL_SESSION' }));
    resolveCapture(result);
    await Promise.resolve();
    expect(document.getElementById('croppa-extension-root')).toBeNull();
  });

  it('allows manual Chinese entry after empty OCR and disables empty submission', async () => {
    await selectRegion();
    resolveCapture({ ok: false, code: 'NO_TEXT', error: 'No text found.' });
    await vi.waitFor(() => expect(button('Edit source')).toBeDefined());
    button('Edit source').click();
    expect(button('Translate').disabled).toBe(true);
    const input = root.querySelector('textarea')!;
    input.value = '测试';
    input.dispatchEvent(new Event('input'));
    expect(button('Translate').disabled).toBe(false);
    button('Translate').click();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TRANSLATE_TEXT', sourceText: '测试' }),
    );
  });

  it('keeps the card during internal scrolling and closes it on page scrolling', async () => {
    await selectRegion();
    resolveCapture(result);
    await vi.waitFor(() => expect(button('Copy')).toBeDefined());
    root
      .querySelector('.croppa-card')!
      .dispatchEvent(new Event('scroll', { bubbles: true, composed: true }));
    expect(document.getElementById('croppa-extension-root')).not.toBeNull();
    window.dispatchEvent(new Event('scroll'));
    expect(document.getElementById('croppa-extension-root')).toBeNull();
  });

  it('reports failed clipboard writes without claiming success', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    document.execCommand = vi.fn().mockReturnValue(false);
    await selectRegion();
    resolveCapture(result);
    await vi.waitFor(() => expect(button('Copy')).toBeDefined());
    button('Copy').click();
    await vi.waitFor(() => expect(button('Copy failed — select text')).toBeDefined());
    expect(document.querySelector('textarea')).toBeNull();
  });
});
