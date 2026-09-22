/** Transformers reports download percentages on a 0–100 scale, unlike Tesseract's 0–1. */
export function downloadProgress(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null || !('progress' in value)) return undefined;
  const progress = value.progress;
  return typeof progress === 'number' && Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress / 100))
    : undefined;
}
