import {
  isValidSelection,
  normalizeRect,
  type Point,
  type SelectionRect,
} from '../shared/geometry';
import {
  isContentMessage,
  type OperationResult,
  type ProcessingStage,
  type ProcessResult,
} from '../shared/messages';

const HOST_ID = 'croppa-extension-root';

interface ActiveSession {
  id: string;
  rect: SelectionRect;
  sourceText?: string;
  translatedText?: string;
}

let host: HTMLDivElement | undefined;
let shadow: ShadowRoot | undefined;
let session: ActiveSession | undefined;
let dragStart: Point | undefined;

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isContentMessage(message)) {
    return false;
  }

  if (message.type === 'START_SELECTION') {
    beginSelection();
  } else if (session?.id === message.sessionId) {
    renderProcessing(message.stage, message.progress);
  }

  return false;
});

function beginSelection(): void {
  cleanup();
  session = undefined;
  host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647;';
  shadow = host.attachShadow({ mode: 'closed' });
  shadow.append(createStyles(), createSelectionLayer());
  document.documentElement.append(host);

  window.addEventListener('keydown', handleKeydown, true);
}

function createSelectionLayer(): HTMLElement {
  const layer = document.createElement('div');
  layer.className = 'croppa-selection-layer';
  layer.setAttribute('role', 'application');
  layer.setAttribute('aria-label', 'Select a Chinese text region. Press Escape to cancel.');

  const instruction = document.createElement('div');
  instruction.className = 'croppa-instruction';
  instruction.textContent = 'Drag around one Chinese text region · Esc to cancel';
  layer.append(instruction);

  const selectionBox = document.createElement('div');
  selectionBox.className = 'croppa-selection-box';
  selectionBox.hidden = true;
  layer.append(selectionBox);

  layer.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragStart = { x: event.clientX, y: event.clientY };
    selectionBox.hidden = false;
    updateSelectionBox(selectionBox, normalizeRect(dragStart, dragStart));
    layer.setPointerCapture(event.pointerId);
  });

  layer.addEventListener('pointermove', (event) => {
    if (!dragStart) return;
    updateSelectionBox(
      selectionBox,
      normalizeRect(dragStart, { x: event.clientX, y: event.clientY }),
    );
  });

  layer.addEventListener('pointerup', (event) => {
    if (!dragStart) return;
    const rect = normalizeRect(dragStart, { x: event.clientX, y: event.clientY });
    dragStart = undefined;

    if (!isValidSelection(rect)) {
      selectionBox.hidden = true;
      instruction.textContent = 'Select a slightly larger region · Esc to cancel';
      return;
    }

    const activeSession: ActiveSession = {
      id: crypto.randomUUID(),
      rect,
    };
    session = activeSession;
    layer.remove();
    renderProcessing('capturing');
    addViewportCleanupListeners();
    void requestCapture(activeSession);
  });

  return layer;
}

async function requestCapture(activeSession: ActiveSession): Promise<void> {
  try {
    const result = (await chrome.runtime.sendMessage({
      target: 'background',
      type: 'CAPTURE_REGION',
      sessionId: activeSession.id,
      rect: activeSession.rect,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    })) as OperationResult;
    handleOperationResult(activeSession.id, result);
  } catch {
    renderError('Croppa could not capture this page. Reload it and try again.');
  }
}

async function requestTranslation(sourceText: string): Promise<void> {
  if (!session) return;
  const sessionId = session.id;
  renderProcessing('translating');

  try {
    const result = (await chrome.runtime.sendMessage({
      target: 'background',
      type: 'TRANSLATE_TEXT',
      sessionId,
      sourceText,
    })) as OperationResult;
    handleOperationResult(sessionId, result);
  } catch {
    renderError('Croppa could not translate the corrected text.');
  }
}

function handleOperationResult(sessionId: string, result: OperationResult): void {
  if (!session || session.id !== sessionId) return;

  if (!result.ok) {
    renderError(result.error);
    return;
  }

  if ('translatedText' in result) {
    session.sourceText = result.sourceText;
    session.translatedText = result.translatedText;
    renderResult(result);
  }
}

function renderProcessing(stage: ProcessingStage, progress?: number): void {
  if (!shadow || !session) return;
  replaceCardContent((card) => {
    card.setAttribute('aria-live', 'polite');
    const spinner = document.createElement('span');
    spinner.className = 'croppa-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = getStageLabel(stage, progress);
    const closeButton = createButton('Close', cleanup, 'secondary');
    card.append(spinner, label, closeButton);
  });
}

function renderResult(result: ProcessResult): void {
  replaceCardContent((card) => {
    card.setAttribute('aria-label', 'Croppa English translation');

    const translation = document.createElement('p');
    translation.className = 'croppa-translation';
    translation.textContent = result.translatedText;

    const meta = document.createElement('p');
    meta.className = 'croppa-meta';
    meta.textContent = `Translated locally in ${(result.durationMs / 1000).toFixed(1)}s`;

    const actions = document.createElement('div');
    actions.className = 'croppa-actions';
    actions.append(
      createButton('Copy', () => void copyTranslation(result.translatedText), 'primary'),
      createButton('Edit source', renderSourceEditor),
      createButton('Retry', () => session && void requestCapture(session)),
      createButton('Close', cleanup),
    );
    card.append(translation, meta, actions);
  });
}

function renderSourceEditor(): void {
  if (!session?.sourceText) return;
  replaceCardContent((card) => {
    const label = document.createElement('label');
    label.className = 'croppa-label';
    label.textContent = 'Recognized Chinese';
    label.htmlFor = 'croppa-source-editor';

    const textarea = document.createElement('textarea');
    textarea.id = 'croppa-source-editor';
    textarea.className = 'croppa-editor';
    textarea.value = session?.sourceText ?? '';
    textarea.rows = 4;

    const actions = document.createElement('div');
    actions.className = 'croppa-actions';
    actions.append(
      createButton('Translate', () => void requestTranslation(textarea.value), 'primary'),
      createButton('Cancel', () => {
        if (session?.sourceText && session.translatedText) {
          renderResult({
            ok: true,
            sourceText: session.sourceText,
            translatedText: session.translatedText,
            durationMs: 0,
          });
        }
      }),
    );
    card.append(label, textarea, actions);
    queueMicrotask(() => textarea.focus());
  });
}

function renderError(message: string): void {
  replaceCardContent((card) => {
    card.setAttribute('role', 'alert');
    const title = document.createElement('strong');
    title.textContent = 'Croppa needs attention';
    const detail = document.createElement('p');
    detail.className = 'croppa-error';
    detail.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'croppa-actions';
    actions.append(
      createButton('Retry', () => session && void requestCapture(session), 'primary'),
      createButton('Close', cleanup),
    );
    card.append(title, detail, actions);
  });
}

function replaceCardContent(fill: (card: HTMLElement) => void): void {
  if (!shadow || !session) return;
  shadow.querySelector('.croppa-card')?.remove();
  const card = document.createElement('section');
  card.className = 'croppa-card';
  positionCard(card, session.rect);
  fill(card);
  shadow.append(card);
}

function positionCard(card: HTMLElement, rect: SelectionRect): void {
  const margin = 8;
  const minWidth = 240;
  const minHeight = 112;
  const availableWidth = Math.max(180, window.innerWidth - margin * 2);
  const availableHeight = Math.max(100, window.innerHeight - margin * 2);
  const width = Math.min(availableWidth, Math.max(minWidth, rect.width));
  const height = Math.min(availableHeight, Math.max(minHeight, rect.height));
  const left = Math.min(Math.max(margin, rect.x), window.innerWidth - width - margin);
  const top = Math.min(Math.max(margin, rect.y), window.innerHeight - height - margin);
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  card.style.width = `${width}px`;
  card.style.minHeight = `${height}px`;
}

function createButton(
  label: string,
  action: () => void,
  kind: 'primary' | 'secondary' = 'secondary',
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `croppa-button croppa-button--${kind}`;
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}

async function copyTranslation(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  const copyButton = shadow?.querySelector<HTMLButtonElement>('.croppa-button--primary');
  if (copyButton) {
    copyButton.textContent = 'Copied';
    setTimeout(() => {
      copyButton.textContent = 'Copy';
    }, 1200);
  }
}

function getStageLabel(stage: ProcessingStage, progress?: number): string {
  const labels: Record<ProcessingStage, string> = {
    capturing: 'Capturing selection…',
    'preparing-ocr': 'Preparing local OCR…',
    recognizing: 'Reading Chinese text…',
    translating: 'Translating locally…',
  };
  const percentage = typeof progress === 'number' ? ` ${Math.round(progress * 100)}%` : '';
  return `${labels[stage]}${percentage}`;
}

function updateSelectionBox(element: HTMLElement, rect: SelectionRect): void {
  element.style.left = `${rect.x}px`;
  element.style.top = `${rect.y}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    cleanup();
  }
}

function addViewportCleanupListeners(): void {
  window.addEventListener('scroll', cleanup, { capture: true, once: true });
  window.addEventListener('resize', cleanup, { once: true });
}

function cleanup(): void {
  window.removeEventListener('keydown', handleKeydown, true);
  window.removeEventListener('scroll', cleanup, true);
  window.removeEventListener('resize', cleanup);
  host?.remove();
  host = undefined;
  shadow = undefined;
  dragStart = undefined;
  session = undefined;
}

function createStyles(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
    :host { color-scheme: light dark; }
    * { box-sizing: border-box; }
    .croppa-selection-layer {
      position: fixed; inset: 0; cursor: crosshair; touch-action: none;
      background: rgb(10 18 32 / 32%); font: 500 14px/1.4 system-ui, sans-serif;
    }
    .croppa-instruction {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      max-width: calc(100vw - 32px); padding: 9px 14px; border-radius: 999px;
      background: #171a20; color: #fff; box-shadow: 0 6px 24px rgb(0 0 0 / 24%);
      pointer-events: none;
    }
    .croppa-selection-box {
      position: fixed; border: 2px solid #6ea8ff; background: rgb(255 255 255 / 8%);
      box-shadow: 0 0 0 1px rgb(0 0 0 / 35%), inset 0 0 0 1px rgb(255 255 255 / 55%);
    }
    .croppa-card {
      position: fixed; display: flex; flex-direction: column; gap: 12px; overflow: auto;
      padding: 14px; border: 1px solid #d0d5dd; border-radius: 12px;
      background: #fff; color: #171a20; box-shadow: 0 12px 36px rgb(0 0 0 / 28%);
      font: 500 14px/1.5 system-ui, sans-serif; pointer-events: auto;
    }
    .croppa-translation, .croppa-error, .croppa-meta { margin: 0; white-space: pre-wrap; }
    .croppa-translation { flex: 1; font-size: 16px; }
    .croppa-meta { color: #667085; font-size: 12px; }
    .croppa-error { color: #b42318; }
    .croppa-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: auto; }
    .croppa-button {
      border: 1px solid #c9ced6; border-radius: 8px; padding: 7px 10px;
      background: #f5f7fa; color: #171a20; font: 600 12px/1 system-ui, sans-serif;
      cursor: pointer;
    }
    .croppa-button:hover { background: #e9edf3; }
    .croppa-button:focus-visible, .croppa-editor:focus-visible { outline: 3px solid #84adff; outline-offset: 2px; }
    .croppa-button--primary { border-color: #155eef; background: #155eef; color: #fff; }
    .croppa-button--primary:hover { background: #004eeb; }
    .croppa-label { font-size: 12px; font-weight: 700; }
    .croppa-editor {
      width: 100%; resize: vertical; border: 1px solid #98a2b3; border-radius: 8px;
      padding: 9px; background: #fff; color: #171a20; font: 500 14px/1.5 system-ui, sans-serif;
    }
    .croppa-spinner {
      width: 20px; height: 20px; border: 3px solid #d0d5dd; border-top-color: #155eef;
      border-radius: 50%; animation: croppa-spin .8s linear infinite;
    }
    @keyframes croppa-spin { to { transform: rotate(360deg); } }
    @media (prefers-color-scheme: dark) {
      .croppa-card { border-color: #475467; background: #1d2939; color: #f2f4f7; }
      .croppa-meta { color: #98a2b3; }
      .croppa-error { color: #fda29b; }
      .croppa-button { border-color: #475467; background: #344054; color: #f9fafb; }
      .croppa-button:hover { background: #475467; }
      .croppa-button--primary { border-color: #528bff; background: #2970ff; }
      .croppa-editor { border-color: #667085; background: #101828; color: #f9fafb; }
    }
    @media (prefers-reduced-motion: reduce) { .croppa-spinner { animation-duration: 1.8s; } }
  `;
  return style;
}
