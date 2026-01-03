# Feature: Base Components Library

## Metadata

**Feature ID**: F-01  
**Status**: In Progress  
**Started**: 2026-01-02  
**Target Completion**: 2026-01-02  
**Dependencies**: F-00 (Basic Project Setup)

## Target Requirements

### From Specification
None directly - foundational UI infrastructure

### From Development Specification
- **DR-1**: Web Components Implementation
- **DR-1a**: Icon-First UI Pattern
- **DR-3**: Lucide Icons Integration
- **DR-4**: Theming System
- **DR-5**: Localization (i18n)
- **DR-15**: Accessibility Requirements (WCAG 2.1 AA)

## Success Criteria

- [ ] `<ollama-button>` - All button variants (primary, secondary, icon-only)
- [ ] `<ollama-icon>` - Lucide icon wrapper
- [ ] `<ollama-tooltip>` - Accessible tooltips
- [ ] `<ollama-input>` - Text input with validation states
- [ ] `<ollama-textarea>` - Multi-line text input
- [ ] `<ollama-select>` - Dropdown/select component
- [ ] `<ollama-dialog>` - Modal dialog container
- [ ] `<ollama-spinner>` - Loading indicator
- [ ] `<ollama-badge>` - Labels and status indicators
- [ ] All components use Shadow DOM
- [ ] All components support theming via CSS custom properties
- [ ] All components have proper ARIA labels and roles
- [ ] All components are keyboard accessible
- [ ] Components tested in isolation

## Implementation Plan

### Phase 1: Setup Component Infrastructure
1. Create `src/frontend/components/base/` directory structure (leaf, container, experience folders plus shared styles).
2. Implement `BaseComponent` class/mixin that encapsulates `attachShadow`, template/styling injection, attribute/property syncing, localization hooks, and `emitEvent` helper per DR-1.
3. Setup Lucide icons integration (import helper, caching map, default stroke width, CDN fallback) to satisfy DR-3.
4. Create shared CSS files for tokens + base component resets so every component starts from the same typography, spacing, and focus-ring rules (ties into DR-4/DR-15).
5. Document component registration sequence + FOUC guardrails (ensure base bundle registers before any usage, aligning with DR-7).

### Phase 2: Core Interactive Components
1. Build `<ollama-button>` with `variant`, `size`, `loading`, `disabled`, and `stretch` attributes, exposing default + icon-only slots and dispatching `ollama-activate` custom event.
2. Build `<ollama-icon>` wrapper that looks up Lucide SVGs, supports `name`, `size`, `stroke-width`, `aria-hidden`, lazy-loads sprites, and inherits theme colors.
3. Build `<ollama-tooltip>` anchored behavior with `role="tooltip"`, focus/hover triggers, placement logic, and delay tokens (supports DR-1a icon-first UX).
4. Add keyboard + pointer interaction specs (Enter/Space support, focus outlines) for each interactive component.
5. Document usage patterns in component README snippets for downstream teams.

### Phase 3: Form Components
1. Implement `<ollama-input>` with label slot, helper + error text slots, validation states (`valid`, `error`, `warning`), prefix/suffix icon support, and built-in debounced `value-change` events.
2. Implement `<ollama-textarea>` with auto-resize, character counter, and ability to enforce max length while mirroring `<ollama-input>` API.
3. Implement `<ollama-select>` with keyboard navigable listbox, search/filter option, `aria-activedescendant`, and support for async options (dispatched via custom events).
4. Integrate i18n service so placeholders, labels, and validation text read from locale files and update on `localechange` events (DR-5).
5. Ensure inputs expose imperative methods (`focus()`, `reportValidity()`) for feature components.

### Phase 4: Feedback Components
1. Implement `<ollama-spinner>` with size + descriptive label options, respect `prefers-reduced-motion`, and allow inline + overlay modes.
2. Implement `<ollama-badge>` supporting semantic variants (info/success/warning/error/neutral) + selectable appearance for statuses across chat.
3. Add motion + duration tokens plus CSS custom properties for each state.
4. Document guidance on when to use badges vs buttons vs tooltips to keep UI consistent.

### Phase 5: Container Components
1. Implement `<ollama-dialog>` with overlay/backdrop, slot for header/body/footer, `role="dialog"`, focus trap, scroll locking, and `close()` API.
2. Provide animation hooks honoring `prefers-reduced-motion`, with CSS-only transitions keyed to tokens.
3. Emit lifecycle events (`dialog-opened`, `dialog-closed`) and expose attribute reflection for `open` + `size`.
4. Build shared accessibility utilities (focus trap helper, inert manager) re-used by dialog + future containers.

### Phase 6: Integration and Testing
1. Create demo/documentation page (component gallery) that renders every base component in all variants + states.
2. Add automated keyboard navigation tests (per DR-15) plus localization/theming regression checks (LTR/RTL + light/dark) to `npm test`.
3. Wire up visual regression snapshots for each component using the demo page output.
4. Run manual + automated screen reader smoke tests using axe/Playwright in CI before marking feature complete.
5. Validate WCAG 2.1 AA compliance, including contrast reports for each tokenized state.

### Phase 7: Feature Component Enablement
1. Scaffold feature-level component directory (`src/frontend/components/features/`) README describing dependency on base primitives.
2. Define contracts for `<ollama-chat-container>`, `<ollama-chat-message>`, `<ollama-user-message>`, `<ollama-ai-response>`, `<ollama-chat-input>`, `<ollama-conversation-list>`, `<ollama-model-selector>`, `<ollama-message-actions>`, and `<ollama-settings-panel>`, explicitly noting which base components they compose.
3. Provide shared layout utilities (CSS grid/flex tokens, spacing helpers) so feature components can launch without redefining primitives.
4. Identify minimum component subset required for “basic client” (chat container, message rendering, conversation list, chat input, model selector) and create corresponding stub files exporting TODO warnings to unblock later implementation tickets.
5. Document integration checklist mapping each feature component to backend/websocket dependencies (DR-8, DR-10, DR-11) to streamline follow-on work.

## Implementation Notes

- Use Shadow DOM for style encapsulation
- Components should be framework-agnostic (vanilla Web Components)
- Follow DR-1 component design principles (reusability, consistency)
- Use CSS custom properties from theme.css for all styling
- No inline styles - all styles in component's Shadow DOM
- Each component in separate file: `component-name.js`
- Export all components from `index.js` for easy imports
- Icons via Lucide CDN (https://cdn.jsdelivr.net/npm/lucide-static@latest)
- `npm run storybook` spins up a live component gallery powered by Storybook (Web Components + Vite); stories live in `src/stories/**` and cover every base component plus feature stubs.
- Detailed attribute/event reference lives in `docs/components/base-components.md`.

## Component Specifications

### `<ollama-button>`
- **Purpose**: Primary interactive element for all actions (per DR-1/DR-1a) with variants covering priority, subtle, destructive, and icon-only usage.
- **Attributes/Props**: `variant`, `size`, `stretch`, `loading`, `disabled`, `type`, `aria-label`.
- **States**: Hover/focus/active/disabled/loading; loading swaps slot content with `<ollama-spinner size="xs">` and sets `aria-busy`.
- **Slots**: Default slot plus optional `leading`/`trailing` named slots for icon layout control.
- **Events**: Native click plus `ollama-activate` custom event for declarative listeners.
- **Accessibility**: Shadow DOM contains native `<button>` with focus ring tokens, requires tooltip for icon-only variant.

### `<ollama-icon>`
- **Purpose**: Single Lucide integration point (DR-3) handling caching + fallback glyphs.
- **Attributes/Props**: `name`, `size`, `stroke-width`, `decorative`, `aria-hidden`.
- **Implementation**: Fetches SVG from Lucide static CDN, injects inline SVG, inherits CSS color tokens, exposes `setIcon(name)` API.
- **Accessibility**: Defaults to `aria-hidden="true"`; optional `<title>` node when meaningful label provided.

### `<ollama-tooltip>`
- **Purpose**: Provide accessible descriptions for icon-first controls (DR-1a & DR-15).
- **Behavior**: Trigger via `for` attribute or slot, manages `aria-describedby`, shows on focus + hover with configurable delays, hides on Escape/blur.
- **Accessibility**: `role="tooltip"`, text localized via i18n service, remains in DOM for screen readers.

### `<ollama-input>`
- **Purpose**: Standard single-line text entry reused across forms.
- **Features**: Label slot, helper/error text slot, prefix/suffix icons, `validation-state` attr toggling `aria-invalid`, emits debounced `value-change` events, optional masking.
- **Accessibility**: Associates labels via `for`/`id`, errors via `aria-describedby`, uses logical CSS properties for RTL (DR-5).

### `<ollama-textarea>`
- **Purpose**: Multi-line entry for chat composer and notes.
- **Features**: Auto-resize with ResizeObserver, optional char counter, `max-rows`, inherits validation + localization behavior from `<ollama-input>`.
- **Accessibility**: Declares `aria-multiline="true"`, handles `Ctrl/Cmd + Enter` hints, keeps streaming indicators SR-safe.

### `<ollama-select>`
- **Purpose**: Custom dropdown for model selector, theme picker, etc.
- **Features**: Listbox with roving tabindex, keyboard search, async option injection, busy/empty states, optional multi-select badges.
- **Accessibility**: `role="combobox"`, `aria-expanded`, `aria-controls`, options use `role="option"` + `aria-selected`, mirrors locale directionality.

### `<ollama-dialog>`
- **Purpose**: Modal container for settings, confirmations, guided flows.
- **Features**: Header/body/footer slots, size presets, focus trap, scroll locking, ESC + close button support, emits `dialog-opened/closed`, integrates overlay manager.
- **Accessibility**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, traps focus and returns to trigger element.

### `<ollama-spinner>`
- **Purpose**: Loading indicator for buttons, file uploads, streaming states.
- **Features**: Size + variant support (`inline`, `overlay`), CSS animations honoring `prefers-reduced-motion`, optional label slot for SR text.
- **Accessibility**: Uses `role="status"` + `aria-live="polite"` when label present, ensures theme-driven contrast.

### `<ollama-badge>`
- **Purpose**: Display statuses (models, tokens, conversation metadata) across UI.
- **Features**: Variants for info/success/warning/error/neutral, optional dot indicator, closable mode, icon slot, respects RTL spacing.
- **Accessibility**: Announces text content, meets 3:1 contrast, optional `aria-pressed` for toggle badges.

## Cross-Cutting Concerns

### Theming (DR-4)
- Components consume design tokens from `/src/styles/tokens.css` + theme overlays; no hardcoded values.
- Expose CSS parts/custom properties for host-level overrides (e.g., `--ollama-button-border-color`).
- Listen for `themechange` CustomEvent and re-render when tokens update.

### Localization & Directionality (DR-5)
- Component text strings sourced through global i18n helper; listen for `localechange` to update placeholders/tooltips.
- Layout relies on logical properties (`padding-inline`, `margin-inline`) and mirrors icons (chevrons) when in RTL.
- Provide `lang`/`dir` attributes on hosts or shadow roots to keep punctuation + hyphenation accurate.

### Accessibility & Keyboarding (DR-15)
- Standardize focus ring tokens + shared `:focus-visible` styles via base CSS.
- Document key bindings per component (e.g., Space toggles select, Escape closes dialog/tooltip) and cover them in tests.
- Use ARIA live regions judiciously for status updates (spinner, inline validation) to avoid screen reader chatter.

## Path to Basic Client

- **Minimum Feature Component Set**: To assemble a usable chat client, implement the following feature components that compose the base primitives:
  - `<ollama-chat-container>` orchestrating layout for sidebar + main chat area, wiring theme + locale switches.
  - `<ollama-conversation-list>` and `<ollama-conversation-item>` built atop `<ollama-button>`, `<ollama-badge>`, and `<ollama-tooltip>` for navigation.
  - `<ollama-chat-input>` leveraging `<ollama-textarea>`, `<ollama-button>`, `<ollama-icon>`, and `<ollama-tooltip>` to support text entry plus action buttons.
  - `<ollama-chat-message>`, `<ollama-user-message>`, and `<ollama-ai-response>` combining `<ollama-icon>`, `<ollama-badge>`, `<ollama-spinner>`, and `<ollama-tooltip>` for message rendering, markdown streaming, and status indicators (per DR-1b/DR-11).
  - `<ollama-model-selector>` composed from `<ollama-select>`, `<ollama-badge>`, and `<ollama-tooltip>` to satisfy DR-5 (locale) + FR-5 (dynamic models).
- **Supporting Utilities**: Build shared services (WebSocket client, markdown renderer, i18n hooks) so feature components can interface with backend requirements (DR-8 through DR-13).
- **Validation Flow**:
  1. Assemble prototype page instantiating the minimum set above, using mock data to verify layout + keyboard navigation.
  2. Integrate with live WebSocket stream for send/receive loops, ensuring `<ollama-chat-message>` updates inline with streaming indicators.
  3. Run accessibility + localization tests across the composite UI to confirm base component guarantees hold end-to-end.

## Testing & Validation Strategy
- **Unit tests**: Web Component unit tests (e.g., @web/test-runner or Vitest + jsdom) verifying rendering, attribute reflection, event emission, theme/i18n updates; `ollama-button` scenario aligned with DR-17 sample tests.
- **Accessibility tests**: axe-core audits + keyboard navigation scripts on the component gallery to confirm WCAG 2.1 AA coverage, including tooltip/dialog semantics.
- **Localization tests**: Snapshot LTR vs RTL renders and locale-specific strings to ensure no clipping; run headless browser diffs (Percy-style).
- **Theming tests**: Programmatically toggle light/dark/custom themes and assert CSS variable overrides propagate to Shadow DOM.
- **Manual validation**: Exercise demo page with VoiceOver/NVDA, verify tooltip delays, dialog focus trap behavior, and ensure icon-first buttons retain discoverability (per DR-1a).
- **Current coverage**: `npm test` (Vitest + jsdom) executes automated checks for `<ollama-button>`, `<ollama-input>`, and `<ollama-select>` covering theme inheritance, locale syncing (dir/lang propagation), and accessible error states via axe-core.

## Change Log

### 2026-01-04 - Live Preview Component
**Agent**: Codex (GPT-5)
- Implemented `<ollama-live-preview>` with sandboxed iframe, reload control, and error overlay.
- Added Storybook coverage and documented the component API.

### 2026-01-04 - File Display Components Added
**Agent**: Codex (GPT-5)
- Implemented `<ollama-project-view>`, `<ollama-file-tree>`, and `<ollama-file-display>` with syntax highlighting and copy actions.
- Added Storybook coverage for project view, file tree, and file display.
- Documented the file display components in the base reference.

### 2026-01-04 - Markdown + Code Block Rendering
**Agent**: Codex (GPT-5)
- Added base `<ollama-code-block>` with copy action and monospace styling.
- Implemented `<ollama-markdown-renderer>` to parse fenced code blocks and render text paragraphs.
- Wired AI responses to render markdown content and added Storybook coverage/documentation updates.

### 2026-01-04 - Message List Added
**Agent**: Codex (GPT-5)
- Implemented `<ollama-message-list>` to provide a scrollable message stack with empty state and auto-scroll.
- Added Storybook coverage and updated the App Shell to use the message list container.
- Documented the component API in the base reference.

### 2026-01-04 - Settings Panel + Dialog
**Agent**: Codex (GPT-5)
- Implemented base `<ollama-dialog>` with focus trapping, dismissible behavior, and header/footer slots.
- Built `<ollama-settings-panel>` atop the dialog with theme/language/model selects and `settings-change` events.
- Added Storybook coverage for dialog and settings panel plus reference documentation updates.

### 2026-01-04 - Model Selector Implemented
**Agent**: Codex (GPT-5)
- Implemented `<ollama-model-selector>` with base `<ollama-select>`, capability badges, and `model-change` events.
- Added Storybook coverage and documented the API in the component reference.

### 2026-01-04 - Message Actions Component
**Agent**: Codex (GPT-5)
- Implemented `<ollama-message-actions>` with icon-first buttons and default copy/regenerate/delete actions.
- Wired message components to use the message actions by default with optional slot overrides.
- Added Storybook coverage and documented the component API.

### 2026-01-04 - Message Components Implemented
**Agent**: Codex (GPT-5)
- Implemented `<ollama-chat-message>`, `<ollama-user-message>`, and `<ollama-ai-response>` with role-based layouts, metadata badges, and streaming indicators.
- Added Storybook coverage for user messages, AI responses, and the wrapper component.
- Updated component reference documentation to describe message component APIs.

### 2026-01-04 - Sidebar Controls + Conversation List
**Agent**: Codex (GPT-5)
- Added collapsible sidebar toggle logic and overlay handling to `<ollama-chat-container>` plus header control slot support.
- Implemented `<ollama-conversation-list>` and `<ollama-conversation-item>` with selection events, badges, and actions using base primitives.
- Added Storybook coverage for conversation list/item and updated component reference documentation.

### 2026-01-04 - Tooltip + Typography Foundation
**Agent**: Codex (GPT-5)
- Added `<ollama-text>` typography primitive plus Storybook coverage for consistent labels, captions, and titles across feature components.
- Rewired `<ollama-chat-input>` attachment buttons to use `<ollama-tooltip>` instead of native `title` attributes for icon-first guidance.
- Updated the chat container Storybook example to use `<ollama-text>` for sidebar headings and documented the new component in the base reference.

### 2026-01-02 - Feature Document Created
**Agent**: Claude (Sonnet 4.5)
- Created feature document with metadata and implementation plan
- Defined success criteria for 9 base components
- Outlined 6-phase implementation approach
- Linked to relevant DR requirements (DR-1, DR-1a, DR-3, DR-4, DR-5, DR-15)

### 2026-01-03 - Requirements Clarified and Scope Expanded
**Agent**: Codex (GPT-5)
- Expanded implementation plan with detailed infrastructure, accessibility, and testing tasks per phase.
- Added component-level specifications outlining APIs, events, and accessibility requirements.
- Documented cross-cutting theming, localization, and keyboarding policies to align with DR-4/DR-5/DR-15.
- Defined testing/validation strategy referencing DR-17 deliverables to set completion criteria for F-01.

### 2026-01-03 - Feature Component Enablement Plan Added
**Agent**: Codex (GPT-5)
- Introduced Phase 7 outlining scaffolding tasks for feature-level components required to assemble the basic chat client experience.
- Added “Path to Basic Client” section enumerating the minimum composite components and backend dependencies needed beyond the base library.
- Clarified integration checklist linking base primitives to upcoming chat-specific components, ensuring F-01 handoff covers client readiness.

### 2026-01-03 - Feature Component Stubs Created
**Agent**: Codex (GPT-5)
- Added `src/frontend/components/features/README.md` to describe responsibilities, dependencies, and rollout guidance for feature components.
- Implemented stub Web Components for the initial client surface (`ollama-chat-container`, conversation list/item, chat input, chat messages, user/AI responses, model selector, message actions, settings panel) with accessible placeholders and console warnings.
- Introduced shared stub helpers to keep placeholders consistent and tied them back to Phase 7 expectations while preventing runtime errors during integration.

### 2026-01-03 - Base Component Localization/Theming Tests Added
**Agent**: Codex (GPT-5)
- Enhanced `BaseComponent` to sync `data-theme`, `lang`, and `dir` from the document root and respond to `themechange` / `localechange` events with automatic re-rendering.
- Updated interactive primitives (button, input, textarea, select, tooltip) to propagate localization attributes, expose ARIA metadata, and attach error messaging IDs for accessibility.
- Added a root Vitest + jsdom test harness (`package.json`, `vitest.config.js`, `tests/`) with suites for `<ollama-button>`, `<ollama-input>`, and `<ollama-select>` covering theming, localization, and basic accessibility (`axe-core`), executed via `npm test`.

### 2026-01-03 - Storybook Gallery Established
**Agent**: Codex (GPT-5)
- Integrated Storybook (web-components + Vite) with accessibility, docs, and Vitest addons; commands `npm run storybook` / `npm run build-storybook` produce interactive docs.
- Authored stories for all base primitives (button, input, textarea, select, tooltip, icon, spinner, badge) plus the feature stub gallery so design/dev teams can visualize current states and theme/locale toggles.
- Configured preview globals to mirror runtime theming + localization events (toolbar controls for theme, direction, locale) ensuring Storybook accurately reflects DR-4/DR-5 requirements.

### 2026-01-03 - Icon Fetching + Reference Documentation
**Agent**: Codex (GPT-5)
- Updated `<ollama-icon>` to inline Lucide SVGs from the CDN with caching/fallback logic, fixing missing icons in Storybook (`With icon` scenario) and safeguarding against network failures.
- Added `docs/components/base-components.md` as a concise reference for attributes, slots, events, and accessibility behavior per component to complement Storybook docs.
- Storybook tests now reuse shared Vitest setup without errors after aligning jest-dom matcher imports for browser execution.

### 2026-01-03 - Contrast Improvements & Field Accessibility
**Agent**: Codex (GPT-5)
- Raised contrast ratios for the shared theme palette (primary accent, focus outlines, badge variants) so every primitive satisfies WCAG 2.1 AA in light/dark modes without per-component overrides.
- Extended `<ollama-input>`, `<ollama-textarea>`, and `<ollama-select>` with built-in `label` attributes plus pass-through `aria-label`/`aria-labelledby` handling and refreshed Storybook stories, eliminating unnamed form controls flagged by axe.
- Documented the new select labeling behavior inside `docs/components/base-components.md` to keep DR-15 requirements traceable from spec to implementation.

### 2026-01-03 - `<ollama-chat-input>` Implemented
**Agent**: Codex (GPT-5)
- Replaced the placeholder stub with a fully functional composer that wires `<ollama-textarea>`, icon-first action buttons, and the send button while meeting DR-1/DR-15 keyboard and ARIA requirements.
- Added JSON-configurable attachment actions, token counting with limit feedback, and `send`/`action` custom events so upstream chat logic can hook into uploads and submission shortcuts.
- Authored a dedicated Storybook gallery (`Feature/Ollama Chat Input`) plus Vitest coverage to validate localization, shortcut handling, and busy/disabled states; updated the component reference doc to describe the new API.

### 2026-01-03 - `<ollama-chat-container>` Implemented
**Agent**: Codex (GPT-5)
- Replaced the stub with a real layout component that defines sidebar/header/main/footer slots using responsive CSS grid and theme-aware tokens.
- Added Storybook coverage to verify sidebar toggle behavior and slot layout at desktop and mobile breakpoints.
