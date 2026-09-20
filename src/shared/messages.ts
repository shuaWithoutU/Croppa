import type { SelectionRect, ViewportSize } from './geometry';

export type ProcessingStage = 'capturing' | 'preparing-ocr' | 'recognizing' | 'translating';

export interface StartSelectionMessage {
  target: 'content';
  type: 'START_SELECTION';
}

export interface ProgressMessage {
  target: 'content';
  type: 'PROCESS_PROGRESS';
  sessionId: string;
  stage: ProcessingStage;
  progress?: number;
}

export interface CaptureRegionRequest {
  target: 'background';
  type: 'CAPTURE_REGION';
  sessionId: string;
  rect: SelectionRect;
  viewport: ViewportSize;
}

export interface TranslateTextRequest {
  target: 'background';
  type: 'TRANSLATE_TEXT';
  sessionId: string;
  sourceText: string;
}

export interface PrepareModelsRequest {
  target: 'background';
  type: 'PREPARE_MODELS';
  sessionId: string;
}

export interface GetStatusRequest {
  target: 'background';
  type: 'GET_STATUS';
}

export interface ProcessCaptureRequest {
  target: 'processor';
  type: 'PROCESS_CAPTURE';
  sessionId: string;
  captureDataUrl: string;
  rect: SelectionRect;
  viewport: ViewportSize;
}

export interface ProcessorTranslateRequest {
  target: 'processor';
  type: 'PROCESS_TRANSLATION';
  sessionId: string;
  sourceText: string;
}

export interface ProcessorPrepareRequest {
  target: 'processor';
  type: 'PROCESS_PREPARE';
  sessionId: string;
}

export interface ProcessorProgressMessage {
  target: 'background';
  type: 'PROCESSOR_PROGRESS';
  sessionId: string;
  stage: ProcessingStage;
  progress?: number;
}

export interface ProcessResult {
  ok: true;
  sourceText: string;
  translatedText: string;
  durationMs: number;
}

export interface PrepareResult {
  ok: true;
}

export interface StatusResult {
  ok: true;
  modelsReady: boolean;
  lastError?: string;
}

export interface ErrorResult {
  ok: false;
  error: string;
  code:
    | 'CAPTURE_FAILED'
    | 'INVALID_REQUEST'
    | 'MODEL_FAILED'
    | 'NO_TEXT'
    | 'PROCESSING_FAILED'
    | 'RESTRICTED_PAGE'
    | 'TRANSLATION_FAILED';
}

export type OperationResult = ProcessResult | PrepareResult | ErrorResult;

export type BackgroundRequest =
  | CaptureRegionRequest
  | TranslateTextRequest
  | PrepareModelsRequest
  | GetStatusRequest
  | ProcessorProgressMessage;

export type ProcessorRequest =
  ProcessCaptureRequest | ProcessorTranslateRequest | ProcessorPrepareRequest;

export type ContentMessage = StartSelectionMessage | ProgressMessage;

export function isBackgroundRequest(value: unknown): value is BackgroundRequest {
  if (!isRecord(value) || value.target !== 'background' || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'CAPTURE_REGION':
      return (
        isNonEmptyString(value.sessionId) &&
        isSelectionRect(value.rect) &&
        isViewportSize(value.viewport)
      );
    case 'TRANSLATE_TEXT':
      return isNonEmptyString(value.sessionId) && typeof value.sourceText === 'string';
    case 'PREPARE_MODELS':
      return isNonEmptyString(value.sessionId);
    case 'GET_STATUS':
      return true;
    case 'PROCESSOR_PROGRESS':
      return (
        isNonEmptyString(value.sessionId) &&
        isProcessingStage(value.stage) &&
        (value.progress === undefined || typeof value.progress === 'number')
      );
    default:
      return false;
  }
}

export function isProcessorRequest(value: unknown): value is ProcessorRequest {
  if (!isRecord(value) || value.target !== 'processor' || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'PROCESS_CAPTURE':
      return (
        isNonEmptyString(value.sessionId) &&
        isDataImage(value.captureDataUrl) &&
        isSelectionRect(value.rect) &&
        isViewportSize(value.viewport)
      );
    case 'PROCESS_TRANSLATION':
      return isNonEmptyString(value.sessionId) && typeof value.sourceText === 'string';
    case 'PROCESS_PREPARE':
      return isNonEmptyString(value.sessionId);
    default:
      return false;
  }
}

export function isContentMessage(value: unknown): value is ContentMessage {
  if (!isRecord(value) || value.target !== 'content' || typeof value.type !== 'string') {
    return false;
  }

  if (value.type === 'START_SELECTION') {
    return true;
  }

  return (
    value.type === 'PROCESS_PROGRESS' &&
    isNonEmptyString(value.sessionId) &&
    isProcessingStage(value.stage) &&
    (value.progress === undefined || typeof value.progress === 'number')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isSelectionRect(value: unknown): value is SelectionRect {
  return (
    isRecord(value) &&
    isFiniteNonNegativeNumber(value.x) &&
    isFiniteNonNegativeNumber(value.y) &&
    isFiniteNonNegativeNumber(value.width) &&
    isFiniteNonNegativeNumber(value.height)
  );
}

function isViewportSize(value: unknown): value is ViewportSize {
  return (
    isRecord(value) &&
    isFiniteNonNegativeNumber(value.width) &&
    value.width > 0 &&
    isFiniteNonNegativeNumber(value.height) &&
    value.height > 0
  );
}

function isProcessingStage(value: unknown): value is ProcessingStage {
  return (
    typeof value === 'string' &&
    ['capturing', 'preparing-ocr', 'recognizing', 'translating'].includes(value)
  );
}

function isDataImage(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/');
}
