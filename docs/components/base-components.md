# Base Component Reference

Comprehensive reference for the `src/frontend/components/base/` library used across Ollama Chat. Each entry captures purpose, attributes, slots, events, and accessibility considerations.

## `<ollama-button>`
- **Purpose**: Primary interaction control with `primary`, `secondary`, and `icon` variants.
- **Attributes**:
  - `variant`: `primary` | `secondary` | `icon`
  - `size`: `sm` | `md` | `lg`
  - `disabled`
  - `label` (preferred accessible text for icon-only buttons) or `aria-label`
- **Slots**: Default slot for content (`<ollama-icon>` + text). Icon variant expects `<ollama-tooltip>` child.
- **Events**: Re-emits native `click` via `CustomEvent('click', { detail: { originalEvent } })`.
- **Accessibility**: Native `<button>` with focus ring tokens; icon buttons require tooltips.

## `<ollama-icon>`
- **Purpose**: Lucide icon renderer with CDN-backed inline SVGs.
- **Attributes**: `name` (Lucide slug), `size` (`xs`-`xl`).
- **Behavior**: Fetches SVGs once, caches parsed markup, and updates automatically when theme/locale change.
- **Accessibility**: Decorative by default (`aria-hidden`). Provide `aria-label`/wrapping text for meaningful icons.

## `<ollama-input>`
- **Purpose**: Single-line text input with validation helper text.
- **Attributes**: `label`, `aria-label`, `aria-labelledby`, `type`, `placeholder`, `value`, `size`, `required`, `disabled`, `error`.
- **Events**: `input` & `change` emit `{ value }` detail.
- **API**: `.value`, `.focus()`, `.blur()`.
- **Accessibility**: Built-in visual label when `label` provided, otherwise supply `aria-label`/`aria-labelledby`; applies `aria-invalid`, ties helper text via `aria-describedby`, respects `lang/dir`.

## `<ollama-textarea>`
- **Purpose**: Multi-line text entry (chat composer).
- **Attributes**: `label`, `aria-label`, `aria-labelledby`, `placeholder`, `value`, `rows`, `required`, `disabled`, `error`, `appearance` (`default` | `minimal`).
- **Events**: `input`, `change` with `{ value }` detail.
- **Accessibility**: Mirrors `<ollama-input>` semantics with built-in labels, `aria-required`, `aria-invalid`, helper text announcements. `appearance="minimal"` removes borders/label visuals while preserving ARIA metadata for pill-shaped shells like the chat composer.
- **Styling Hooks**: Supports CSS vars such as `--textarea-font-size`, `--textarea-line-height`, `--textarea-padding-block`, `--textarea-padding-inline`, and `--textarea-border-radius` for fine-grained control from host components.

- **Purpose**: Lightweight dropdown for theme/model pickers.
- **Attributes**: `value`, `size`, `disabled`, `label` (visual text rendered above the select), `aria-label`, `aria-labelledby`.
- **Usage**: Provide native `<option>` children.
- **Events**: `change` with `{ value }` detail.
- **Accessibility**: Built-in label text when `label` provided, or supply `aria-label` / `aria-labelledby` for custom labelling; native `<select>` inherits `lang/dir` and exposes `aria-disabled`.

## `<ollama-tooltip>`
- **Purpose**: Focus/hover tooltip for icon-first UI.
- **Attributes**: `position` (`top|right|bottom|left`).
- **Behavior**: Ensures parent positioned, toggles visibility on mouse/focus events.
- **Accessibility**: `role="tooltip"`, requires trigger `aria-describedby` via component wiring.

## `<ollama-spinner>`
- **Purpose**: Loading indicator for inline/overlay states.
- **Attributes**: `size` (`xs`-`xl`).
- **Accessibility**: `role="status"` + `aria-label="Loading"`.

## `<ollama-badge>`
- **Purpose**: Status labels (`default`, `success`, `warning`, `error`, `info`).
- **Attributes**: `variant`, `size` (`sm|md|lg`).

## Feature Components

### `<ollama-chat-input>`
- **Purpose**: Full chat composer that combines `<ollama-textarea>`, attachment buttons, and the primary send control.
- **Attributes**: `value`, `placeholder`, `label`, `token-limit`, `upload-actions` (JSON array describing action buttons), `disabled`, `busy`, `aria-label`, `aria-labelledby`.
- **Slots**: `send-icon`, `send-label`, and `model-info` for contextual metadata (active model, latency, etc.).
- **Events**:
  - `input`: emits `{ value }` as the textarea changes.
  - `send`: fires when the user clicks the send button or presses Ctrl/Cmd + Enter, payload `{ value, tokens, source }`.
  - `action`: emitted when attachment buttons are clicked with payload `{ id }`.
- **Accessibility**: Textarea automatically links visual labels/ARIA attributes, attachment group exposes `role=\"group\"`, token counter announced via `aria-live`, send button disabled while empty/busy to prevent accidental submissions.

## Shared Notes
- **Theming**: All components inherit CSS variables from `theme.css` via `BaseComponent`.
- **Localization**: `BaseComponent` syncs `lang` + `dir` attributes from `<html>` and listens for `localechange` events.
- **Testing**: Run `npm test` for Vitest suites and `npm run test -- --coverage` for coverage reports (>90% lines currently).
- **Storybook**: `npm run storybook` opens the interactive gallery (stories under `src/stories/`).
