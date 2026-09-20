# Croppa

Croppa is a privacy-focused browser extension for translating Simplified Chinese text found in manga, images, and websites into natural English.

The initial release will let users select one visible text region, process it locally with OCR and translation models, and display the English translation in an opaque overlay over the source region.

## Project status

Croppa is currently in the planning and feasibility stage. Implementation has not started.

The approved product requirements are documented in [docs/PRD.md](docs/PRD.md).

## Planned technology

- TypeScript
- React
- Vite
- Chromium Manifest V3
- Tesseract.js or another validated local OCR runtime
- A validated browser-local Chinese-to-English translation model

## Intended platforms

- Opera GX on Windows 10/11
- Google Chrome on Windows 10/11

## Privacy and cost

Croppa is designed to process captured images and extracted text locally. The MVP will not require an account, backend, paid API, analytics, or translation history.

## Development

Setup, build, test, and unpacked-installation instructions will be added after the feasibility milestone establishes the implementation details.

## License

Croppa is licensed under the [MIT License](LICENSE). Third-party libraries and model assets retain their respective licenses and will be documented before release.
