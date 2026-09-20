# Croppa Product Requirements Document

## 1. Document control

| Field | Value |
|---|---|
| Product | Croppa |
| Version | 0.1 |
| Status | Draft for final approval |
| Date | 2026-09-20 |
| Product owner | Shua |
| Contributors | Shua, Codex |
| Approver | Shua |
| Repository target | Public GitHub repository |
| Project location | `D:/PersonalProjects/Croppa` |

### Revision history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-20 | Initial PRD based on the approved discovery summary. |

## 2. Executive summary

Croppa is a zero-cost Chromium browser extension for translating text found inside images and visually rendered web content. A user starts capture from the extension toolbar or an assigned browser shortcut, drags over one text region, and receives a natural English translation displayed in a solid card over the selected area.

The MVP targets Simplified Chinese source text on Windows 10/11 in Opera GX and Google Chrome. It must support horizontal and vertical printed text, individual words, and longer phrases or sentences. Users can correct OCR mistakes, retry processing, copy the English translation, or close the overlay.

Croppa will perform OCR and translation locally after downloading the necessary open-source models. Captured images, recognized text, and translations must not be uploaded or retained. The project will have no backend, accounts, paid APIs, analytics, or translation history. It will be published as a public GitHub portfolio repository and distributed initially as an unpacked extension.

## 3. Background and problem statement

Chinese text in manga, images, and visually rendered website content cannot always be selected and passed directly to ordinary browser translation tools. The current workaround typically requires taking a screenshot, opening another OCR or translation service, uploading or pasting the image, copying extracted text, translating it, and returning to the original page. This interrupts reading and may expose captured content to external services.

Croppa should shorten this workflow to one selection gesture and display the translated result in context. The project also serves as a portfolio demonstration of browser-extension development, client-side OCR and machine translation, privacy-aware design, and testing across Chromium-based browsers.

No formal user research or competing-product comparison has been completed. The initial need comes from the product owner's recurring experience reading Chinese manga and websites.

## 4. Product vision and value proposition

Croppa should make image-based language barriers feel temporary: select text, wait briefly, and continue reading without leaving the page.

The MVP value proposition is:

> Translate a Chinese speech bubble or visual text region into natural English directly on the page, without uploading the capture or paying for a translation service.

The long-term vision is to detect and replace every supported text region in the visible browser viewport while preserving each region's position. Japanese and Korean translation may be added after the Chinese-to-English workflow is reliable.

## 5. Goals and success metrics

### Product outcomes

| Goal | Metric | Baseline | MVP target | Measurement method | Window | Owner |
|---|---|---:|---:|---|---|---|
| Make visual Chinese text understandable | Clear samples producing understandable English without manual OCR correction | No Croppa workflow | At least 16 of 20 samples | Product-owner review of the representative acceptance set | Before MVP release | Shua |
| Reduce translation workflow friction | Required user actions from initiation to visible result | Multi-application manual workflow | Start capture, select region, receive result | End-to-end usability test | Before MVP release | Shua |
| Keep processing responsive | Time from completed selection to translated overlay after models are ready | Not available | Target 2-3 seconds; documented rather than release-blocking for MVP | Timed test on the primary development computer | Before MVP release | Shua |
| Protect captured content | Captures or extracted text transmitted or retained | Not available | Zero transmissions and zero retained session content | Network inspection and storage inspection | Every release | Shua |
| Remain free to use | Required paid services or subscriptions | Not available | None | Dependency and runtime review | Every release | Shua |

### Operational health metrics

| Metric | MVP target |
|---|---|
| Successful capture initiation on supported ordinary web pages | 100% in the supported-page test set |
| Clear user-facing handling of restricted or unsupported pages | 100% of tested restricted-page cases |
| Unhandled errors during the 20-sample acceptance run | 0 |
| Accessibility checks on Croppa controls | No known critical keyboard, focus, label, or contrast failures |

Performance and translation quality depend on the selected models, source image, and client hardware. The feasibility milestone must establish realistic reference measurements before the release candidate.

## 6. Non-goals

The following are explicitly outside the MVP:

- Translating English into Chinese.
- Guaranteed Japanese or Korean support.
- Detecting and translating every text region in the visible viewport.
- Capturing content outside the active browser tab.
- Capturing an entire scrolling webpage in one operation.
- Reconstructing artwork or backgrounds behind translated text.
- Preserving the visual typography of the source text.
- Handwriting recognition guarantees.
- Reliable recognition of highly stylized, distorted, very small, or low-resolution text.
- Saving screenshots or translated images.
- Translation history, bookmarks, synchronization, accounts, or cloud storage.
- A hosted backend or database.
- Paid OCR or translation services.
- Guaranteed offline operation.
- Mobile browser support.
- Formal support outside Windows 10/11.
- Browser-store publication in the initial release.

## 7. Users and stakeholders

### Primary user

The initial user is a desktop reader who encounters Simplified Chinese in manga, images, or website content and wants an English translation without interrupting the reading flow. The user is comfortable installing an unpacked extension and has an internet connection for first-time model downloads.

### User needs

- Initiate capture without leaving the current page.
- Select the exact text region to translate.
- Understand words, phrases, and dialogue written horizontally or vertically.
- Correct recognition mistakes without repeating the full capture workflow.
- Copy the English result when needed.
- Know when Croppa is processing, unavailable, or unsuccessful.
- Trust that captured content remains private.

### Stakeholders and decision ownership

| Stakeholder | Role |
|---|---|
| Shua | Product owner, developer, primary tester, final approver, and maintainer |
| Portfolio viewers | Secondary audience evaluating project quality and engineering decisions |
| Open-source users | Possible future users and contributors; not required for initial validation |

## 8. Assumptions, dependencies, and constraints

### Confirmed constraints

- The implementation must use TypeScript, React, Vite, and Chromium Manifest V3.
- The initial supported browsers are current Opera GX and Google Chrome desktop on Windows 10/11.
- The MVP must not require paid services, a backend, a database, or user accounts.
- Captures and derived text must remain on the device.
- Models may be downloaded from a trusted model host and cached locally.
- The product must be usable from the toolbar and support a browser-managed keyboard command.
- The project should be completed as soon as practical, with MVP scope favored over optional capabilities.

### Assumptions requiring validation

- A Tesseract.js-based pipeline can recognize representative horizontal and vertical Simplified Chinese accurately enough.
- A browser-compatible open-source translation model can produce useful natural English within acceptable download, memory, and latency limits.
- Required workers, WebAssembly modules, and model assets can operate within Manifest V3 and browser content-security restrictions.
- Opera GX supports every Chromium extension API used by the chosen implementation.
- Running OCR and translation locally will be practical on the primary development computer.
- Remote model assets can be treated strictly as data and distributed in a way compatible with browser-extension policies and their licenses.

### External dependencies

- Chromium extension APIs for toolbar actions, active-tab capture, scripting, storage, downloads or model retrieval, and commands.
- Tesseract.js or another approved browser-local OCR library.
- One or more OCR language-data files.
- Transformers.js or another approved browser-local translation runtime.
- A compatible Simplified Chinese-to-English translation model.
- A trusted model host such as Hugging Face for first-use downloads, unless model assets are bundled later.

## 9. User journeys and use cases

### UJ-001: First-time model setup

- **Actor:** First-time user
- **Trigger:** The user opens Croppa or starts the first capture.
- **Prerequisites:** Croppa is installed and an internet connection is available.
- **Main flow:**
  1. Croppa explains that local OCR and translation models are required.
  2. Croppa displays the expected download size before download where it can be determined.
  3. The user starts the download.
  4. Croppa displays progress and current status.
  5. Croppa validates and caches the model assets.
  6. Croppa reports readiness and allows capture.
- **Alternate flows:** The user cancels; a request fails; storage is insufficient; an asset is invalid; initialization fails.
- **Successful outcome:** Required models are ready without uploading user content.

### UJ-002: Translate a text region

- **Actor:** Reader
- **Trigger:** The user clicks the toolbar button or invokes the configured browser shortcut.
- **Prerequisites:** The active page permits extension capture and required models are ready.
- **Main flow:**
  1. Croppa enters selection mode and changes the pointer appropriately.
  2. The user drags a rectangle around one speech bubble or text region.
  3. Croppa captures and crops the selected area.
  4. Croppa shows a processing state over or near the selection.
  5. OCR extracts Simplified Chinese in the appropriate reading orientation.
  6. The translation pipeline generates natural English.
  7. Croppa places a solid result card over the selected rectangle.
- **Alternate flows:** The selection is too small; the user cancels; no text is recognized; processing times out; translation fails.
- **Successful outcome:** Understandable English appears without navigating away.

### UJ-003: Correct recognized text

- **Actor:** Reader
- **Trigger:** The displayed translation appears incorrect or the user selects **Edit source**.
- **Prerequisites:** A result overlay exists.
- **Main flow:**
  1. Croppa reveals the recognized source text in an editable control.
  2. The user corrects the Simplified Chinese text.
  3. The user submits the correction.
  4. Croppa translates the corrected text without repeating OCR.
  5. The result card updates.
- **Successful outcome:** The user can recover from OCR errors without taking another snip.

### UJ-004: Use or dismiss a result

- **Actor:** Reader
- **Trigger:** A result overlay is visible.
- **Main flow:** The user copies the English translation, retries processing, edits the source, or closes the card.
- **Successful outcome:** Copy places only English text on the clipboard; close removes the overlay and all ephemeral session data.

### UJ-005: Handle an unsupported page or failure

- **Actor:** Reader
- **Trigger:** Capture is requested where browser security restrictions prevent it, or a processing dependency fails.
- **Main flow:** Croppa stops safely, provides a concise actionable message, and offers retry where meaningful.
- **Successful outcome:** No silent failure, stuck selection layer, leaked data, or broken page interaction remains.

### UJ-006: Configure capture shortcut

- **Actor:** Reader
- **Trigger:** The user opens Croppa settings and chooses shortcut configuration.
- **Main flow:** Croppa explains or links to the browser-managed extension-shortcut interface.
- **Successful outcome:** The user understands how to assign or change the capture command.

## 10. Scope and prioritization

### MVP in scope

- First-run local model acquisition and readiness state.
- Toolbar-initiated rectangular selection.
- Browser-configurable capture command.
- Active visible-tab capture and region cropping.
- Horizontal and vertical Simplified Chinese OCR.
- Local Simplified Chinese-to-natural-English translation.
- Solid replacement card aligned to the selection.
- Processing, success, empty, and error states.
- Copy English, edit source, retry, and close actions.
- Automatic system light/dark theming.
- Keyboard-accessible Croppa controls and minimum accessibility support.
- Minimum browser permissions and local-only session processing.
- Opera GX and Chrome validation on Windows.
- Public documentation and unpacked distribution through GitHub.

### Prioritization

| Capability | Priority | Rationale |
|---|---|---|
| Single-region capture | Must | Core interaction |
| Simplified Chinese OCR | Must | Core source language |
| Chinese-to-English translation | Must | Core outcome |
| Horizontal and vertical text | Must | Required for manga and websites |
| Local processing and zero content upload | Must | Privacy and zero-cost promise |
| Replacement result card | Must | Keeps translation in reading context |
| Edit, retry, copy, and close | Must | Required recovery and utility actions |
| Opera GX and Chrome support | Must | Selected browsers |
| First-use model experience | Must | Required by local inference architecture |
| Keyboard command | Should | Faster repeated use; browser manages assignment |
| Japanese support | Should | Desired next language if feasibility is favorable |
| Korean support | Could | Desired later language |
| Full-viewport multi-region translation | Could | Long-term product goal, too complex for MVP |
| Browser-store publishing | Won't for MVP | Not required and may introduce fees or review work |
| Saved images and history | Won't for MVP | No demonstrated need and conflicts with data minimization |

## 11. Functional requirements

### Capture and selection

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-001 | Must | Croppa must expose a toolbar action that starts selection mode on the active supported tab. | Given a supported active page, when the toolbar action is invoked, then a selection layer appears without navigating or reloading the page. |
| FR-002 | Should | Croppa must define a browser extension command for starting selection mode. | Given an assigned shortcut, when it is invoked on a supported page, then the same selection flow as FR-001 begins. |
| FR-003 | Must | Selection mode must allow the user to drag a rectangular region within the visible viewport. | Given selection mode, when the user drags and releases over a valid area, then Croppa records the rectangle accurately relative to the captured viewport. |
| FR-004 | Must | The user must be able to cancel selection without processing. | Given selection mode, when the user presses Escape or uses the cancel interaction, then the layer is removed and no capture is retained. |
| FR-005 | Must | Croppa must reject or safely handle an empty or impractically small selection. | Given an invalid selection, when the pointer is released, then Croppa shows concise guidance or returns to selection without invoking OCR. |
| FR-006 | Must | Croppa must capture only the selected portion of the currently visible active tab. | Network and storage inspection must show that the cropped image remains local and is released after the session ends. |

### Model setup and readiness

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-007 | Must | Croppa must detect whether required OCR and translation assets are ready before processing. | When an asset is absent or invalid, capture processing does not begin silently; setup or repair guidance is shown. |
| FR-008 | Must | Croppa must disclose the expected model download and display progress where the underlying APIs expose it. | A first-time user sees purpose, size or an explicit unknown-size notice, status, and completion or failure. |
| FR-009 | Must | The user must be able to cancel or retry a failed model download. | Cancellation stops pending work where technically possible; retry starts a clean recovery attempt. |
| FR-010 | Must | Successfully acquired models must be cached locally when supported. | Restarting the browser does not require a repeat download when the cache remains valid. |

### OCR and translation

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-011 | Must | Croppa must recognize printed Simplified Chinese from the selected image. | The approved acceptance set meets the quality target in Section 5. |
| FR-012 | Must | Croppa must process both horizontal and vertical source text. | The acceptance set contains both orientations and completes without an orientation-specific crash or unusable output. |
| FR-013 | Must | Croppa must support a single word, phrase, or multi-line sentence within one selected region. | Each content length appears in the acceptance set and returns an English result or a clear recognition error. |
| FR-014 | Must | Croppa must translate recognized Simplified Chinese into natural English locally. | Runtime network inspection shows no source image or text sent to a translation service. |
| FR-015 | Must | Croppa must preserve meaning, names, punctuation intent, and dialogue tone as far as the selected model permits. | Product-owner review classifies at least 16 of 20 clear samples as understandable without source correction. |
| FR-016 | Must | Croppa must show an explicit no-text or processing-failure state rather than an empty translation card. | A blank and an unreadable sample each produce actionable feedback. |

### Results and recovery

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-017 | Must | Croppa must show a processing indicator associated with the selected region. | From selection completion until result or failure, visible feedback communicates that work is active. |
| FR-018 | Must | Croppa must render the English result in an opaque card covering the selected rectangle. | The result is positioned over the source region, has no transparency, and remains readable in both themes. |
| FR-019 | Must | The result card must provide Copy, Edit source, Retry, and Close actions. | Each action is visible or keyboard discoverable and performs the behavior defined in this PRD. |
| FR-020 | Must | Copy must place only the English translation on the clipboard and give brief success feedback. | Pasting after Copy yields the displayed English text without labels or source text. |
| FR-021 | Must | Edit source must allow correction of the OCR text and retranslate without a new capture. | Submitting edited source updates the translation and leaves the chosen selection region intact. |
| FR-022 | Must | Retry must repeat applicable processing for the current selection. | A retry replaces the previous status/result and does not create overlapping cards. |
| FR-023 | Must | Close must remove the card and release capture, OCR, and translation session data. | The page returns to its prior interactive state and no session content remains in extension storage. |
| FR-024 | Must | Croppa must keep at most one active selection/result session per tab in the MVP. | Starting a new capture closes or replaces the previous Croppa session predictably. |

### Settings and failure handling

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-025 | Must | Croppa must follow the operating system or browser light/dark preference automatically. | Changing the relevant system preference changes Croppa's theme on the next supported update without losing settings. |
| FR-026 | Should | Croppa settings must explain how to assign the browser-managed keyboard command. | A user can reach or follow browser-specific instructions without searching the project source. |
| FR-027 | Must | Croppa must detect and explain unsupported or restricted pages. | Tested browser-internal, extension-store, or otherwise blocked pages produce a clear message with no stuck overlay. |
| FR-028 | Must | Croppa must provide actionable states for model, OCR, translation, permission, clipboard, and unexpected failures. | Each simulated failure is distinguishable and provides retry, correction, or dismissal where appropriate. |
| FR-029 | Must | Croppa must persist only settings and approved cached model assets. | Storage inspection after closing all overlays finds no screenshots, recognized source text, or translations. |

## 12. UX and UI requirements

### Design direction

- Minimal, utility-focused, and visually similar in spirit to the standard Windows Snipping Tool without copying protected branding or assets.
- Automatic light and dark themes using system-level preferences.
- Compact controls, clear status language, restrained motion, and no decorative elements that slow the capture workflow.
- Croppa's controls must remain distinguishable from the underlying webpage.

### Screen and state inventory

1. **Toolbar popup:** Readiness, primary Start capture button, model/setup status, settings access, and brief error/status messaging.
2. **First-run setup:** Privacy explanation, model purpose, download information, progress, cancel, retry, and ready state.
3. **Selection layer:** Crosshair pointer, dimmed or clearly bounded selection state, selection rectangle, and cancel affordance.
4. **Processing state:** Compact indicator over or next to the selected region.
5. **Result card:** English translation with Copy, Edit source, Retry, and Close.
6. **Source editor:** Recognized Simplified Chinese, editable without losing the selection, with submit and cancel controls.
7. **Settings/help:** Shortcut instructions, privacy explanation, model/cache information, version, and links to documentation.
8. **Error state:** Concise explanation and the most relevant recovery action.

### Interaction requirements

- Starting capture must not permanently alter page content.
- Escape must cancel selection and close transient Croppa dialogs where doing so is safe.
- The replacement card must be anchored to the selected page coordinates and handle scrolling or viewport changes predictably. The implementation may close or reposition the card; it must not drift silently over unrelated content.
- If the translated text does not fit inside the original rectangle, the card may enforce a practical minimum size, expand within the viewport, or provide internal scrolling. The chosen behavior must keep controls usable.
- Croppa must not attempt image inpainting or background reconstruction in the MVP.
- Error messages must explain the next action instead of exposing raw stack traces.

### Accessibility

- All Croppa actions must be keyboard operable after the capture rectangle has been created.
- Interactive elements must have visible focus indicators and accessible names.
- Text and controls must meet WCAG 2.2 AA contrast targets where applicable.
- Status changes must be exposed to assistive technology when technically applicable.
- Motion must be minimal and respect reduced-motion preferences.
- Color must not be the only way status or error meaning is conveyed.

### Localization

The Croppa interface and generated output are English-only for the MVP. Source text is Simplified Chinese. UI localization is post-MVP.

## 13. Data requirements and conceptual model

Croppa has no server-side data model. The conceptual client-side entities are:

| Entity | Contents | Persistence |
|---|---|---|
| `UserSettings` | Theme mode behavior, setup completion, language configuration, and non-sensitive UI preferences | Local extension storage |
| `ModelMetadata` | Model identifiers, versions, readiness, cache references, size, and license metadata | Local extension storage/cache |
| `CaptureSession` | Tab identifier, viewport information, selection rectangle, and transient cropped image | Memory only; delete on close/failure/replacement |
| `OCRResult` | Recognized source text, confidence data if available, orientation, and user correction | Memory only |
| `TranslationResult` | English result and transient processing status | Memory only |

### Data rules

- Captured images, recognized text, corrected text, and translations must never be written to persistent extension storage.
- Closing, replacing, cancelling, or failing a session must release its transient content.
- Model files and non-sensitive settings may persist.
- The MVP has no import, export, synchronization, migration, or audit-log requirement.
- A future cache-clearing option may remove model files and reset readiness; exact UX is an open decision.

### Privacy classification

Captures and derived text are potentially sensitive user content even though Croppa does not know their meaning. They must be treated as confidential transient data. Settings and model metadata are non-sensitive unless future functionality changes their contents.

## 14. Integrations and external interfaces

| Integration | Purpose | Data sent | Authentication | Failure behavior | Cost and privacy |
|---|---|---|---|---|---|
| Chromium extension APIs | Toolbar, active-tab capture, content injection, storage, commands, and clipboard-related behavior | Only browser-internal data necessary for the action | Browser-managed extension permissions | Explain unsupported pages or missing permissions | No service fee; request minimum permissions |
| OCR runtime and language data | Convert the cropped image to Simplified Chinese text | Image remains within the extension runtime | None | Show no-text or OCR failure with retry/edit options | Open-source; license must be reviewed |
| Translation runtime and model | Convert source text to natural English | Text remains within the extension runtime | None | Show translation failure and retry/edit options | Open-source; license and model size must be reviewed |
| Trusted model host | Download model assets | Standard asset request metadata; no captures or extracted text | Normally none | Show download status and retry; never fall back to uploading content | Must remain free and have acceptable terms |
| GitHub | Source repository, documentation, issues, and release packages | Project materials only | Maintainer account for publishing | Local build remains usable if GitHub is unavailable | Public repository; no runtime dependency for installed use after setup |

No external OCR, translation, analytics, advertising, identity, payment, email, or database service is permitted in the MVP.

## 15. Technical context and architecture constraints

### Confirmed technology constraints

- TypeScript
- React for extension user interfaces
- Vite-based build tooling
- Chromium Manifest V3
- Current Opera GX and Google Chrome desktop
- Windows 10/11 as the formally tested operating systems
- Client-side OCR and translation
- No backend or database
- No Docker requirement because Croppa is distributed as a native browser-extension package

### High-level component boundaries

The implementation is expected to separate:

- toolbar popup and settings UI;
- background/service-worker coordination;
- content-script selection and overlay UI;
- visible-tab capture and image cropping;
- OCR worker/runtime;
- translation worker/runtime;
- model acquisition and cache management;
- ephemeral session state;
- persistent non-sensitive settings;
- typed browser-compatibility adapters where Opera and Chrome differ.

This is context rather than a fixed code architecture. The technical feasibility milestone may revise component placement to satisfy Manifest V3 lifecycle, content-security, memory, and worker constraints without changing product behavior.

### Dependency and licensing rules

- Croppa will use the MIT License through a root `LICENSE` file created during project scaffolding.
- A `THIRD_PARTY_NOTICES.md` file must list material runtime dependencies, model assets, authorship, source, version, and license obligations.
- Required copyright and license notices must be preserved.
- Full license headers do not need to be copied into every Croppa source file unless a dependency, copied file, or chosen project convention requires it.
- Any dependency or model whose license prevents public portfolio distribution must be rejected or replaced.
- Runtime library code must be packaged in compliance with Manifest V3 remote-code restrictions. Model data handling must be reviewed separately.

## 16. Non-functional requirements

| ID | Category | Requirement and threshold |
|---|---|---|
| NFR-001 | Performance | After required models are loaded, Croppa should target a translated overlay within 3 seconds for a representative single-region sample on the primary development computer. Missing the target is documented and investigated but is not automatically release-blocking for MVP. |
| NFR-002 | Responsiveness | The page and Croppa controls must remain responsive enough to cancel or close during ordinary processing; expensive work should not block the page's main thread where worker execution is feasible. |
| NFR-003 | Privacy | Zero captured images, recognized text, corrected text, or translations may be transmitted to any external service. |
| NFR-004 | Retention | Session content must be removed from Croppa-controlled storage and memory references when the session closes, is cancelled, fails terminally, or is replaced. |
| NFR-005 | Cost | Core installation and use must require no paid API, subscription, hosted backend, or browser-store purchase. Internet and hardware costs are outside product scope. |
| NFR-006 | Compatibility | All Must-priority workflows must pass on current stable Chrome and the installed current Opera GX version on Windows 10/11 at release time. Exact tested versions must be recorded in release notes. |
| NFR-007 | Accessibility | Croppa UI must have no known critical keyboard, focus, accessible-name, or WCAG 2.2 AA contrast failure at release. The free-form drag gesture may use a pointer; equivalent exact keyboard region drawing is not required for MVP. |
| NFR-008 | Reliability | A failed capture, OCR, translation, or model request must not leave an uncancellable selection layer, duplicate overlay, or permanently modified page state. |
| NFR-009 | Security | Croppa must request only permissions justified by an implemented feature and must not use dynamic remote executable code. |
| NFR-010 | Maintainability | Formatting, linting, type checking, unit tests, and production build commands must be automated and documented. |
| NFR-011 | Observability | User-facing errors and optional local development logs must support diagnosis without storing or printing captured content or recognized/translated text by default. |
| NFR-012 | Model transparency | Before first download, Croppa must state that models are downloaded locally and disclose known size, source, and license through the UI or linked documentation. |
| NFR-013 | Storage | Croppa must detect and report model-storage failures without repeatedly downloading in a loop. |
| NFR-014 | Recovery | Retrying a failed operation must not require reinstalling the extension unless local assets are irrecoverably invalid; repair/reset instructions must exist for that case. |

## 17. Security, privacy, and compliance

### Trust boundaries

- **Untrusted webpage:** Page DOM, scripts, styles, images, and text must be treated as hostile input.
- **Content script:** May interact with the page only through a minimal, isolated interface.
- **Extension runtime:** Coordinates capture and processing; messages must be validated.
- **Local model runtime:** Receives only the cropped image or extracted text needed for the active request.
- **Model host:** Receives only normal model-asset download requests, never captured or derived user content.

### Required controls

- Use minimum extension permissions and prefer temporary active-tab access when feasible.
- Validate all messages and structured data crossing extension contexts.
- Never inject source or translated text as unsanitized HTML.
- Prevent webpage CSS from making Croppa controls unreadable or deceptively repositioned where practical, for example through isolated styles or Shadow DOM.
- Package executable JavaScript and WebAssembly as required by Manifest V3 and store policy; do not execute remotely fetched scripts.
- Do not hard-code credentials because the MVP requires none.
- Do not log capture pixels, source text, corrected text, or translations.
- Clear transient object URLs, image buffers, canvases, and worker messages when no longer needed.
- Document requested permissions and their purposes in the README.
- Run dependency vulnerability and license checks before release.

### Privacy behavior

- No analytics, advertising, telemetry, accounts, or content upload.
- No translation history or saved screenshots.
- Local model and settings storage must be described transparently.
- Uninstalling the extension should remove browser-managed extension storage according to browser behavior; manual model-cache clearing guidance must be documented if needed.

No specific regulated-data compliance regime is claimed. The local-only architecture minimizes exposure but does not certify Croppa for medical, legal, financial, or other regulated content.

## 18. Analytics and observability

Croppa will not collect product analytics or remote telemetry in the MVP.

### Local operational feedback

- User-visible setup, processing, success, and failure states.
- Development-only logs for state transitions, timing, and error categories.
- Logs must redact or omit capture contents and source/translated text.
- Production logs should be minimal and ephemeral.

### Success measurement

- A manually maintained 20-sample acceptance report will record orientation, source type, OCR correction required, translation judged understandable, processing time, browser, and relevant notes.
- Performance measurements will start after model readiness and end when the result card becomes usable.
- Portfolio-level success will be documented through the completed public repository, working demonstration, and reproducible setup instructions rather than user tracking.

## 19. Testing and acceptance strategy

### Automated testing

- Unit tests for rectangle calculations, viewport scaling, state transitions, text sanitization, storage rules, error mapping, and model-readiness logic.
- Component tests for popup, first-run setup, processing state, result card, source editor, settings, and error states.
- Integration tests using mocked browser APIs for capture orchestration, message validation, retry, close, and cleanup behavior.
- Tests must not require production credentials or paid services.

### Manual and end-to-end testing

- Load the unpacked production build in current Chrome and Opera GX.
- Test toolbar and configured-shortcut initiation.
- Test selection at different viewport positions, zoom levels, and scroll positions.
- Test horizontal and vertical Simplified Chinese.
- Test words, phrases, multi-line dialogue, no-text regions, and known difficult samples.
- Test editing recognized text and translating the correction.
- Test Copy, Retry, Close, Escape, repeated capture, and page navigation.
- Test light, dark, high-contrast-relevant conditions, keyboard navigation, focus visibility, labels, and reduced motion.
- Test first download, cancellation, network interruption, retry, corrupted/missing cache, and insufficient storage where practical.
- Test restricted pages and permission failures.
- Inspect network traffic to confirm no content upload.
- Inspect extension storage to confirm no session-content retention.

### Representative acceptance set

- At least 20 samples supplied or approved by Shua later.
- Include both website imagery and manga-style content.
- Include both horizontal and vertical Simplified Chinese.
- Use content that can legally remain private for local tests or be included in the repository when redistributable.
- At least 16 of 20 clear samples must produce understandable English without manual OCR correction.
- Known hard samples may be retained to document limitations and guide later improvements.

### Release gates

- Formatter, linter, type checker, automated tests, and production build pass.
- Must-priority functional requirements pass or have an explicitly approved exception.
- Chrome and Opera GX manual smoke tests pass.
- Privacy network/storage checks pass with no exceptions.
- No known critical security or accessibility issue remains.
- README, privacy explanation, third-party notices, and installation instructions are current.

## 20. Release and operational plan

### Environments

- **Development:** Vite-based local build with unpacked extension reload.
- **Test:** Production-mode unpacked build in clean or representative Chrome and Opera GX profiles.
- **Release:** Versioned archive and source tag on GitHub.

### Initial distribution

- Public GitHub repository.
- Documented source build process.
- Downloadable packaged release or build artifact suitable for unpacked installation.
- Step-by-step Opera GX and Chrome installation instructions.
- Browser stores are optional future channels and are not required for MVP completion.

### Release process

1. Run all automated checks and build the release package.
2. Verify required licenses, third-party notices, and model-distribution rules.
3. Load and smoke-test the exact release artifact in both supported browsers.
4. Complete the 20-sample acceptance report.
5. Review permissions, network traffic, and persistent storage.
6. Tag the version and publish release notes with tested browser versions and known limitations.
7. Retain the previous release artifact to allow manual rollback.

### Support and incidents

- GitHub Issues will be the optional public support and defect channel.
- Shua owns triage and release decisions.
- A privacy defect that uploads or retains session content is release-blocking and should trigger removal of the affected release until corrected.

## 21. Milestones and delivery plan

No fixed calendar deadline is set. Work should proceed as soon as practical while maintaining the release gates.

| Milestone | Outcome | Entry criteria | Exit criteria | Dependencies | Owner |
|---|---|---|---|---|---|
| M1: Feasibility spike | Evidence that local OCR and translation can meet an acceptable baseline | PRD approved | Models selected provisionally; horizontal/vertical samples run; download size, latency, quality, license, and browser constraints documented; go/no-go decision made | Sample inputs and candidate models | Shua |
| M2: Capture foundation | Reliable single-region capture in Chrome and Opera GX | M1 go decision | Toolbar capture, rectangle selection, cancellation, crop accuracy, and unsupported-page handling demonstrated | Chromium APIs | Shua |
| M3: Translation MVP | End-to-end capture-to-English result | M2 complete | OCR, translation, processing state, and solid replacement card work for representative samples | OCR and translation runtimes | Shua |
| M4: Recovery and polish | Usable and accessible workflow | M3 complete | Edit, retry, copy, close, theming, first-run setup, errors, cleanup, and accessibility requirements implemented | UI design and storage behavior | Shua |
| M5: Cross-browser validation | Release candidate validated | M4 complete | Automated checks and Chrome/Opera acceptance runs pass; privacy and permission checks pass | Test dataset | Shua |
| M6: Portfolio release | Public, reproducible project | M5 complete | Documentation, licensing, notices, package, screenshots/demo, tag, and GitHub release published | GitHub access and approved visibility | Shua |

Optional language and full-viewport work begins only after the MVP release unless M1 shows it can be included with negligible scope and risk.

## 22. Risks and mitigations

| Risk | Category | Likelihood | Impact | Mitigation | Contingency or trigger | Owner |
|---|---|---:|---:|---|---|---|
| Vertical or stylized text has poor OCR accuracy | Product/ML | High | High | Test early with representative samples; evaluate preprocessing and orientation settings | If acceptance target is unreachable, narrow documented font/background support while retaining manual correction | Shua |
| Translation model is too large or slow | Technical/UX | Medium | High | Compare quantized browser-compatible candidates during M1 | Choose a smaller model, accept documented latency, or reconsider a user-supplied free service only through a new approved PRD revision | Shua |
| Model output is unnatural or inaccurate | Product/ML | Medium | High | Use natural-English evaluation samples and retain source editing | Document limitations or replace the model before release | Shua |
| Opera GX lacks a required Chromium behavior | Compatibility | Medium | High | Test every architectural spike in both browsers from M1 onward | Add an adapter, narrow the affected capability, or make Chrome the temporary reference browser with explicit approval | Shua |
| Manifest V3 worker lifecycle interrupts processing | Technical | Medium | High | Design resumable state transitions and test long model operations early | Move permitted work to an extension document/worker context or revise component boundaries | Shua |
| Remote model loading violates packaging or policy expectations | Compliance | Medium | High | Review Manifest V3 remote-code rules and distinguish executable assets from model data | Bundle approved assets, document manual acquisition, or replace the model pipeline | Shua |
| Model or language-data license is incompatible with public distribution | Legal | Medium | High | Complete license review before adoption | Replace the asset; do not publish it in a release |
| Model download or storage is too large | UX/Technical | Medium | Medium | Disclose size, show progress, cache assets, and evaluate quantization | Split optional languages, require on-demand download, or choose smaller assets | Shua |
| Overlay covers artwork or does not fit translation | UX | High | Medium | Use a clear opaque card, practical minimum size, and controlled overflow | Allow repositioning or sizing in a later release if user testing shows need | Shua |
| Page navigation or scrolling misaligns the overlay | UX/Technical | Medium | Medium | Define explicit close/reposition behavior and test layout changes | Close the active result safely when reliable repositioning is unavailable | Shua |
| Test data cannot be redistributed | Legal | Medium | Medium | Keep private test samples out of Git and include only owned or redistributable fixtures | Publish aggregate results without the restricted samples | Shua |
| Page content interferes with Croppa UI | Security/UX | Medium | Medium | Isolate DOM and styling; sanitize all rendered text | Close safely and report unsupported conflicts | Shua |

## 23. Open questions and deferred decisions

| ID | Question or decision | Impact | Owner | Due point | Status |
|---|---|---|---|---|---|
| OQ-001 | Which exact OCR runtime version and Simplified Chinese language data provide the best size/quality tradeoff? | Accuracy, licensing, and download size | Shua | M1 exit | Open |
| OQ-002 | Which exact local Chinese-to-English model and runtime meet quality, license, size, and browser requirements? | Core feasibility | Shua | M1 exit | Open |
| OQ-003 | What preprocessing and orientation strategy is required for vertical manga text? | OCR quality and latency | Shua | M1 exit | Open |
| OQ-004 | What are the exact model download and installed-cache sizes? | First-run UX and storage | Shua | M1 exit | Open |
| OQ-005 | How will model assets be hosted or packaged within Manifest V3 and relevant distribution policies? | Security, compliance, and release packaging | Shua | Before M3 | Open |
| OQ-006 | What result-card overflow behavior works best for translations longer than the selected region? | Usability | Shua | Before M4 | Open |
| OQ-007 | Should scrolling reposition the overlay or close the active session? | UX consistency and implementation complexity | Shua | Before M4 | Open |
| OQ-008 | What exact current Chrome and Opera GX versions establish the first support baseline? | Reproducibility | Shua | M5 entry | Open |
| OQ-009 | Which 20 samples form the acceptance set? | Quality validation | Shua | M5 entry | Deferred; Shua will provide later |
| OQ-010 | Should a model-cache reset control be included in MVP settings? | Recovery and storage management | Shua | Before M4 | Open |
| OQ-011 | Can Japanese be added with negligible incremental model and testing cost? | Optional MVP scope | Shua | M1 exit | Open; defaults to post-MVP |
| OQ-012 | Can Korean be added with negligible incremental model and testing cost? | Optional MVP scope | Shua | M1 exit | Open; defaults to post-MVP |

Open technical questions do not authorize silent scope expansion. Decisions that change privacy, cost, supported languages, core UX, or distribution require PRD review and approval.

## 24. Requirement traceability

| Goal | Supporting journeys | Functional requirements | Non-functional requirements |
|---|---|---|---|
| Understand visual Chinese text | UJ-002, UJ-003 | FR-011 through FR-016, FR-021 | NFR-001, NFR-002, NFR-006 |
| Reduce workflow friction | UJ-002, UJ-004, UJ-006 | FR-001 through FR-006, FR-017 through FR-026 | NFR-001, NFR-007, NFR-008 |
| Keep captured content private | UJ-001 through UJ-005 | FR-006, FR-010, FR-014, FR-023, FR-029 | NFR-003, NFR-004, NFR-009, NFR-011 |
| Remain free to use | UJ-001, UJ-002 | FR-007 through FR-016 | NFR-005, NFR-012, NFR-013 |
| Operate reliably in selected browsers | UJ-001, UJ-002, UJ-005, UJ-006 | FR-001 through FR-029 | NFR-006, NFR-008, NFR-010, NFR-014 |

No MVP requirement is intentionally orphaned from the product goals. Japanese, Korean, and full-viewport functionality are roadmap items rather than MVP requirements.

## 25. Definition of done

### Feature complete

- [ ] Every Must-priority functional requirement is implemented or has an approved exception.
- [ ] Relevant automated tests cover normal, error, retry, cancellation, and cleanup behavior.
- [ ] No session content is persisted or sent externally.
- [ ] User-facing states and errors are complete.
- [ ] Documentation is updated for changed behavior.

### MVP ready

- [ ] M1 feasibility findings support proceeding with the selected models.
- [ ] The end-to-end workflow works in Chrome and Opera GX on Windows.
- [ ] Horizontal and vertical Simplified Chinese are covered.
- [ ] The 20-sample acceptance set meets the 16-of-20 target.
- [ ] Copy, Edit source, Retry, Close, and cancellation behave correctly.
- [ ] First-run download, progress, failure, and retry behavior are verified.
- [ ] Required accessibility and automatic-theme checks pass.
- [ ] All automated validation and production builds pass.

### Release ready

- [ ] Privacy network and storage inspections pass.
- [ ] Minimum permissions are documented and justified.
- [ ] Dependency vulnerability and license reviews pass.
- [ ] Root MIT `LICENSE` and `THIRD_PARTY_NOTICES.md` are complete.
- [ ] README includes purpose, limitations, setup, build, test, installation, privacy, and troubleshooting guidance.
- [ ] The exact release artifact passes Chrome and Opera GX smoke tests.
- [ ] Tested versions and known limitations are recorded.
- [ ] Public GitHub visibility is confirmed before the first push.
- [ ] The repository contains no secrets, private test data, or unintended artifacts.

### Post-launch validation complete

- [ ] GitHub installation instructions work from a clean checkout or release download.
- [ ] Reported privacy or data-retention defects are treated as release-blocking.
- [ ] Initial issues are triaged and roadmap requests are kept outside MVP unless approved.
- [ ] Japanese, Korean, full-viewport translation, and store publishing are reconsidered using MVP evidence.

## 26. Appendix

### Glossary

- **OCR:** Optical Character Recognition; converting text pixels in an image into machine-readable text.
- **MVP:** Minimum Viable Product; the smallest release that validates Croppa's core user outcome.
- **Manifest V3:** The current Chromium browser-extension platform specification used by Croppa.
- **Visible viewport:** The portion of the active webpage currently visible in the browser tab.
- **Replacement card:** Croppa's opaque UI placed over the selected source region to display English.
- **Local processing:** Computation performed on the user's device without sending capture contents to an external service.
- **Model:** Downloaded machine-learning data used by the OCR or translation runtime.

### Research and technical references

- [Opera extension documentation](https://help.opera.com/en/extensions/)
- [Opera extension testing and unpacked installation](https://help.opera.com/en/extensions/testing/)
- [Chrome extension documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store registration](https://developer.chrome.com/docs/webstore/register)
- [Tesseract.js](https://github.com/naptha/tesseract.js/)
- [Transformers.js](https://huggingface.co/docs/transformers.js/)
- [Chrome Translator API](https://developer.chrome.com/docs/ai/translator-api)

These references inform feasibility but do not override the requirements and approvals in this PRD.

### Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-20 | Build a Chromium extension targeting Opera GX and Chrome | Matches the product owner's browsing environment and portfolio goal |
| 2026-09-20 | Use local OCR and translation | Preserves privacy and avoids API fees |
| 2026-09-20 | Limit the MVP to one selected region | Reduces layout and multi-region complexity while validating the core workflow |
| 2026-09-20 | Use Simplified Chinese as the required source language | Primary current use case; Japanese and Korean remain future options |
| 2026-09-20 | Include horizontal and vertical text | Required for website and manga usage |
| 2026-09-20 | Display a solid card over the source region | Simple, legible replacement without image reconstruction |
| 2026-09-20 | Store no captures or translation history | No user need justifies persistent content storage |
| 2026-09-20 | Release through public GitHub first | Supports a zero-budget portfolio release without store dependency |
| 2026-09-20 | Use MIT for Croppa and preserve third-party notices | Enables permissive sharing while respecting dependency licenses |

## Approval checklist

Before implementation begins, Shua must confirm:

- [ ] The MVP requirements and non-goals match the intended first release.
- [ ] Simplified Chinese is the only required MVP source language; Japanese and Korean default to post-MVP.
- [ ] Local-only content processing and on-demand model downloads are acceptable.
- [ ] The 16-of-20 acceptance target is acceptable.
- [ ] The listed open technical questions may be resolved during the feasibility milestone without changing approved product behavior.
- [ ] This PRD is approved as the implementation source of truth.
