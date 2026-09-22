/** Decodes a browser-captured PNG in memory without a CSP-controlled fetch. */
export function captureDataUrlToBlob(dataUrl: string): Blob {
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) {
    throw new Error('The capture is not a PNG data URL.');
  }

  try {
    const binary = atob(dataUrl.slice(prefix.length));
    if (!binary) {
      throw new Error('The capture is empty.');
    }
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new Blob([bytes], { type: 'image/png' });
  } catch {
    throw new Error('The captured PNG could not be decoded.');
  }
}
