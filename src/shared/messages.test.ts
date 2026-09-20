import { describe, expect, it } from 'vitest';

import { isBackgroundRequest, isContentMessage, isProcessorRequest } from './messages';

describe('message validation', () => {
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
