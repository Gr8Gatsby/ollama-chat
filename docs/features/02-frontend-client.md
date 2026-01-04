# Feature: Frontend Client (Web Components)

## Metadata

**Feature ID**: F-02  
**Status**: In Progress  
**Started**: 2026-01-04  
**Target Completion**: 2026-01-05  
**Dependencies**: F-01 (Base Components Library)

## Target Requirements

### From Specification
- **FR-1**: Token Usage Tracking
- **FR-2**: Streaming LLM Connections
- **FR-3**: Multi-Conversation Support
- **FR-4**: Image Upload with Model Capability Detection
- **FR-5**: Dynamic Model Selection
- **FR-6**: Visual Model Identification
- **FR-7**: Project Management
- **FR-8**: File Generation and Display
- **FR-9**: Live Preview
- **FR-10**: Project Export
- **FR-11**: Approach Verification Checkpoint
- **FR-12**: Complete Code Generation

### From Development Specification
- **DR-1**: Web Components Implementation
- **DR-1a**: Icon-First UI Pattern
- **DR-1b**: Message Layout and Content Rendering
- **DR-2**: Semantic HTML Structure
- **DR-3**: Lucide Icons Integration
- **DR-4**: Theming System
- **DR-5**: Localization (i18n)
- **DR-10**: WebSocket Client Implementation
- **DR-11**: Streaming Response Handling
- **DR-12**: Error Handling and User Notifications
- **DR-13**: Component Communication and State Management
- **DR-15**: Accessibility Requirements (WCAG 2.1 AA)
- **DR-17**: Testing Strategy
- **DR-19**: File Display Components
- **DR-20**: Live Preview System
- **DR-21**: Project Export

## Success Criteria

- [ ] App Shell uses semantic landmarks and `ollama-chat-container` slots (header, sidebar, main, footer)
- [ ] Chat mode renders `ollama-message-list`, `ollama-user-message`, `ollama-ai-response`
- [ ] Project mode renders `ollama-project-view` and `ollama-live-preview`
- [ ] Mode toggle switches chat/project and preserves sidebar + file tree state
- [ ] Sidebar supports multi-conversation list with unread indicators
- [ ] Sidebar user menu is sticky, full-width, and uses `ollama-dropdown`
- [ ] Chat input supports image/file upload actions + model select + send
- [ ] AI responses stream and update in-place with streaming indicator
- [ ] File tree + file display support selection, expansion, and copy
- [ ] Live preview displays sandboxed iframe with refresh controls and error UI
- [ ] Project export action triggers download and shows progress
- [ ] All icon-only actions use `ollama-tooltip` and meet WCAG AA contrast
- [ ] i18n updates content and directionality in all UI regions
- [ ] Storybook includes App Shell example with chat + project flows
- [ ] Accessibility checks pass for key flows (chat input, message actions, menus)

## Implementation Plan

### Phase 1: App Shell Layout + State
1. Implement an app shell root using `ollama-chat-container` with semantic header/nav/main/footer slots.
2. Add app bar controls: sidebar toggle + mode toggle (`ollama-toggle-switch`).
3. Wire sticky state for sidebar open/closed across mode changes.
4. Add `ollama-sidebar-user` (sticky) with dropdown actions.
5. Create Storybook app shell story with representative content.

### Phase 2: Chat Mode Experience
1. Assemble `ollama-message-list` with user + AI messages.
2. Ensure `ollama-ai-response` uses full-width layout and streaming indicator.
3. Wire `ollama-message-actions` (copy/regenerate) with tooltips.
4. Implement `ollama-chat-input` with upload actions + model select + send.
5. Add empty state and loading states for message list.

### Phase 3: Project Mode Experience
1. Implement `ollama-project-view` (metadata card, file tree, file display).
2. Ensure file tree expansion state persists across selection and mode switches.
3. Add `ollama-live-preview` for sandboxed iframe and error overlay.
4. Integrate project export action in the project view.

### Phase 4: Data + Streaming Integration
1. Connect WebSocket client to message streaming pipeline.
2. Emit streaming updates to `ollama-ai-response` and markdown renderer.
3. Track tokens per message and aggregate per conversation (FR-1).
4. Gate uploads based on model capability (FR-4).
5. Persist model selection per conversation (FR-5).
6. Integrate Ollama API model discovery to populate selectors and model badges.
7. Surface model capability changes in the UI (vision, tool support).

### Phase 5: Accessibility + Localization
1. Ensure all icon-only controls use `ollama-tooltip`.
2. Enforce WCAG AA contrast in chat + project views.
3. Verify keyboard navigation for sidebar, menus, and chat input.
4. Confirm RTL rendering and locale updates across UI.

### Phase 6: Testing + Validation
1. Add unit tests for App Shell state handling and mode switch behavior.
2. Add integration tests for message streaming + file tree interactions.
3. Run Storybook accessibility checks on chat and project flows.
4. Document validation steps and update feature status.

## Implementation Notes

- All UI must be composed from base components (no raw inputs or tooltips).
- Use `ollama-text` for all labels and display text (theme-aware typography).
- Keep the sidebar user card full-width with no outer gutter.
- Project mode should hide the chat footer and collapse the conversation sidebar.
- Live preview should occupy the main workspace (not inline in chat).
- Frontend integrates with backend WebSocket + Ollama API for models and streaming.

## Integration Details

### Client ↔ Backend ↔ Ollama Flow
- **WebSocket client** sends user messages and context to the backend (DR-10/DR-11).
- **Backend** forwards requests to Ollama streaming endpoints and emits chunk events.
- **Frontend** updates message UI in real time and finalizes messages on completion.

### Ollama API Usage (Frontend)
- Fetch available models on startup and on refresh.
- Populate model selector in chat input and project settings.
- Use model metadata to enable/disable vision uploads (FR-4).
- Display model icons/badges on AI responses (FR-6).

### UI Events Driven by Integration
- `models-loaded` → update `ollama-select` options + badges.
- `message:stream` → append to `ollama-ai-response` + update spinner.
- `message:done` → finalize content, tokens, and enable actions.
- `error` → surface via error banner/toast components (DR-12).

## Change Log

### 2026-01-04 - Feature Document Created
**Agent**: Codex (GPT-5)
- Added frontend client feature definition scoped to spec + development requirements.
- Defined success criteria for chat and project experiences.
- Outlined phased implementation plan covering layout, chat, project, data integration, accessibility, and testing.
