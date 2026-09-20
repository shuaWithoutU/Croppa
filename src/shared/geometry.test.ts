import { describe, expect, it } from 'vitest';

import { isLikelyVertical, isValidSelection, normalizeRect, toBitmapCrop } from './geometry';

describe('normalizeRect', () => {
  it('normalizes a drag in either direction', () => {
    expect(normalizeRect({ x: 80, y: 70 }, { x: 20, y: 10 })).toEqual({
      x: 20,
      y: 10,
      width: 60,
      height: 60,
    });
  });
});

describe('selection validation', () => {
  it('rejects tiny captures and accepts useful regions', () => {
    expect(isValidSelection({ x: 0, y: 0, width: 11, height: 100 })).toBe(false);
    expect(isValidSelection({ x: 0, y: 0, width: 12, height: 12 })).toBe(true);
  });
});

describe('toBitmapCrop', () => {
  it('maps CSS viewport coordinates to screenshot pixels', () => {
    expect(
      toBitmapCrop(
        { x: 100, y: 50, width: 200, height: 100 },
        { width: 1000, height: 500 },
        { width: 2000, height: 1000 },
      ),
    ).toEqual({ x: 200, y: 100, width: 400, height: 200 });
  });

  it('clamps a crop to the screenshot bounds', () => {
    expect(
      toBitmapCrop(
        { x: 90, y: 90, width: 30, height: 30 },
        { width: 100, height: 100 },
        { width: 200, height: 200 },
      ),
    ).toEqual({ x: 180, y: 180, width: 20, height: 20 });
  });

  it('rejects invalid viewport dimensions', () => {
    expect(() =>
      toBitmapCrop(
        { x: 0, y: 0, width: 10, height: 10 },
        { width: 0, height: 100 },
        { width: 100, height: 100 },
      ),
    ).toThrow('invalid dimensions');
  });
});

describe('isLikelyVertical', () => {
  it('uses a conservative aspect-ratio heuristic', () => {
    expect(isLikelyVertical({ x: 0, y: 0, width: 100, height: 140 })).toBe(true);
    expect(isLikelyVertical({ x: 0, y: 0, width: 100, height: 130 })).toBe(false);
  });
});
