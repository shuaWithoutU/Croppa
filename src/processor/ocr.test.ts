import { PSM } from 'tesseract.js';
import { describe, expect, it } from 'vitest';

import { getOcrModes, normalizeOcrPolarity } from './ocr';

describe('OCR segmentation', () => {
  it('tries single-line recognition first for a short horizontal selection', () => {
    expect(getOcrModes({ x: 0, y: 0, width: 300, height: 90 })).toEqual([
      PSM.SINGLE_LINE,
      PSM.SINGLE_BLOCK,
    ]);
  });

  it('keeps block recognition first for less-wide and vertical selections', () => {
    expect(getOcrModes({ x: 0, y: 0, width: 180, height: 100 })).toEqual([
      PSM.SINGLE_BLOCK,
      PSM.SINGLE_LINE,
    ]);
    expect(getOcrModes({ x: 0, y: 0, width: 90, height: 180 })).toEqual([
      PSM.SINGLE_BLOCK_VERT_TEXT,
      PSM.SINGLE_BLOCK,
    ]);
  });
});

describe('OCR polarity', () => {
  it('inverts light text on a dark background without changing alpha', () => {
    const image = {
      width: 3,
      height: 3,
      data: new Uint8ClampedArray(3 * 3 * 4),
    };
    for (let offset = 0; offset < image.data.length; offset += 4) {
      image.data.set([40, 40, 40, 255], offset);
    }
    image.data.set([230, 230, 230, 255], 4 * 4);

    expect(normalizeOcrPolarity(image)).toBe(true);
    expect(Array.from(image.data.slice(0, 4))).toEqual([215, 215, 215, 255]);
    expect(Array.from(image.data.slice(16, 20))).toEqual([25, 25, 25, 255]);
  });

  it('leaves dark text on a light background unchanged', () => {
    const image = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        245, 245, 245, 255, 245, 245, 245, 255, 245, 245, 245, 255, 25, 25, 25, 255,
      ]),
    };

    expect(normalizeOcrPolarity(image)).toBe(false);
    expect(Array.from(image.data.slice(0, 4))).toEqual([245, 245, 245, 255]);
  });
});
