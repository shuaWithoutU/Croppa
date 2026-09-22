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
let activeJob: { id: string; tabId?: number; cancelled: boolean } | undefined;
let closingProcessor: Promise<void> | undefined;

/** Stops processing when its owning page disappears or navigates. */
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeJob?.tabId === tabId) void cancelSession(activeJob.id);
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading' && activeJob?.tabId === tabId) void cancelSession(activeJob.id);
});

chrome.action.onClicked.addListener((tab) => {
  void startSelection(tab);
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.get(STORAGE_KEYS.modelVersion).then((state) => {
    if (state[STORAGE_KEYS.modelVersion] !== MODEL_VERSION)
      return chrome.storage.local.set({
        [STORAGE_KEYS.modelVersion]: MODEL_VERSION,
        [STORAGE_KEYS.modelReady]: false,
      });
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

/** Gates first capture on explicit model setup, then invokes the active page's selection UI. */
async function startSelection(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !isSupportedUrl(tab.url)) {
    await showActionError(tab.id, 'Croppa cannot capture this browser page.');
    return;
  }

  try {
    const state = await chrome.storage.local.get([
      STORAGE_KEYS.modelReady,
      STORAGE_KEYS.modelVersion,
    ]);
    if (!state[STORAGE_KEYS.modelReady] || state[STORAGE_KEYS.modelVersion] !== MODEL_VERSION) {
      await chrome.runtime.openOptionsPage();
      return;
    }
    await chrome.tabs.sendMessage(tab.id, {
      target: 'content',
      type: 'START_SELECTION',
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  } catch {
    await showActionError(tab.id, 'Reload this page before starting Croppa.');
  }
}

/** Routes validated requests while keeping captures and text out of persistent storage. */
async function handleMessage(
  message: BackgroundRequest,
  sender: chrome.runtime.MessageSender,
): Promise<OperationResult | StatusResult> {
  if (!isBackgroundRequest(message)) {
    return errorResult('INVALID_REQUEST', 'Croppa received an invalid request.');
  }

  if (message.type === 'PROCESSOR_PROGRESS') {
    if (sender.url !== chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)) return { ok: true };
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
    if (activeJob?.id === message.sessionId && activeJob.tabId === undefined) {
      await chrome.runtime
        .sendMessage({
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

  if (message.type === 'CANCEL_SESSION') {
    if (
      activeJob?.id === message.sessionId &&
      (activeJob.tabId === undefined
        ? sender.url === chrome.runtime.getURL('options.html')
        : activeJob.tabId === sender.tab?.id)
    ) {
      await cancelSession(message.sessionId);
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
      preparationSessionId:
        activeJob?.tabId === undefined && !activeJob?.cancelled ? activeJob?.id : undefined,
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
    if (sender.url !== chrome.runtime.getURL('options.html'))
      return errorResult('INVALID_REQUEST', 'Open Croppa settings to prepare models.');
    return runJob(message.sessionId, undefined, async () => {
      const result = await sendToProcessor({
        target: 'processor',
        type: 'PROCESS_PREPARE',
        sessionId: message.sessionId,
      });
      if (!activeJob?.cancelled) await storeModelPreparationResult(result);
      return result;
    });
  }

  const tabId = sender.tab?.id;
  if (!tabId || (sender.frameId !== undefined && sender.frameId !== 0)) {
    return errorResult('INVALID_REQUEST', 'Croppa could not identify the active tab.');
  }

  return runJob(message.sessionId, tabId, async () => {
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

      const [activeTab] = await chrome.tabs.query({ active: true, windowId: sender.tab!.windowId });
      if (activeTab?.id !== tabId)
        return errorResult('CAPTURE_FAILED', 'Return to the selected tab and retry.');

      const captureDataUrl =
        sender.tab?.windowId === undefined
          ? await chrome.tabs.captureVisibleTab({ format: 'png' })
          : await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });

      if (activeJob?.cancelled) return errorResult('CANCELLED', 'Cancelled.');
      const [stillActive] = await chrome.tabs.query({
        active: true,
        windowId: sender.tab!.windowId,
      });
      if (stillActive?.id !== tabId)
        return errorResult(
          'CAPTURE_FAILED',
          'The active tab changed. Return to the selected tab and retry.',
        );

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
  });
}

/** Serializes local inference without retaining a queue of private captures. */
async function runJob(
  id: string,
  tabId: number | undefined,
  work: () => Promise<OperationResult>,
): Promise<OperationResult> {
  if (activeJob)
    return errorResult('BUSY', 'Croppa is busy in another session. Close it or wait, then retry.');
  const job = { id, tabId, cancelled: false };
  activeJob = job;
  const heartbeat = setInterval(() => {
    void chrome.runtime.getPlatformInfo().catch(() => undefined);
  }, 20000);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    await closingProcessor;
    if (job.cancelled) return errorResult('CANCELLED', 'Cancelled.');
    const deadline = new Promise<OperationResult>((resolve) => {
      timeout = setTimeout(
        () => {
          timedOut = true;
          void cancelSession(id).then(() =>
            resolve(
              errorResult(
                'PROCESSING_FAILED',
                'Processing took too long and was stopped. Check your connection, then retry.',
              ),
            ),
          );
        },
        tabId === undefined ? 10 * 60_000 : 2 * 60_000,
      );
    });
    const result = await Promise.race([work(), deadline]);
    return timedOut
      ? errorResult(
          'PROCESSING_FAILED',
          'Processing took too long and was stopped. Check your connection, then retry.',
        )
      : job.cancelled
        ? errorResult('CANCELLED', 'Cancelled.')
        : result;
  } finally {
    clearInterval(heartbeat);
    clearTimeout(timeout);
    if (activeJob === job) activeJob = undefined;
  }
}

/** Closing the offscreen document aborts downloads and releases worker-held pixels and text. */
async function cancelSession(id: string): Promise<void> {
  if (activeJob?.id !== id) return;
  activeJob.cancelled = true;
  closingProcessor = (async () => {
    await creatingOffscreenDocument?.catch(() => undefined);
    await chrome.offscreen.closeDocument().catch(() => undefined);
  })();
  await closingProcessor;
}

/** Starts the local processor and records only safe model failure metadata. */
async function sendToProcessor(message: ProcessorRequest): Promise<OperationResult> {
  try {
    await ensureOffscreenDocument();
    if (activeJob?.cancelled) return errorResult('CANCELLED', 'Cancelled.');
    const result = (await chrome.runtime.sendMessage(message)) as OperationResult;
    if (!result.ok && result.code === 'MODEL_FAILED' && !activeJob?.cancelled)
      await storeModelPreparationResult(result);
    return result;
  } catch (error) {
    if (activeJob?.cancelled) return errorResult('CANCELLED', 'Cancelled.');
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

/** Coalesces concurrent startup attempts into the single supported offscreen document. */
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
  void error;
  return fallback;
}

function errorResult(code: ErrorResult['code'], error: string): ErrorResult {
  return { ok: false, code, error };
}
