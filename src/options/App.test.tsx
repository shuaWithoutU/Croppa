// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';

let listener: (message: unknown) => void;
let finish: (result: unknown) => void;
const sendMessage = vi.fn();

beforeEach(() => {
  sendMessage.mockReset().mockImplementation((message) => {
    if (message.type === 'GET_STATUS') return Promise.resolve({ ok: true, modelsReady: false });
    if (message.type === 'CANCEL_SESSION') return Promise.resolve({ ok: true });
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage,
      getManifest: () => ({ version: '0.1.0' }),
      onMessage: {
        addListener: (callback: typeof listener) => {
          listener = callback;
        },
        removeListener: vi.fn(),
      },
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('shows live asset progress and ignores a late success after cancellation', async () => {
  render(<App />);
  await act(async () => {});
  fireEvent.click(screen.getByText('Prepare local models'));
  const request = sendMessage.mock.calls.find(([message]) => message.type === 'PREPARE_MODELS')![0];
  act(() =>
    listener({
      target: 'content',
      type: 'PROCESS_PROGRESS',
      sessionId: request.sessionId,
      stage: 'downloading',
      progress: 0.37,
    }),
  );
  expect(screen.getByRole('progressbar').getAttribute('value')).toBe('0.37');
  fireEvent.click(screen.getByText('Cancel preparation'));
  await waitFor(() => expect(screen.getByText('Not prepared')).toBeDefined());
  await act(async () => finish({ ok: true }));
  expect(screen.queryByText('Ready')).toBeNull();
  expect(sendMessage).toHaveBeenCalledWith({
    target: 'background',
    type: 'CANCEL_SESSION',
    sessionId: request.sessionId,
  });
});

it('allows retry after preparation fails', async () => {
  render(<App />);
  await act(async () => {});
  fireEvent.click(screen.getByText('Prepare local models'));
  await act(async () => finish({ ok: false, code: 'MODEL_FAILED', error: 'Check connection.' }));
  expect(screen.getByText('Check connection.')).toBeDefined();
  expect((screen.getByText('Prepare local models') as HTMLButtonElement).disabled).toBe(false);
});
