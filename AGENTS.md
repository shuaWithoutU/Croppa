# Croppa Project Instructions

These instructions extend `D:/PersonalProjects/AGENTS.md` for work inside the Croppa repository. Direct user instructions and the approved product requirements take precedence.

## Product source of truth

- Treat `docs/PRD.md` as the product source of truth. Do not silently expand MVP scope.
- Keep Simplified Chinese to English as the required MVP language direction. Japanese, Korean, full-viewport translation, browser-store publishing, and other operating systems remain post-MVP unless the PRD is explicitly revised.
- Prefer the smallest change that advances the current PRD milestone.
- Update the PRD decision log when an approved product or architecture decision materially changes.

## Incremental delivery and review

- Split work into small, reviewable stages aligned with the current PRD milestone. Do not attempt an entire multi-stage feature in one response by default.
- At the end of each stage, report the behavior implemented, files changed, checks run, and any open decisions, then wait for Shua's review and confirmation before continuing.
- Continue without a review checkpoint only when Shua explicitly asks for uninterrupted, autonomous, or end-to-end work.
- Leave each stage buildable and internally coherent whenever practical; finish an in-progress atomic change before pausing if stopping would leave the repository broken.

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

## UI and UX preferences and patterns

- Use a minimalist utility style inspired by the Windows Snipping Tool: compact controls, clear labels, restrained decoration, and no unnecessary screens or persistent chrome.
- Preserve the direct interaction pattern: toolbar button or shortcut, drag one region, show a local processing state, then replace the selected text with an English overlay.
- Render the result as a solid, opaque card over the selected region. Do not use transparency or attempt to reconstruct the original background.
- Keep result actions predictable and ordered as Copy, Edit source, Retry, and Close unless the PRD changes. Make the primary action visually clear without overpowering the translation.
- Follow the operating system's light/dark preference and reduced-motion preference. Use a restrained accent color and maintain consistent spacing, radii, typography, focus treatment, and status feedback across extension surfaces.
- Keep selection, processing, success, and error feedback close to the selected region so the user does not lose context.
- Keep all controls after region selection keyboard operable, visibly focused, properly labelled, and readable at WCAG 2.2 AA contrast.
- Errors must be concise and actionable. Never expose stack traces or captured content to users.
- Isolate injected UI from webpage styles and scripts with Shadow DOM, while keeping the popup and options pages visually consistent with the in-page overlay.

## Function comments

- Add a concise TSDoc or JSDoc comment immediately before important functions, including extension entry points, cross-context message handlers, capture and cleanup operations, privacy-sensitive storage logic, OCR/translation orchestration, and non-obvious geometry or state-management code.
- Describe the function's purpose and, when relevant, its inputs, output, side effects, invariants, lifecycle expectations, or important tradeoffs.
- Do not add comments that merely repeat the function name or narrate straightforward implementation details. Small self-explanatory helpers do not require comments.

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
- Before every commit, recommend one or more concise messages for the staged change and ask Shua to choose or approve the exact message. Never commit until a message is explicitly approved; a message Shua supplies with the commit instruction counts as approval.
- Before committing or pushing, inspect the staged diff, scan for secrets and captured test content, and run the relevant quality gates.
- Never push a change that violates the privacy invariants even if the feature otherwise works.
