# Feature: Conversation Projects

## Metadata

**Feature ID**: F-03  
**Status**: Not Started  
**Started**: 2026-01-02  
**Target Completion**: 2026-01-09  
**Dependencies**: F-00 (Basic Project Setup), F-01 (Base Components), F-02 (Frontend Client)

## Target Requirements

### From Specification
- **FR-7**: Project Management
- **FR-8**: File Generation and Display
- **FR-9**: Live Preview
- **FR-10**: Project Export
- **FR-11**: Approach Verification Checkpoint (project gating)
- **FR-12**: Complete Code Generation (no placeholders)

### From Development Specification
- **DR-1**: Web Components Implementation
- **DR-1a**: Icon-First UI Pattern
- **DR-4**: Theming and Styling System
- **DR-5**: Localization (i18n) and Bidirectional Text Support
- **DR-15**: Accessibility Requirements (WCAG 2.1 AA)
- **DR-19**: File Display Components
- **DR-20**: Live Preview System
- **DR-21**: Project Export
- **Main Workspace (Project Mode)**: Project layout in app shell

## Success Criteria

- [ ] Projects persisted and associated to conversations in DB
- [ ] Project metadata loaded per conversation (name, description, file count)
- [ ] File tree reflects project structure with expand/collapse state
- [ ] File content rendered with syntax highlighting and metadata (size, lines)
- [ ] Live preview uses sandboxed iframe and updates on file changes
- [ ] Export action produces ZIP with correct structure and naming
- [ ] Project mode in UI toggles between chat and project views
- [ ] Project state persists across reloads and conversation switches
- [ ] Approach verification checkpoint present before file generation
- [ ] No placeholder code allowed in generated files

## Implementation Plan

### Phase 1: Data Model + API
1. Validate projects and project_files schema usage
2. Add REST endpoints for projects and files
3. Ensure project state persists per conversation

### Phase 2: Project View Wiring
1. Connect project mode UI to backend
2. Load project metadata and file tree per conversation
3. Render file content via file display component

### Phase 3: Live Preview
1. Wire preview source to project files
2. Sandbox iframe and handle runtime errors
3. Add reload/refresh hooks on file updates

### Phase 4: Export
1. Add export endpoint (ZIP)
2. Provide UI action to download archive
3. Validate naming and directory structure

### Phase 5: Verification + Guardrails
1. Add approach verification checkpoint before generation
2. Validate placeholder patterns on file generation
3. Document user-facing behaviors

### Phase 6: LLM Guidance
1. Draft system prompt focused on building software with users
2. Instruct LLMs to return complete web code (HTML/CSS/JS)
3. Include project file context in prompts for iterative fixes

## Implementation Notes

- Each conversation owns a default project that tracks every file produced during chat.
- Project metadata and files inform LLM context for iterative fixes and refinements.
- Plan for file versioning to support repair flows (bug fixes, diff-aware updates).
- Start with web project support; evaluate additional project environments later.
- Define system prompt guidance so LLMs understand project context and file expectations.
- Projects are a subset of conversation state; chat and project mode share context.
- Use base components for all UI elements (buttons, tooltips, badges).
- Project mode hides conversation sidebar and emphasizes file tree + preview.
- Ensure all UI uses theme tokens and respects localization.

## Change Log

### 2026-01-02 - Feature Document Created
**Agent**: CodeX (GPT-5)
- Added requirements mapping for project management, file display, preview, export
- Defined success criteria and phased plan for conversation-linked projects
