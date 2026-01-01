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

### Core User Journey
[To be defined]

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

## Success Metrics

[To be defined]
- How do we measure if users are learning?
- How do we measure speed to working software?
- What does success look like?

## Open Questions

- What does "vibe coding" mean in practice for this tool?
- How do we balance teaching moments with flow state?
- What level of technical detail should be surfaced by default?
