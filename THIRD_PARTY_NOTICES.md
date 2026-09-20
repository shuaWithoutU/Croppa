# Third-Party Notices

Croppa is MIT-licensed, but its dependencies and downloaded model assets retain their own licenses. This document records the material runtime components selected for the initial feasibility implementation.

## Tesseract.js

- Package: `tesseract.js` 7.0.0
- Source: <https://github.com/naptha/tesseract.js>
- License: Apache License 2.0
- Use: Browser-local OCR orchestration and worker

## Tesseract.js Core

- Package: `tesseract.js-core` 7.x, installed transitively by Tesseract.js
- Source: <https://github.com/naptha/tesseract.js-core>
- License: Apache License 2.0
- Use: Packaged WebAssembly OCR runtime

## Simplified Chinese Tesseract data

- Package: `@tesseract.js-data/chi_sim` 1.0.0
- Source: <https://github.com/naptha/tessdata>
- Package license: MIT
- Use: Packaged `chi_sim` OCR language data

## Transformers.js

- Package: `@huggingface/transformers` 4.3.0
- Source: <https://github.com/huggingface/transformers.js>
- License: Apache License 2.0
- Use: Browser-local translation model loading, tokenization, and inference

## ONNX Runtime Web

- Package: `onnxruntime-web` 1.31.0 development build, pinned transitively by Transformers.js 4.3.0
- Source: <https://github.com/microsoft/onnxruntime>
- License: MIT
- Use: Packaged WebAssembly translation runtime

## OPUS-MT Chinese-to-English model

- Browser-ready model: `Xenova/opus-mt-zh-en`
- Source: <https://huggingface.co/Xenova/opus-mt-zh-en>
- Base model: `Helsinki-NLP/opus-mt-zh-en`
- Base-model license: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Use: Quantized Chinese-to-English translation weights downloaded on demand
- Attribution: Developed by the Language Technology Research Group at the University of Helsinki as part of OPUS-MT; browser-compatible ONNX conversion published by Xenova.

Before release, regenerate or review the complete production dependency license inventory and preserve any additional notices required by the final dependency graph.
