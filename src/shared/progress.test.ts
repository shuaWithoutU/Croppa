import { describe, expect, it } from 'vitest';
import { downloadProgress } from './progress';
import { isBackgroundRequest, isContentMessage } from './messages';

describe('progress and request boundaries', () => {
  it('converts asset download percentages without prematurely showing 100%', () => {
    expect(downloadProgress({ progress: 37 })).toBe(0.37);
    expect(downloadProgress({ progress: 100 })).toBe(1);
    expect(downloadProgress({ status: 'ready' })).toBeUndefined();
    expect(downloadProgress({ progress: NaN })).toBeUndefined();
  });
  it('rejects invalid progress, offscreen selections and oversized text', () => {
    expect(
      isContentMessage({
        target: 'content',
        type: 'PROCESS_PROGRESS',
        sessionId: 'one',
        stage: 'recognizing',
        progress: Infinity,
      }),
    ).toBe(false);
    expect(
      isBackgroundRequest({
        target: 'background',
        type: 'CAPTURE_REGION',
        sessionId: 'one',
        rect: { x: 100, y: 0, width: 200, height: 80 },
        viewport: { width: 200, height: 100 },
      }),
    ).toBe(false);
    expect(
      isBackgroundRequest({
        target: 'background',
        type: 'TRANSLATE_TEXT',
        sessionId: 'one',
        sourceText: 'a'.repeat(2001),
      }),
    ).toBe(false);
    expect(
      isBackgroundRequest({ target: 'background', type: 'CANCEL_SESSION', sessionId: 'one' }),
    ).toBe(true);
  });
});
