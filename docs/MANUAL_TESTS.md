# Croppa browser acceptance checklist

Status: **not yet executed on the production build in Opera GX or Chrome**. Automated tests mock browser APIs and model output; they do not establish real OCR accuracy, translation quality, accessibility, or absence of browser-specific failures.

## Start here

1. Run `npm run check` from `D:/PersonalProjects/Croppa` if you have changed code. Otherwise use the already built `dist/` folder.
2. Open `opera://extensions` (or `chrome://extensions`) and reload Croppa. Refresh any existing test webpages after the extension reload.
3. Open Croppa's options and prepare/check models. A first capture now opens settings if setup has not succeeded; return to the webpage after setup.
4. Run `npm run test:page`, then open <http://127.0.0.1:4174>. Stop the server with Ctrl+C when finished. This serves only the project-owned fixture page on your computer.
5. Record browser version, Windows version, display scaling, browser zoom, build date, and whether models were already cached.

Keep screenshots and recognized/translated private material out of Git. Record only sample identifiers and aggregate findings below.

## First five tests

| ID  | Action                                                                               | Expected result                                                                                                               |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| S01 | Snip the light-background `我叫小明。` sample with a small margin. Open Edit source. | Chinese matches the sample; English means “My name is Xiaoming.” Names may be romanized differently.                          |
| S02 | Repeat S01 on the dark-background sample five times using the same selection.        | No Croppa status/card text appears in OCR. Record every wrong or empty result rather than counting only successes.            |
| S03 | Click Retry on a successful card three times.                                        | The original Chinese is captured, not the English result or loading card; only one card remains.                              |
| S04 | Snip the blank canvas. Choose Edit source and enter `你好`.                          | An actionable no-text state appears; manual entry translates to “Hello” without recapturing. Empty input cannot be submitted. |
| S05 | Start a capture and press Escape during processing, then start another.              | Old work stops; no late result replaces the new session. If briefly busy during teardown, retry after it stops.               |

## Layout override regression (2026-09-23)

1. Snip a fixture and open Edit source. Text layout should start on Auto.
2. Choose Horizontal line for a one-line fixture, Horizontal block for two lines, or Vertical for the vertical fixture. Select Read image again.
3. Confirm OCR runs again over the same region, the overlay is not captured, and no duplicate card appears. Compare recognized Chinese against the fixture; improvement is not guaranteed.
4. Reopen Edit source: the applied layout should remain selected. Retry should reuse it. A new snip should start on Auto.
5. Type a correction and select Translate: it should translate that correction without a screenshot. Changing layout without pressing Read image again must not discard your edit or change recognition automatically.
6. On a no-text error, open Edit source and test the same layout controls. Verify labels, keyboard selection, and focus in both themes.

## Setup and recovery

Use a separate test browser profile for destructive storage tests so your ordinary model cache stays intact.

| ID  | Action                                                                                        | Expected result                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| M01 | Install the unpacked build in a fresh profile; invoke the toolbar action on a normal webpage. | Settings explains local processing, model host, license, and unknown exact download size before you start preparation.                           |
| M02 | Prepare models with DevTools Network open.                                                    | Current-asset progress updates between 0 and 100%; different files may restart the percentage. Ready appears only after initialization succeeds. |
| M03 | Cancel preparation while a model downloads.                                                   | Preparation exits; the offscreen processor closes. Completed model assets can remain cached. Retry works.                                        |
| M04 | Close settings during preparation, then reopen settings.                                      | Existing setup is recognized, progress resumes, Cancel works, and readiness eventually updates.                                                  |
| M05 | In the test profile, interrupt networking during first download, then restore it and retry.   | Actionable failure or the ten-minute setup deadline, no permanent spinner; retry recovers without reinstalling.                                  |
| M06 | Restart the browser after successful preparation, then capture again.                         | Cached files are reused where supported; the model may need time to initialize again. No guaranteed offline support is claimed.                  |
| M07 | Simulate missing/corrupt model cache in the test profile, then Check models again.            | Cached assets are revalidated by the runtime or loading fails with repair guidance; no automatic endless retry.                                  |
| M08 | If practical, simulate insufficient storage in a disposable test environment.                 | Setup reports failure with connection/free-space guidance. Never fill your normal system disk for this test.                                     |

Cache repair: reload the extension and select Check models again first. If that fails, inspect the **extension origin's** Application → Cache Storage/IndexedDB in DevTools, clear model caches only in the test profile, reload, and prepare again. Clearing caches requires another download. There is no in-app cache reset button yet.

## Capture, interactions, and accessibility

| ID  | Action                                                                                                       | Expected result                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | Test toolbar and assigned Ctrl+Shift+Y shortcut.                                                             | Both start selection on supported pages once setup is ready. Shortcut conflicts are changed in browser extension-shortcut settings.             |
| C02 | Click without dragging, draw a tiny rectangle, drag backwards, then press Escape.                            | Tiny selections show guidance; reverse dragging works; Escape leaves no overlay.                                                                |
| C03 | Capture near each viewport edge at 80%, 100%, 125%, and 150% browser zoom.                                   | OCR captures the selected content; card and actions stay within the viewport.                                                                   |
| C04 | Test horizontal, two-line, single-word, smaller-print, and vertical-column fixtures.                         | Appropriate Chinese is recognized; vertical samples do not crash. Record quality failures separately.                                           |
| C05 | Edit source, submit corrected Chinese, then use Copy and paste into a temporary editor.                      | Translation changes without a new screenshot. Clipboard contains English only.                                                                  |
| C06 | Block clipboard access or test an HTTP page with fallback unavailable.                                       | Copy reports failure rather than a false “Copied”; text remains selectable.                                                                     |
| C07 | Generate a long result; scroll inside the card, then scroll the webpage.                                     | Internal scrolling keeps the card open; page scrolling closes it. Resizing also closes it.                                                      |
| C08 | Click the fixture's focus-test button before capture; use Tab/Shift+Tab after selection and Escape to close. | Controls receive visible keyboard focus; source editor focuses its field; closing returns focus to the earlier page control.                    |
| C09 | Change system light/dark theme and reduced-motion preference.                                                | UI remains readable with visible focus; reduced motion disables the spinner animation. Check contrast and screen-reader announcements manually. |
| C10 | Navigate, reload, or close a tab while processing.                                                           | Active processing cancels; a late result cannot create a new overlay.                                                                           |
| C11 | Start work in a second tab while the first is processing.                                                    | Second request reports busy; it does not queue or retain another screenshot. Retry once the first finishes.                                     |
| C12 | Change tabs immediately after selection.                                                                     | Croppa fails safely if it detects a different active tab; it must not display text from another tab. Repeat to exercise timing.                 |
| C13 | Invoke Croppa on `opera://extensions`, `chrome://settings`, or an extension store.                           | No stuck selection; toolbar badge/title explains unavailable capture or refresh guidance.                                                       |
| C14 | Reload the extension, then use an already open webpage before and after refreshing it.                       | Before refresh, actionable toolbar feedback; after refresh, selection works.                                                                    |

## Privacy checks — release blocking

1. Inspect the extension's service worker and offscreen document using the extension developer page. Keep Network recording during preparation, capture, correction, retry, cancellation, and navigation.
2. Model downloads may contact the documented Hugging Face hosts. Confirm **no screenshot, source text, correction, or translation** appears in request URLs, query strings, headers, bodies, or other remote traffic. Page-owned traffic is distinct from extension traffic.
3. Inspect extension local/sync/session storage, Cache Storage, and IndexedDB. Only model assets and non-sensitive metadata should remain; no image captures or recognized/translated content.
4. Cancel during OCR and confirm the offscreen document closes. The OCR worker is terminated after each completed recognition attempt to release its retained image. Check again after repeated captures for unbounded memory growth.
5. Close all overlays and navigate away. Confirm no Croppa DOM remains and no content appears in production console logs.

## Twenty-sample quality assessment

Shua's representative set is still required. Include clear website imagery, manga dialogue, horizontal and vertical text, one word, multiple lines, light and dark backgrounds. Synthetic fixtures are smoke tests, not a substitute for the approved set.

Copy this row for sample IDs 01–20, separately for each browser:

| Sample ID | Browser/version | Orientation | Source type | OCR correct without edit? | English understandable without edit? | Warm time (s) | Notes (no private text) |
| --------- | --------------- | ----------- | ----------- | ------------------------- | ------------------------------------ | ------------- | ----------------------- |
| 01        | Pending         | Pending     | Pending     | Not run                   | Not run                              | —             | —                       |

Pass target: at least **16/20 understandable results without manual correction**, zero unhandled errors, and passing privacy checks. Measure warm performance against the 2–3 second goal but record slower results honestly. Failures with correct Chinese belong to translation quality; wrong Chinese belongs to capture/OCR investigation.
