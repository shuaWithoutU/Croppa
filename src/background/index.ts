import {
  type BackgroundRequest,
  isBackgroundRequest,
  type ErrorResult,
  type OperationResult,
  type ProcessorRequest,
  type StatusResult,
} from '../shared/messages';
import { MODEL_VERSION, STORAGE_KEYS } from '../shared/storage';

const OFFSCREEN_DOCUMENT_PATH = 'processor.html';
const sessionTabs = new Map<string, number>();
let creatingOffscreenDocument: Promise<void> | undefined;

chrome.action.onClicked.addListener((tab) => {
  void startSelection(tab);
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({
    [STORAGE_KEYS.modelVersion]: MODEL_VERSION,
  });
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isBackgroundRequest(message)) {
    return false;
  }

  void handleMessage(message, sender).then(sendResponse, (error: unknown) => {
    sendResponse(
      errorResult(
        'PROCESSING_FAILED',
        getSafeErrorMessage(error, 'Croppa could not complete the requested operation.'),
      ),
    );
  });
  return true;
});

async function startSelection(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !isSupportedUrl(tab.url)) {
    await showActionError(tab.id, 'Croppa cannot capture this browser page.');
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      target: 'content',
      type: 'START_SELECTION',
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  } catch {
    await showActionError(tab.id, 'Reload this page before starting Croppa.');
  }
}

async function handleMessage(
  message: BackgroundRequest,
  sender: chrome.runtime.MessageSender,
): Promise<OperationResult | StatusResult> {
  if (!isBackgroundRequest(message)) {
    return errorResult('INVALID_REQUEST', 'Croppa received an invalid request.');
  }

  if (message.type === 'PROCESSOR_PROGRESS') {
    const tabId = sessionTabs.get(message.sessionId);
    if (tabId) {
      await chrome.tabs
        .sendMessage(tabId, {
          target: 'content',
          type: 'PROCESS_PROGRESS',
          sessionId: message.sessionId,
          stage: message.stage,
          progress: message.progress,
        })
        .catch(() => undefined);
    }
    return { ok: true };
  }

  if (message.type === 'GET_STATUS') {
    const state = await chrome.storage.local.get([
      STORAGE_KEYS.modelReady,
      STORAGE_KEYS.modelVersion,
      STORAGE_KEYS.lastModelError,
    ]);
    return {
      ok: true,
      modelsReady:
        state[STORAGE_KEYS.modelReady] === true &&
        state[STORAGE_KEYS.modelVersion] === MODEL_VERSION,
      lastError:
        typeof state[STORAGE_KEYS.lastModelError] === 'string'
          ? state[STORAGE_KEYS.lastModelError]
          : undefined,
    };
  }

  if (message.type === 'PREPARE_MODELS') {
    const result = await sendToProcessor({
      target: 'processor',
      type: 'PROCESS_PREPARE',
      sessionId: message.sessionId,
    });
    await storeModelPreparationResult(result);
    return result;
  }

  const tabId = sender.tab?.id;
  if (!tabId) {
    return errorResult('INVALID_REQUEST', 'Croppa could not identify the active tab.');
  }

  sessionTabs.set(message.sessionId, tabId);

  try {
    if (message.type === 'TRANSLATE_TEXT') {
      return await sendToProcessor({
        target: 'processor',
        type: 'PROCESS_TRANSLATION',
        sessionId: message.sessionId,
        sourceText: message.sourceText,
      });
    }

    await chrome.tabs.sendMessage(tabId, {
      target: 'content',
      type: 'PROCESS_PROGRESS',
      sessionId: message.sessionId,
      stage: 'capturing',
    });

    const captureDataUrl =
      sender.tab?.windowId === undefined
        ? await chrome.tabs.captureVisibleTab({ format: 'png' })
        : await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });

    return await sendToProcessor({
      target: 'processor',
      type: 'PROCESS_CAPTURE',
      sessionId: message.sessionId,
      captureDataUrl,
      rect: message.rect,
      viewport: message.viewport,
    });
  } catch (error) {
    return errorResult(
      'CAPTURE_FAILED',
      getSafeErrorMessage(error, 'Croppa could not capture this tab.'),
    );
  } finally {
    sessionTabs.delete(message.sessionId);
  }
}

async function sendToProcessor(message: ProcessorRequest): Promise<OperationResult> {
  try {
    await ensureOffscreenDocument();
    return (await chrome.runtime.sendMessage(message)) as OperationResult;
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error, 'The local processing engine could not start.');
    await chrome.storage.local.set({
      [STORAGE_KEYS.modelReady]: false,
      [STORAGE_KEYS.lastModelError]: safeMessage,
    });
    return errorResult('PROCESSING_FAILED', safeMessage);
  }
}

/** Persists only model readiness metadata returned by the offscreen processor. */
async function storeModelPreparationResult(result: OperationResult): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.modelReady]: result.ok,
    [STORAGE_KEYS.modelVersion]: MODEL_VERSION,
    [STORAGE_KEYS.lastModelError]: result.ok ? '' : result.error,
  });
}

async function ensureOffscreenDocument(): Promise<void> {
  const documentUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [documentUrl],
  });

  if (contexts.length > 0) {
    return;
  }

  creatingOffscreenDocument ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Run local OCR and translation without sending user content to a server.',
    })
    .finally(() => {
      creatingOffscreenDocument = undefined;
    });

  await creatingOffscreenDocument;
}

async function showActionError(tabId: number | undefined, title: string): Promise<void> {
  if (!tabId) {
    return;
  }

  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#b42318' }),
    chrome.action.setBadgeText({ tabId, text: '!' }),
    chrome.action.setTitle({ tabId, title }),
  ]);

  setTimeout(() => {
    void chrome.action.setBadgeText({ tabId, text: '' });
    void chrome.action.setTitle({ tabId, title: 'Start a Croppa capture' });
  }, 5000);
}

function isSupportedUrl(url: string | undefined): boolean {
  return Boolean(url && (url.startsWith('http://') || url.startsWith('https://')));
}

function getSafeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function errorResult(code: ErrorResult['code'], error: string): ErrorResult {
  return { ok: false, code, error };
}
