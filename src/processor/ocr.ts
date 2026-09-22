import { PSM } from 'tesseract.js';

import { isLikelyVertical, type SelectionRect } from '../shared/geometry';

/** Chooses a focused segmentation mode, then a broader fallback if OCR finds no text. */
export function getOcrModes(rect: SelectionRect): PSM[] {
  if (isLikelyVertical(rect)) {
    return [PSM.SINGLE_BLOCK_VERT_TEXT, PSM.SINGLE_BLOCK];
  }

  return rect.width >= rect.height * 2.25
    ? [PSM.SINGLE_LINE, PSM.SINGLE_BLOCK]
    : [PSM.SINGLE_BLOCK, PSM.SINGLE_LINE];
}

/** Converts light-on-dark captures to dark-on-light while preserving their alpha channel. */
export function normalizeOcrPolarity(image: Pick<ImageData, 'data' | 'width' | 'height'>): boolean {
  const { data, width, height } = image;
  if (width < 1 || height < 1) return false;

  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  const darkCorners = corners.filter((pixel) => {
    const offset = pixel * 4;
    const brightness =
      data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    return brightness < 128;
  }).length;

  if (darkCorners < 3) return false;

  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 255 - data[offset];
    data[offset + 1] = 255 - data[offset + 1];
    data[offset + 2] = 255 - data[offset + 2];
  }
  return true;
}
