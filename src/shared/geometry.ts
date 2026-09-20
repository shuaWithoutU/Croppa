export interface Point {
  x: number;
  y: number;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface BitmapCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_SELECTION_SIZE = 12;

export function normalizeRect(start: Point, end: Point): SelectionRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function isValidSelection(rect: SelectionRect): boolean {
  return rect.width >= MIN_SELECTION_SIZE && rect.height >= MIN_SELECTION_SIZE;
}

export function toBitmapCrop(
  rect: SelectionRect,
  viewport: ViewportSize,
  bitmap: ViewportSize,
): BitmapCrop {
  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new Error('The browser viewport has invalid dimensions.');
  }

  const scaleX = bitmap.width / viewport.width;
  const scaleY = bitmap.height / viewport.height;
  const x = Math.max(0, Math.floor(rect.x * scaleX));
  const y = Math.max(0, Math.floor(rect.y * scaleY));
  const width = Math.min(bitmap.width - x, Math.max(1, Math.round(rect.width * scaleX)));
  const height = Math.min(bitmap.height - y, Math.max(1, Math.round(rect.height * scaleY)));

  return { x, y, width, height };
}

export function isLikelyVertical(rect: SelectionRect): boolean {
  return rect.height > rect.width * 1.35;
}
