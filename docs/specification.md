# Functional Specification

## Overview

Ollama Chat is a chat client designed to help people build software through conversation. The focus is on bridging the gap between quick ideation ("vibe coding") and building genuine understanding of what's being created.

## Vision & Goals

### Primary Goal
Provide a quick way to bring software ideas to life while ensuring users learn about what's being built for them.

### Key Principles
1. **Speed to Value**: Minimize friction between idea and working software
2. **Learning Through Building**: The UX should teach users about their software as it's created
3. **Knowledge Bridge**: Connect the intuitive flow of conversation with deeper technical understanding
4. **AI-Native Experience**: Designed from the ground up for human-AI collaboration

## User Experience Requirements

### Core User Journey: Building Web Software

This journey describes how users create web applications through conversational interaction.

#### 1. Initial Request
- User describes software goal in natural language
- System accepts request and begins refinement conversation

#### 2. Requirements Refinement
- LLM asks clarifying questions to understand:
  - Core functionality and features (MVP scope)
  - User interface requirements
  - Any specific technical constraints or preferences
- LLM proposes software architecture approach
- LLM MUST NOT skip fundamental software practices for speed

#### 3. Approach Verification
- LLM presents summary of understanding:
  - What will be built (features, scope)
  - How it will be built (technical approach, file structure)
  - What technologies will be used
- User reviews and confirms approach OR requests changes
- Process repeats until user approves

#### 4. File Generation
- LLM generates project files (HTML, CSS, JavaScript)
- Files are streamed and displayed as they're created
- Each file MUST be complete with NO TODOs or placeholder comments
- System supports multi-file projects with proper directory structure
- All files displayed with syntax highlighting in conversation

#### 5. Live Preview
- System loads all generated files into sandboxed iframe
- User can interact with running application
- All project files accessible within iframe context

#### 6. Iteration & Refinement
- User can request changes after seeing preview
- Changes continue in same conversation context
- Updated files replace previous versions
- Preview updates with new code

#### 7. Download & Export
- User can download complete project as archive
- All files included with proper directory structure

### Key Interactions
[To be defined]

### Learning Experience
[To be defined]
- How do we surface what's being built?
- How do we help users understand technical decisions?
- How do we balance speed with comprehension?

## Functional Requirements

### FR-1: Token Usage Tracking
**Requirement**: Track all token flow to and from LLMs for complete audit trail.

**Acceptance Criteria**:
- System SHALL capture input token count for every LLM request
- System SHALL capture output token count for every LLM response
- System SHALL persist token metrics with timestamp and conversation context
- System SHALL provide queryable log of cumulative AI usage per conversation
- System SHALL calculate total tokens used to create any given artifact

**Validation**: Query token log and verify counts match LLM provider metrics.

---

### FR-2: Streaming LLM Connections
**Requirement**: Use streaming connections for all LLM interactions to enable progressive UI updates.

**Acceptance Criteria**:
- System SHALL use streaming API endpoints for LLM requests
- System SHALL emit incremental response chunks as they arrive
- UI SHALL render partial responses in real-time
- System SHALL handle stream interruption and reconnection
- UI SHALL provide visual indicators during streaming (not just loading spinners)

**Validation**: Verify UI updates before complete response received; measure time-to-first-token display.

---

### FR-3: Multi-Conversation Support
**Requirement**: Support multiple independent conversations for context switching between different goals.

**Acceptance Criteria**:
- System SHALL maintain isolated context per conversation
- User SHALL be able to create new conversation at any time
- User SHALL be able to switch between existing conversations
- System SHALL persist conversation history independently
- System SHALL display conversation list with identifiable metadata (title, last activity)
- Switching conversations SHALL NOT lose uncommitted state

**Validation**: Create multiple conversations, verify context isolation; switch conversations and verify history preservation.

---

### FR-4: Image Upload with Model Capability Detection
**Requirement**: Support image uploads with capability-aware UI based on selected LLM's vision support.

**Acceptance Criteria**:
- System SHALL query LLM capabilities to determine vision support
- UI SHALL display image upload option ONLY when current model supports vision
- System SHALL encode images in format compatible with LLM API
- System SHALL include images in conversation context with messages
- System SHALL handle image upload failures with clear error messages

**Validation**: Switch between vision and non-vision models; verify upload UI appears/disappears; send image and verify in LLM request.

---

### FR-5: Dynamic Model Selection
**Requirement**: Allow users to switch between available LLMs at runtime.

**Acceptance Criteria**:
- System SHALL fetch list of available models from Ollama API on startup
- UI SHALL display model selector with all available models
- User SHALL be able to change model at any point in conversation
- System SHALL persist model selection per conversation
- Model changes SHALL take effect for next message (not retroactively)
- System SHALL update UI capabilities (e.g., image upload) when model changes

**Validation**: List models from Ollama; select different model; verify subsequent requests use new model; verify capabilities update.

---

### FR-6: Visual Model Identification
**Requirement**: Display unique visual icon for each LLM to aid model recognition.

**Acceptance Criteria**:
- System SHALL assign distinct icon to each model type/family
- UI SHALL display model icon next to every AI response message
- UI SHALL display model icon in model selector
- Icons SHALL be visually distinguishable at conversation scroll speed
- System SHALL handle unknown models with default fallback icon

**Validation**: Send messages with different models; verify each response shows correct icon; verify icons remain visible during rapid scrolling.

---

### FR-7: Project Management
**Requirement**: Support multi-file projects with proper organization and persistence.

**Acceptance Criteria**:
- System SHALL create project entity to group related files
- System SHALL associate projects with conversations
- System SHALL persist project metadata (name, description, created date, file count)
- System SHALL maintain project-file relationships in database
- User SHALL be able to view all files within a project
- System SHALL track project structure (directory hierarchy)
- Project state SHALL persist across sessions

**Validation**: Create project with multiple files; verify all files associated; reload conversation and verify project structure intact.

---

### FR-8: File Generation and Display
**Requirement**: Stream generated files and display them with proper formatting as they're created.

**Acceptance Criteria**:
- System SHALL display files as they're generated by LLM
- UI SHALL apply syntax highlighting appropriate to file type
- UI SHALL show file path/name clearly
- UI SHALL display files in order of generation
- System SHALL show file tree for multi-file projects
- Each file MUST be complete with NO TODO comments or placeholder code
- System SHALL validate files are complete before marking as done
- UI SHALL indicate when file generation is in progress vs complete

**Validation**: Request multi-file project; verify files appear progressively; verify syntax highlighting; inspect files for TODOs/placeholders (should find none).

---

### FR-9: Live Preview
**Requirement**: Provide sandboxed live preview of generated web applications.

**Acceptance Criteria**:
- System SHALL render generated HTML/CSS/JS in sandboxed iframe
- Preview SHALL auto-refresh when files are updated
- Sandbox SHALL prevent access to parent page context
- System SHALL handle JavaScript runtime errors gracefully without crashing preview
- User SHALL be able to interact with previewed application
- All project files SHALL be accessible within preview context (relative imports work)
- Preview SHALL display error messages for broken code in user-friendly way

**Validation**: Generate web app; verify preview displays; interact with UI; modify files and verify preview updates; introduce error and verify graceful handling.

---

### FR-10: Project Export
**Requirement**: Allow users to download complete projects as archives.

**Acceptance Criteria**:
- User SHALL be able to download project at any time
- System SHALL package all project files into archive (ZIP format)
- Archive SHALL preserve directory structure
- Archive SHALL include all generated files
- Archive file name SHALL include project name and timestamp
- Download SHALL work for projects of any size (within reasonable limits)

**Validation**: Generate project; download archive; extract and verify all files present with correct structure; verify files run correctly outside the application.

---

### FR-11: Approach Verification Checkpoint
**Requirement**: Require explicit user confirmation before generating code.

**Acceptance Criteria**:
- LLM SHALL present complete approach summary before generating code
- Summary SHALL include: features, file structure, technologies, architecture decisions
- System SHALL wait for explicit user confirmation
- User SHALL be able to request changes to approach
- System SHALL iterate on approach until user approves
- NO code generation SHALL occur without approval
- Approval state SHALL be tracked in conversation history

**Validation**: Request software build; verify LLM stops at verification; reject approach and request changes; verify iteration; approve and verify generation begins.

---

### FR-12: Complete Code Generation
**Requirement**: Generate only complete, working code with no placeholders.

**Acceptance Criteria**:
- Generated files MUST contain fully implemented functionality
- Generated files MUST NOT contain TODO comments
- Generated files MUST NOT contain placeholder functions or stub implementations
- Generated files MUST NOT contain comments like "implement this later"
- LLM SHALL be instructed to generate complete implementations
- System SHOULD validate generated code for placeholder patterns
- If placeholders detected, system SHOULD request LLM regenerate properly

**Validation**: Generate code; search all files for "TODO", "FIXME", "placeholder", stub patterns; verify none found; verify all functions have implementations.

## Success Metrics

[To be defined]
- How do we measure if users are learning?
- How do we measure speed to working software?
- What does success look like?

## Open Questions

- What does "vibe coding" mean in practice for this tool?
- How do we balance teaching moments with flow state?
- What level of technical detail should be surfaced by default?
