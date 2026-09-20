import { useEffect, useState } from 'react';

import type { OperationResult, StatusResult } from '../shared/messages';

type PreparationState = 'idle' | 'preparing' | 'ready' | 'error';

export function App() {
  const [state, setState] = useState<PreparationState>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void chrome.runtime
      .sendMessage({
        target: 'background',
        type: 'GET_STATUS',
      })
      .then((result: StatusResult) => {
        if (!active) return;
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
    setState('preparing');
    setError('');

    try {
      const result = (await chrome.runtime.sendMessage({
        target: 'background',
        type: 'PREPARE_MODELS',
        sessionId: crypto.randomUUID(),
      })) as OperationResult;

      if (result.ok) {
        setState('ready');
        return;
      }

      setState('error');
      setError(result.error);
    } catch {
      setState('error');
      setError('Croppa lost contact with its local processor. Reload the extension and try again.');
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
            The first preparation can take several minutes and download a sizeable translation
            model. Later captures reuse the browser cache.
          </p>
        </div>
        <StatusPill state={state} />
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
