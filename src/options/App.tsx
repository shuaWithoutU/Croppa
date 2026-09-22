import { useEffect, useRef, useState } from 'react';

import { isContentMessage, type OperationResult, type StatusResult } from '../shared/messages';

type PreparationState = 'idle' | 'preparing' | 'ready' | 'error';

export function App() {
  const [state, setState] = useState<PreparationState>('idle');
  const [error, setError] = useState('');
  const activeRequest = useRef<string | null>(null);
  const [progress, setProgress] = useState<number | undefined>();
  const [stage, setStage] = useState('Preparing local models');

  // Reopened settings can reattach to setup without keeping an abandoned response channel.
  useEffect(() => {
    if (state !== 'preparing') return;
    let active = true;
    const timer = setInterval(() => {
      void chrome.runtime
        .sendMessage({ target: 'background', type: 'GET_STATUS' })
        .then((result: StatusResult) => {
          if (!active || result.preparationSessionId) return;
          activeRequest.current = null;
          setState(result.modelsReady ? 'ready' : result.lastError ? 'error' : 'idle');
          setError(result.lastError ?? '');
        })
        .catch(() => undefined);
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [state]);

  useEffect(() => {
    const listener = (message: unknown) => {
      if (
        !isContentMessage(message) ||
        message.type !== 'PROCESS_PROGRESS' ||
        message.sessionId !== activeRequest.current
      )
        return;
      setProgress(message.progress);
      setStage(
        message.stage === 'preparing-ocr'
          ? 'Loading OCR engine'
          : 'Downloading or loading translation assets',
      );
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    let active = true;
    void chrome.runtime
      .sendMessage({
        target: 'background',
        type: 'GET_STATUS',
      })
      .then((result: StatusResult) => {
        if (!active || activeRequest.current) return;
        if (result.preparationSessionId) {
          activeRequest.current = result.preparationSessionId;
          setState('preparing');
          return;
        }
        setState(result.modelsReady ? 'ready' : result.lastError ? 'error' : 'idle');
        setError(result.lastError ?? '');
      })
      .catch(() => {
        if (!active) return;
        setState('error');
        setError('Croppa could not read the model status. Reload the extension and try again.');
      });

    return () => {
      active = false;
    };
  }, []);

  /** Starts local model preparation and always restores the UI from its loading state. */
  async function prepareModels() {
    const id = crypto.randomUUID();
    activeRequest.current = id;
    setProgress(undefined);
    setState('preparing');
    setError('');

    try {
      const result = (await chrome.runtime.sendMessage({
        target: 'background',
        type: 'PREPARE_MODELS',
        sessionId: id,
      })) as OperationResult;

      if (activeRequest.current !== id) return;
      activeRequest.current = null;
      if (result.ok) {
        setState('ready');
        return;
      }

      setState('error');
      setError(result.error);
    } catch {
      if (activeRequest.current !== id) return;
      activeRequest.current = null;
      setState('error');
      setError('Croppa lost contact with its local processor. Reload the extension and try again.');
    }
  }

  /** Stops the offscreen engine so cancellation actually aborts pending downloads. */
  async function cancelPreparation() {
    const id = activeRequest.current;
    if (!id) return;
    activeRequest.current = null;
    try {
      await chrome.runtime.sendMessage({
        target: 'background',
        type: 'CANCEL_SESSION',
        sessionId: id,
      });
      setState('idle');
      setError('Preparation cancelled. Completed model files may remain cached for retry.');
    } catch {
      setState('error');
      setError('Could not cancel preparation. Reload the extension to stop its processor.');
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Croppa settings</span>
        <h1>Translate visual Chinese without leaving the page.</h1>
        <p>
          Croppa downloads OCR and translation models, then processes captures locally. Your
          screenshots and text are never uploaded or saved.
        </p>
      </section>

      <section className="panel" aria-labelledby="model-heading">
        <div>
          <h2 id="model-heading">Local models</h2>
          <p className="muted">
            The first preparation can take several minutes and download a sizeable translation model
            from Hugging Face. The exact total download size is currently unknown; allow several
            hundred MB of free disk space. Later captures reuse the browser cache. OCR data is
            bundled. Tesseract.js is Apache-2.0 licensed; the OPUS-MT base model is CC BY 4.0,
            credited to the University of Helsinki with ONNX conversion by Xenova; see the
            repository third-party notices for details.
          </p>
        </div>
        <StatusPill state={state} />
        {state === 'preparing' && (
          <div role="status" aria-live="polite">
            <p>
              {stage}
              {progress === undefined ? '...' : `: ${Math.round(progress * 100)}% of current asset`}
            </p>
            <progress max={1} value={progress} aria-label={stage} />
            <button className="primary-button" onClick={() => void cancelPreparation()}>
              Cancel preparation
            </button>
          </div>
        )}
        <button
          className="primary-button"
          type="button"
          disabled={state === 'preparing'}
          onClick={() => void prepareModels()}
        >
          {state === 'preparing'
            ? 'Preparing models…'
            : state === 'ready'
              ? 'Check models again'
              : 'Prepare local models'}
        </button>
        {error && <p className="error-message">{error}</p>}
      </section>

      <section className="panel" aria-labelledby="usage-heading">
        <h2 id="usage-heading">How to use Croppa</h2>
        <ol>
          <li>Click the Croppa toolbar icon or use its assigned browser shortcut.</li>
          <li>Drag around one Simplified Chinese text region.</li>
          <li>Wait for the local OCR and English translation.</li>
          <li>Copy, edit the recognized source, retry, or close the result.</li>
        </ol>
      </section>

      <section className="panel" aria-labelledby="shortcut-heading">
        <h2 id="shortcut-heading">Keyboard shortcut</h2>
        <p className="muted">
          The suggested shortcut is <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Y</kbd>. Change it
          from <code>chrome://extensions/shortcuts</code> in Chrome or the extension-shortcut page
          in Opera GX.
        </p>
      </section>

      <section className="privacy-note" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Private by design</h2>
        <p>
          Croppa stores only non-sensitive settings, model metadata, and downloaded model assets.
          Captures, recognized text, corrections, and translations exist only for the active
          session.
        </p>
      </section>
      <p className="muted">
        Croppa {chrome.runtime.getManifest().version} · Simplified Chinese → English
      </p>
    </main>
  );
}

function StatusPill({ state }: { state: PreparationState }) {
  const label: Record<PreparationState, string> = {
    idle: 'Not prepared',
    preparing: 'Preparing',
    ready: 'Ready',
    error: 'Needs attention',
  };
  return <span className={`status-pill status-pill--${state}`}>{label[state]}</span>;
}
