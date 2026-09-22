# Croppa implementation handoff — 2026-09-22

## Implemented in this local iteration

- Capture and Retry hide Croppa UI for two paint frames before screenshot acquisition. Progress appears only after capture, preventing the result/loading card from contaminating OCR.
- PNG captures are decoded in memory without CSP-blocked `fetch(data:...)`.
- OCR uses padding, scaling, grayscale/contrast, dark-background inversion, layout selection, and a second segmentation attempt for uncertain recognition. It selects the stronger Chinese candidate; non-Chinese-only output becomes a no-text state.
- Failed recognition offers manual Chinese entry. Empty source submission is disabled; input is limited to 2,000 characters.
- Setup requires an explicit first preparation, exposes per-asset download progress, supports cancellation/retry, and reconnects when settings is reopened. Exact download size remains explicitly unknown.
- Cancellation tears down the offscreen processor; page navigation/tab closure cancel owned work. Concurrent operations return busy instead of retaining queued captures. Setup has a ten-minute deadline; capture/translation has a two-minute deadline.
- Active-tab checks guard screenshot acquisition. Unique operation IDs reject late results and late progress updates.
- OCR workers and canvases release captured pixels after recognition. Error messages do not expose raw runtime errors or source contents.
- Results fit the remaining viewport with internal scrolling; scrolling inside the card does not dismiss it. Page scrolling/resizing dismisses the card. Focus, clipboard feedback, empty source validation, and reduced motion are improved.
- Regression tests cover coordination, privacy-sensitive storage behavior, capture UI visibility, cancellation, progress, OCR fallback, correction, and clipboard failure.
- A local synthetic OCR fixture page and detailed manual acceptance checklist are included.

## Validation boundary

Local validation on 2026-09-22: `npm run check` passed formatting, lint, TypeScript,
33 tests across 9 files, and the production build. `npm audit --json` and
`npm audit --omit=dev --json` reported zero known vulnerabilities. The fixture server
returned HTTP 200 with the expected page. `git diff --check` passed. Vite still emits
its non-fatal warning about the bundled processor exceeding 500 kB.

The rebuilt unpacked extension is in `dist/`. Changes are uncommitted and have not
been pushed; the existing local HEAD remains `512eab4`.

Automated tests use mocked Chromium APIs and mocked model output. A build passing does not establish live Opera GX/Chrome compatibility, OCR quality, translation quality, real model cancellation, screen-reader behavior, or runtime network privacy. Complete [MANUAL_TESTS.md](MANUAL_TESTS.md) before calling this MVP release ready.

The representative 20-sample set is still awaiting Shua. Japanese, Korean, full-viewport translation, store publishing, and remote release remain outside this iteration.

## Implementation decisions

- Retain direct toolbar-to-selection behavior, as requested during discovery. Readiness and help live in settings rather than an intervening toolbar popup. The PRD's screen inventory describes a popup, but its core journey and FR-001 favor direct capture; this discrepancy is recorded here for review.
- Allow only one inference operation across the extension at a time. Finished cards may remain open in different tabs. Rejecting concurrent work avoids a queue of private screenshots and makes cancellation ownership explicit.
- Cancel by closing the offscreen document because inference/download APIs do not provide one dependable cancellation mechanism across both runtimes. Cached assets survive, but the next operation must reinitialize runtimes. [Chrome offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen).
- Download percentages refer to the current asset, not an invented aggregate. Transformers emits percentages on a 0–100 scale; normalize to 0–1 for UI. [Transformers progress contract](https://huggingface.co/docs/transformers.js/api/utils/core).
- Terminate Tesseract after each capture to release its retained image. This prioritizes session privacy and may increase warm latency. Translation weights remain loaded between ordinary completed requests.
- Defer an in-app model-cache reset button; document cache repair for a test profile. No cache deletion happens automatically.

## Remaining release work

- Run the exact built extension in both browsers and complete the 20-sample quality target.
- Verify real download cancellation, cached restart, storage-pressure failure, keyboard/screen-reader behavior, network traffic, and storage contents.
- Finish the complete transitive dependency license inventory and package required notices before publishing a release artifact.
- Record measured download/cache size, latency, tested browser versions, and quality failures.
- Obtain approval for a commit message before committing. No remote push is authorized for this iteration.
