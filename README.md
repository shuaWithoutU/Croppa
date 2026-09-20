# Croppa

Croppa is a privacy-focused Chromium extension that captures one visual Simplified Chinese text region and replaces it with a natural English translation.

The current implementation includes rectangular capture, local OCR and translation, horizontal/vertical text handling, an opaque result overlay, source correction, retry, copy, close, system theming, and a browser-configurable shortcut.

> Croppa is under active development. The production bundle builds successfully, but the representative manga acceptance set and manual Opera GX/Chrome validation are still pending.

## Why Croppa?

Text inside manga panels, images, and rendered website content often cannot be selected by ordinary translation tools. Croppa keeps the workflow on the current page and processes the selected content locally instead of uploading it to an OCR or translation service.

The approved requirements are in [docs/PRD.md](docs/PRD.md).

## Technology

- TypeScript, React, and Vite
- Chromium Manifest V3 with CRXJS
- Tesseract.js 7 with packaged Simplified Chinese OCR data
- Transformers.js 4 with the quantized `Xenova/opus-mt-zh-en` translation model
- Vitest, ESLint, Prettier, and TypeScript project checks

Executable JavaScript, workers, and WebAssembly are packaged in the extension. Translation model data is downloaded from Hugging Face on first use and cached by the browser.

## Requirements

- Node.js 22 or later
- npm 10 or later
- Current Chrome or Opera GX on Windows 10/11
- Internet access for dependency installation and the first translation-model download

## Setup

```bash
npm install
npm run build
```

The unpacked extension is generated in `dist/`.

## Install the unpacked extension

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository's `dist` directory.

### Opera GX

1. Open `opera://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository's `dist` directory.

## Use Croppa

1. Open Croppa's options page and select **Prepare local models**, or allow the first capture to prepare them automatically.
2. Open a normal `http` or `https` page containing Simplified Chinese text.
3. Click the Croppa toolbar icon or use `Ctrl+Shift+Y` if that shortcut is available.
4. Drag around one text region or speech bubble.
5. Use **Copy**, **Edit source**, **Retry**, or **Close** on the translated overlay.

Browser-internal pages, extension stores, and other restricted pages cannot be captured. Shortcuts can be changed through the browser's extension-shortcut settings.

## Development commands

```bash
npm run dev          # start the Vite/CRXJS development build
npm run format       # format tracked source and documentation
npm run lint         # run ESLint
npm run typecheck    # run TypeScript checks
npm test             # run unit tests
npm run build        # prepare local runtime assets and build dist/
npm run check        # run every quality gate
```

Generated OCR runtime assets are copied from pinned npm packages into `public/` during the build and are intentionally ignored by Git.

## Permissions and network access

- `activeTab`: capture the current visible tab only after the user invokes Croppa.
- `offscreen`: run the local OCR and translation processor in an extension document.
- `storage`: retain non-sensitive model readiness and settings only.
- Hugging Face host access: download translation model data. No capture, recognized text, correction, or translation is sent in these requests.

All executable JavaScript and WebAssembly are packaged locally to comply with Manifest V3. Croppa has no backend, account, analytics, advertising, or paid API.

## Privacy

Captured pixels, recognized Chinese, user corrections, and English translations exist only in memory for the active session. They are discarded when the overlay closes, is replaced, fails, or the page changes. Do not report bugs with private screenshots attached unless you intentionally choose to share them.

## Known limitations

- Simplified Chinese to English only
- One selected text region at a time
- Clear printed text is the initial accuracy target
- Stylized fonts, handwriting, low resolution, and complex backgrounds may reduce OCR accuracy
- Vertical text currently uses an aspect-ratio heuristic and still needs representative manga validation
- First-time model preparation is sizeable and may take several minutes
- Performance varies by hardware; the 2-3 second target applies after models are ready and is not yet validated
- Scrolling or resizing closes the active overlay to prevent position drift

## Project structure

```text
src/background/   Browser coordination, tab capture, and offscreen routing
src/content/      Region selection and in-page result UI
src/options/      React settings and model-preparation page
src/processor/    Local OCR, image preprocessing, and translation
src/shared/       Typed messages, geometry, storage constants, and tests
scripts/          Build-time runtime-asset preparation
docs/             Product requirements and project documentation
```

## License

Croppa is licensed under the [MIT License](LICENSE). Runtime libraries, OCR data, and translation models retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
