# Orchestrator Architecture V2: Metadata on AI Response

**Date**: 2026-01-08  
**Current Status**: ❌ Needs Implementation  
**Goal**: Orchestrator status as part of AI response, not separate message

---

## User Requirement

> "I want each time the ollama-ai-response runs to have an ollama-orchestrator component that has the summary of what the orchestrator did. And this is part of the conversation history that needs to be preserved."

The orchestrator status should be:
1. **Part of the AI's response**, not a separate message
2. **Rendered inside** the `<ollama-ai-response>` component
3. **Preserved** in conversation history as metadata on the response

---

## Current Architecture (WRONG)

### Message Structure
```javascript
// User message
{
  role: "user",
  content: "Create a calculator",
}

// SEPARATE orchestrator message  ❌
{
  role: "assistant",
  kind: "orchestrator",  ← Separate message type
  content: "Orchestrator: Complete • 8s",
  metadata: { orchestrationStatus: {...} }
}

// AI response message
{
  role: "assistant",
  content: "Files updated:\n- index.html\n- app.js",
}
```

**Problems**:
- Creates 2 messages per response (orchestrator + content)
- Orchestrator message can be reused/overwritten
- Not clear which AI response the orchestrator status belongs to

---

## Correct Architecture (V2)

### Message Structure
```javascript
// User message
{
  role: "user",
  content: "Create a calculator",
}

// AI response with embedded orchestration metadata ✓
{
  role: "assistant",
  content: "Files updated:\n- index.html\n- app.js",
  metadata: {
    orchestrationStatus: {
      files: ["index.html", "app.js"],
      steps: [
        {id: "step-1", label: "Create index.html", done: true},
        {id: "step-2", label: "Create app.js", done: true}
      ],
      startedAt: 1704729600000
    },
    orchestration: {
      phase: "complete",
      elapsed: 8,
      bytesGenerated: 4567,
      filesRequested: ["project.spec.md"]
    }
  }
}
```

**Benefits**:
- ONE message per response
- Orchestration metadata belongs to the AI response
- Clear relationship between content and orchestration
- Each response has its own orchestration history

---

## Rendering

### Component Hierarchy
```html
<ollama-ai-response
  content="Files updated..."
  timestamp="..."
  model="qwen3-coder:30b"
>
  <!-- Main content (default slot) -->
  <ollama-markdown-renderer content="Files updated..."></ollama-markdown-renderer>
  
  <!-- Orchestration status (details slot) -->
  <ollama-orchestrator-status
    slot="details"
    phase="complete"
    elapsed="8"
    files="index.html,app.js"
    steps='[...]'
  ></ollama-orchestrator-status>
</ollama-ai-response>
```

The `ollama-ai-response` component already has:
- Default slot for content
- **`details` slot** for additional information (line 103 in ollama-ai-response.js)

We use the `details` slot for the orchestrator component!

---

## Implementation Plan

### Step 1: Change Message Creation

**Current** (`updateOrchestrationStatus`):
```javascript
// Creates SEPARATE orchestrator message
const persistedMessage = {
  id: `orchestrator-${Date.now()}`,
  role: "assistant",
  kind: "orchestrator",  ← Separate
  content: "Orchestrator: working...",
  metadata: {...}
};
this.appendMessage(conversationId, persistedMessage);
```

**New** (`updateOrchestrationStatus`):
```javascript
// Attach metadata to LAST ASSISTANT message
const messages = this.messagesByConversation[conversationId] || [];
const lastAssistant = messages
  .reverse()
  .find(msg => msg.role === "assistant" && msg.kind !== "orchestrator");

if (lastAssistant) {
  lastAssistant.metadata = {
    ...lastAssistant.metadata,
    orchestrationStatus: status,
    orchestration: {
      phase: orchestration.phase,
      elapsed: elapsedSeconds,
      bytesGenerated: orchestration.bytesGenerated,
      filesRequested: details.filesRequested,
    }
  };
  
  // Update in database
  await updateMessage(conversationId, lastAssistant.id, {
    content: lastAssistant.content,
    metadata: lastAssistant.metadata,
  });
  
  this.scheduleRender();  // Re-render to show updated component
}
```

### Step 2: Update Rendering

**Already Done** (lines 2638-2662 in app.js):
```javascript
// Check if this message has orchestration metadata
const hasOrchestration = msg.metadata?.orchestrationStatus || msg.metadata?.orchestration;
const orchestratorHtml = hasOrchestration ? `
  <ollama-orchestrator-status
    slot="details"
    phase="${phase}"
    elapsed="${elapsed}"
    files="${files}"
    steps='${steps}'
    bytes-generated="${bytesGenerated}"
    files-requested="${filesRequested}"
  ></ollama-orchestrator-status>
` : '';

return `
  <ollama-ai-response ...>
    ${orchestratorHtml}  ← Renders inside ai-response
  </ollama-ai-response>
`;
```

### Step 3: Remove Standalone Orchestrator Messages

**Already Done** (line 2599 in app.js):
```javascript
if (msg.kind === "orchestrator") {
  console.warn("[render] Unexpected standalone orchestrator message:", msg.id);
  return ""; // Don't render
}
```

---

## Key Changes Needed

### File: `src/frontend/app.js`

#### Change 1: `updateOrchestrationStatus` (lines 161-430)

Replace entire function to:
1. NOT create separate messages
2. Find last assistant message
3. Attach metadata to that message
4. Update database
5. Trigger re-render

#### Change 2: Handle "start" phase (lines 165-195)

When `phase === "start"`:
- Initialize runtime tracking
- DO NOT create a message yet (wait for assistant message to exist)
- Set flag that orchestration is active

#### Change 3: Handle subsequent phases (lines 200+)

When other phases arrive:
- Find last assistant message
- Update its metadata
- Trigger re-render

---

## Handling Race Conditions

### Problem: Orchestration "start" before assistant message exists

```
Backend sends: phase="start"
    ↓
Frontend: No assistant message yet!
    ↓
Backend sends: content chunks
    ↓
Frontend: Creates assistant message
    ↓
Backend sends: phase="plan"
    ↓
Frontend: Attach metadata to assistant message ✓
```

### Solution: Buffer orchestration updates

```javascript
if (!lastAssistantMessage) {
  // Buffer the orchestration update
  runtime.pendingUpdates = runtime.pendingUpdates || [];
  runtime.pendingUpdates.push({
    orchestrationStatus: status,
    orchestration: {...}
  });
  return;
}

// When assistant message is created, apply buffered updates
if (runtime.pendingUpdates) {
  runtime.pendingUpdates.forEach(update => {
    lastAssistantMessage.metadata = {
      ...lastAssistantMessage.metadata,
      ...update
    };
  });
  runtime.pendingUpdates = [];
}
```

---

## Testing

### Test Case 1: Single Request

```
1. User: "Create calculator"
2. Observe: ONE ollama-ai-response component
3. Inside it: ollama-orchestrator-status component
4. Orchestrator shows phases: start → plan → generate → complete
5. Final: AI response with orchestrator status embedded
```

### Test Case 2: Multiple Requests

```
1. User: "Create calculator"
2. Wait for completion
3. User: "Add history"
4. Observe: TWO ollama-ai-response components
5. Each has its own orchestrator status
6. First shows "Complete", second shows active generation
```

### Test Case 3: Page Reload

```
1. Complete 3 requests
2. Reload page
3. Observe: 3 ollama-ai-response components
4. Each has orchestrator status preserved in metadata
5. Rendered from database correctly
```

---

## Migration Path

### Phase 1: Implement new architecture
- Modify `updateOrchestrationStatus` to attach metadata
- Keep old code commented out for rollback

### Phase 2: Test thoroughly
- Verify orchestrator shows in ai-response
- Verify no duplicate messages
- Verify history preserved

### Phase 3: Clean up
- Remove old orchestrator message creation code
- Remove kind="orchestrator" handling
- Update database queries if needed

---

## Files to Modify

1. **src/frontend/app.js**
   - Lines 161-430: `updateOrchestrationStatus` - Complete rewrite
   - Lines 1836-1846: `updateLastAssistantMessage` - May need helper
   - Lines 2597-2600: Remove standalone orchestrator rendering (done)
   - Lines 2638-2662: Render orchestrator in ai-response (done)

2. **src/backend/index.js** (optional)
   - Consider sending orchestration updates less frequently
   - Or send them with a reference to the response being generated

---

## Success Criteria

- [ ] Orchestrator component renders INSIDE ollama-ai-response
- [ ] ONE message per AI response (not two)
- [ ] Each response has its own orchestrator history
- [ ] Page reload preserves orchestrator status
- [ ] No message reuse issues
- [ ] Conversation history makes sense

---

## Conclusion

The correct architecture is:
- ✅ ONE message per AI response
- ✅ Orchestration metadata attached to that message
- ✅ Orchestrator component rendered in `details` slot
- ✅ Clear 1:1 relationship between response and orchestration

This is how it should have been designed from the start. Each AI response should encapsulate all information about how it was generated, including orchestration status.
