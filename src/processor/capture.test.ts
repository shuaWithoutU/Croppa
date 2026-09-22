import { describe, expect, it, vi } from 'vitest';

import { captureDataUrlToBlob } from './capture';

describe('capture data URL decoding', () => {
  it('converts captured PNG bytes to a local blob without a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    try {
      const blob = captureDataUrlToBlob('data:image/png;base64,iVBORw0KGgo=');

      expect(blob.type).toBe('image/png');
      expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('rejects non-PNG and invalid captures', () => {
    expect(() => captureDataUrlToBlob('data:text/plain;base64,SGVsbG8=')).toThrow(
      'The capture is not a PNG data URL.',
    );
    expect(() => captureDataUrlToBlob('data:image/png;base64,not valid!')).toThrow(
      'The captured PNG could not be decoded.',
    );
    expect(() => captureDataUrlToBlob('data:image/png;base64,')).toThrow(
      'The captured PNG could not be decoded.',
    );
  });
});
