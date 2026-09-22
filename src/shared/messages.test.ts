import { describe, expect, it } from 'vitest';

import { isBackgroundRequest, isContentMessage, isProcessorRequest } from './messages';

describe('message validation', () => {
  it('validates optional layout choices in both capture message boundaries', () => {
    const capture = {
      sessionId: 'one',
      rect: { x: 0, y: 0, width: 200, height: 100 },
      viewport: { width: 800, height: 600 },
    };
    for (const layout of [
      undefined,
      'auto',
      'horizontal-line',
      'horizontal-block',
      'vertical',
      'invalid',
      null,
      3,
    ]) {
      const expected =
        layout === undefined ||
        ['auto', 'horizontal-line', 'horizontal-block', 'vertical'].includes(layout as string);
      expect(
        isBackgroundRequest({ ...capture, target: 'background', type: 'CAPTURE_REGION', layout }),
      ).toBe(expected);
      expect(
        isProcessorRequest({
          ...capture,
          target: 'processor',
          type: 'PROCESS_CAPTURE',
          captureDataUrl: 'data:image/png;base64,AQ==',
          layout,
        }),
      ).toBe(expected);
    }
  });
  it('accepts a complete capture request', () => {
    expect(
      isBackgroundRequest({
        target: 'background',
        type: 'CAPTURE_REGION',
        sessionId: 'session-1',
        rect: { x: 1, y: 2, width: 100, height: 80 },
        viewport: { width: 1200, height: 800 },
      }),
    ).toBe(true);
  });

  it('rejects malformed capture coordinates', () => {
    expect(
      isBackgroundRequest({
        target: 'background',
        type: 'CAPTURE_REGION',
        sessionId: 'session-1',
        rect: { x: -1, y: 2, width: '100', height: 80 },
        viewport: { width: 1200, height: 800 },
      }),
    ).toBe(false);
  });

  it('rejects processor messages that are not image data URLs', () => {
    expect(
      isProcessorRequest({
        target: 'processor',
        type: 'PROCESS_CAPTURE',
        sessionId: 'session-1',
        captureDataUrl: 'https://example.com/private.png',
        rect: { x: 1, y: 2, width: 100, height: 80 },
        viewport: { width: 1200, height: 800 },
      }),
    ).toBe(false);
  });

  it('validates progress messages', () => {
    expect(
      isContentMessage({
        target: 'content',
        type: 'PROCESS_PROGRESS',
        sessionId: 'session-1',
        stage: 'recognizing',
        progress: 0.5,
      }),
    ).toBe(true);
    expect(
      isContentMessage({
        target: 'content',
        type: 'PROCESS_PROGRESS',
        sessionId: '',
        stage: 'unknown',
      }),
    ).toBe(false);
  });
});
