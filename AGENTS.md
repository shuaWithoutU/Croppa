# Croppa Project Instructions

These instructions extend `D:/PersonalProjects/AGENTS.md` for work inside the Croppa repository. Direct user instructions and the approved product requirements take precedence.

## Product source of truth

- Treat `docs/PRD.md` as the product source of truth. Do not silently expand MVP scope.
- Keep Simplified Chinese to English as the required MVP language direction. Japanese, Korean, full-viewport translation, browser-store publishing, and other operating systems remain post-MVP unless the PRD is explicitly revised.
- Prefer the smallest change that advances the current PRD milestone.
- Update the PRD decision log when an approved product or architecture decision materially changes.

## Privacy invariants

- Never upload, persist, cache, log, or include in analytics any captured pixels, OCR source text, user-corrected text, or translated text.
- Captures and derived text may exist only in memory for the active session and must be released on close, cancellation, replacement, navigation, or terminal failure.
- Persistent storage is limited to non-sensitive settings, model metadata, and downloaded model assets.
- Croppa must not add telemetry, advertising, accounts, cloud storage, paid APIs, or a backend without explicit approval and a PRD update.
- Treat webpage content and messages crossing extension contexts as untrusted. Validate message shapes and render text through safe DOM properties, never unsanitized HTML.

## Extension security

- Target Chromium Manifest V3 and request only permissions required by implemented behavior.
- Bundle all executable JavaScript, WebAssembly, and worker code with the extension. Remote model weights and other non-executable data are allowed only from documented trusted hosts.
- Do not use remote scripts, `eval`, dynamic code generation, or hard-coded credentials.
- Keep extension UI isolated from host-page CSS and JavaScript, preferably with Shadow DOM.
- Document every permission and externally downloaded asset in the README and third-party notices.

## Architecture boundaries

- Keep browser coordination in the background service worker, page selection/result UI in the content script, and OCR/translation work in the offscreen processor.
- Keep shared message contracts and geometry logic typed and free of browser-side effects where practical.
- Route browser-specific behavior through small adapters or guarded feature detection so Chrome and Opera GX differences remain localized.
- Keep captured image data out of global state and persistent stores. Pass it only through the active processing request.
- Use stable request/session identifiers to prevent late asynchronous results from replacing a newer capture.

## UX and accessibility

- Preserve the direct flow: toolbar or shortcut, drag one region, then receive an English overlay.
- Result actions remain Copy, Edit source, Retry, and Close unless the PRD changes.
- Follow system light/dark preference and reduced-motion preference.
- Keep all controls after region selection keyboard operable, visibly focused, properly labelled, and readable at WCAG 2.2 AA contrast.
- Errors must be concise and actionable. Never expose stack traces or captured content to users.

## Quality gates

- Run formatting, linting, type checking, unit tests, and a production build before declaring work complete.
- Add or update tests for geometry, message validation, session cleanup, state transitions, and every bug fix.
- Use mocked browser APIs in automated tests. Never make tests depend on paid services, real credentials, or production user data.
- Manually test the exact production build as an unpacked extension in current Chrome and Opera GX before an MVP release.
- Verify with browser network and storage tools that user content is neither transmitted nor persisted.

## Dependencies and licenses

- Pin dependencies through `package-lock.json` and review licenses before adoption.
- Keep the root MIT `LICENSE` for Croppa and maintain `THIRD_PARTY_NOTICES.md` for material runtime libraries, OCR data, and translation models.
- Preserve required upstream notices. Do not copy a full license header into every Croppa source file unless legally required.
- Do not commit downloaded model weights, generated builds, private acceptance samples, or local caches.

## Git workflow

- Keep commits small and milestone-oriented with imperative messages.
- Before committing or pushing, inspect the staged diff, scan for secrets and captured test content, and run the relevant quality gates.
- Never push a change that violates the privacy invariants even if the feature otherwise works.
