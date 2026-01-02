# Feature Components

This directory houses higher-order components that compose the base primitives located in `../base/`. Each feature component is responsible for a specific portion of the Ollama Chat client (chat layout, message rendering, inputs, selectors, etc.) and should:

- Reuse base components (`<ollama-button>`, `<ollama-input>`, `<ollama-select>`, etc.) rather than duplicate functionality.
- Remain framework-agnostic by extending `BaseComponent` or other shared helpers.
- Honor the design requirements described in `docs/development.md` (DR-1 through DR-15) and the feature plan in `docs/features/01-base-components.md`.
- Integrate with shared services (`src/frontend/utils/`) for theming, localization, markdown rendering, and WebSocket communication.

## Minimum Set for Basic Client

Per the “Path to Basic Client” section, the following components enable a usable chat experience:

| Component | Purpose | Primary Base Dependencies |
|-----------|---------|---------------------------|
| `<ollama-chat-container>` | Overall layout, sidebar + chat regions | `<ollama-button>`, `<ollama-badge>` |
| `<ollama-conversation-list>` / `<ollama-conversation-item>` | Conversation navigation | `<ollama-button>`, `<ollama-tooltip>` |
| `<ollama-chat-input>` | Message composer | `<ollama-textarea>`, `<ollama-button>`, `<ollama-icon>` |
| `<ollama-chat-message>` / `<ollama-user-message>` / `<ollama-ai-response>` | Message presentation + streaming | `<ollama-icon>`, `<ollama-badge>`, `<ollama-spinner>` |
| `<ollama-model-selector>` | Runtime LLM switching | `<ollama-select>`, `<ollama-tooltip>` |
| `<ollama-message-actions>` | Copy/regenerate/delete controls | `<ollama-button>`, `<ollama-icon>`, `<ollama-tooltip>` |
| `<ollama-settings-panel>` | Theme, language, and model preferences | `<ollama-dialog>`, `<ollama-input>`, `<ollama-select>` |

## Stub Components

Until the full implementations are complete, each component file exports a stub Web Component that:

1. Extends `BaseComponent`.
2. Renders an accessible placeholder within the Shadow DOM.
3. Logs a console warning once per session reminding developers to replace the stub with a real implementation.

These stubs allow other parts of the application to reference the components without runtime failures while work continues.

## Implementation Notes

- When you replace a stub, ensure that you remove the placeholder markup and the stub logging logic.
- Keep Storybook/demo stories in sync with these components for the visual regression tests mentioned in Phase 6.
- Update `docs/features/01-base-components.md` whenever component scopes change so the feature documentation remains source-of-truth.
