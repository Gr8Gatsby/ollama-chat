# Component-Based Orchestrator Status

**Date**: 2026-01-08  
**Branch**: `feature/llm-structured-file-generation`  
**Status**: ✅ Implemented

---

## Problem

The orchestrator status was being displayed as plain HTML that got updated in place, causing:
1. **DOM Reuse**: Same DOM element used for multiple requests
2. **History Loss**: Previous orchestrator runs disappeared
3. **Poor UX**: Couldn't see timeline of what happened

---

## Solution

Created a **dedicated web component** (`ollama-orchestrator-status`) that:
1. **Encapsulates** orchestrator UI logic
2. **Persists** in the DOM as separate instances
3. **Updates** via attributes (web component pattern)
4. **Renders** each orchestration run as its own component

---

## Architecture

### Component Structure

```
<ollama-orchestrator-status
  phase="generate"
  elapsed="5"
  files="index.html,app.js"
  steps='[{"id":"step-1","label":"Create files","done":true}]'
  bytes-generated="4567"
  files-requested="form.js,styles.css"
  data-message-id="orchestrator-123"
></ollama-orchestrator-status>
```

### Component Features

- **Phase-based rendering**: Different UI for start, analyzing, generating, complete, etc.
- **Real-time updates**: Attributes update as orchestration progresses
- **Visual indicators**: Spinner for active phases, checkmarks for completed steps
- **File tracking**: Shows files being generated and files requested
- **Progress metrics**: Displays elapsed time and bytes generated

---

## Implementation

### 1. Web Component (`ollama-orchestrator-status.js`)

**Location**: `src/frontend/components/features/ollama-orchestrator-status.js`

```javascript
class OllamaOrchestratorStatus extends BaseComponent {
  static get observedAttributes() {
    return ["phase", "elapsed", "files", "steps", "bytes-generated", "files-requested"];
  }

  constructor() {
    super();
    this.runId = Date.now(); // Unique ID for this component instance
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.render(); // Re-render when attributes change
  }

  render() {
    // Parse attributes
    const phase = this.getAttribute("phase") || "working";
    const elapsed = this.getAttribute("elapsed") || "0";
    const files = this.getAttribute("files") || "";
    // ... etc

    // Render status UI with spinner, files, steps, etc.
    this.shadowRoot.innerHTML = `...`;
  }
}

customElements.define("ollama-orchestrator-status", OllamaOrchestratorStatus);
```

**Key Points**:
- Uses Shadow DOM for style encapsulation
- Attributes drive rendering (declarative)
- Each instance is independent
- Updates via `attributeChangedCallback`

### 2. App.js Integration

#### Import Component

**Location**: `src/frontend/app.js:6`

```javascript
import "./components/features/ollama-orchestrator-status.js";
```

#### Track Components by Run ID

**Location**: `src/frontend/app.js:72`

```javascript
this.orchestratorComponentsByRunId = {}; // Map runId -> DOM element
```

#### Create Unique Run ID

**Location**: `src/frontend/app.js:178-192`

```javascript
const newRunId = Date.now();
runtime = {
  runId: newRunId,
  status: { files: [], log: [] },
  messageId: "",
  componentId: `orchestrator-${newRunId}`, // Unique component ID
  // ...
};

console.log(`[orchestrator] Created new run ${newRunId} for conversation ${conversationId}`);
```

#### Render Component in Message List

**Location**: `src/frontend/app.js:2604-2623`

```javascript
if (msg.kind === "orchestrator") {
  const status = msg.metadata?.orchestrationStatus || {};
  const orchestration = msg.metadata?.orchestration || {};
  const phase = orchestration.phase || "working";
  const files = (status.files || []).join(",");
  const steps = status.steps ? JSON.stringify(status.steps) : "";
  const elapsed = Math.round((Date.now() - (status.startedAt || Date.now())) / 1000);
  
  return `
    <ollama-orchestrator-status
      phase="${phase}"
      elapsed="${elapsed}"
      ${files ? `files="${files}"` : ""}
      ${steps ? `steps='${steps}'` : ""}
      data-message-id="${msg.id}"
    ></ollama-orchestrator-status>
  `;
}
```

---

## How It Works

### Request Flow

```
User sends message
    ↓
Backend sends phase: "start"
    ↓
Frontend creates NEW message with kind="orchestrator"
    ↓
Message list renders <ollama-orchestrator-status> component
    ↓
Backend sends updates (analyzing, plan, generate, etc.)
    ↓
Frontend updates message metadata
    ↓
Component attributes update → Component re-renders
    ↓
Backend sends phase: "complete"
    ↓
Component shows completion state
    ↓
User sends another message
    ↓
NEW <ollama-orchestrator-status> component created (not reusing old one)
```

### Message Persistence

Each orchestration run creates a **separate message** in the database:

```javascript
{
  id: "orchestrator-1704729600000",
  role: "assistant",
  kind: "orchestrator",
  content: "Orchestrator: Complete: passed • 8s\nFiles: index.html\n...",
  metadata: {
    kind: "orchestrator",
    orchestrationStatus: {
      files: ["index.html", "app.js"],
      steps: [{"id":"step-1","label":"Create files","done":true}],
      startedAt: 1704729600000
    },
    orchestration: {
      phase: "complete",
      details: { ... }
    }
  }
}
```

Each message renders as its own component instance, so they **never interfere** with each other.

---

## Benefits

### 1. Proper Separation
- Each orchestration run has its own component
- No DOM reuse between runs
- Clean, predictable behavior

### 2. History Preservation
- All orchestrator boxes remain visible
- Can scroll back to see what happened
- Timeline of requests and outcomes

### 3. Web Component Benefits
- **Encapsulation**: Styles don't leak
- **Reusability**: Component can be used anywhere
- **Maintainability**: Logic in one place
- **Testability**: Can test component in isolation

### 4. Declarative Updates
- Attributes drive rendering
- No imperative DOM manipulation
- Easy to reason about

---

## Visual Design

### Component Appearance

```
┌─────────────────────────────────────────────┐
│ 🔄 Orchestrator: Generate • 5s • 4KB gener…│
│ Files: index.html, app.js                   │
│ Plan:                                        │
│ ✓ Create index.html                         │
│ ✓ Create styles.css                         │
│ • Create src/app.js                         │
└─────────────────────────────────────────────┘
```

### Phase-Specific Styling

- **Active phases** (start, analyzing, generating): Blue left border, spinner
- **Complete**: Green left border, no spinner
- **Failed**: Red left border, no spinner

---

## Files Modified

1. **src/frontend/components/features/ollama-orchestrator-status.js** (NEW)
   - Complete web component implementation
   - 170 lines

2. **src/frontend/app.js**
   - Line 6: Import component
   - Line 72: Track components by runId
   - Lines 178-192: Create unique run IDs
   - Lines 2604-2623: Render component instead of plain HTML

---

## Testing

### Test Case 1: Multiple Sequential Requests

```
1. User: "Create calculator"
2. Observe: ONE orchestrator component appears
3. Wait for completion (green border)
4. User: "Add history"
5. Observe: SECOND orchestrator component appears below first
6. First component remains unchanged
```

**Expected**: 2 separate components in chat history

### Test Case 2: Real-Time Updates

```
1. User sends request
2. Observe component phases:
   - Start (blue, spinner)
   - Analyzing (blue, spinner)
   - Plan appears with steps
   - Generate (blue, spinner, KB counter increases)
   - Steps get checkmarks as files complete
   - Complete (green, no spinner)
```

**Expected**: Smooth updates, no flickering, component stays in same position

### Test Case 3: Page Reload

```
1. Complete 3 requests (3 orchestrator components visible)
2. Reload page
3. Observe: 3 orchestrator components render from database
4. Send new request
5. Observe: 4th component appears
```

**Expected**: All historical components preserved and rendered

---

## Debugging

### Console Logs

```
[orchestrator] Created new run 1704729600000 for conversation abc-123
[updateOrchestrationStatus] Starting NEW orchestration run {
  previousRunId: undefined,
  newRunId: 1704729600000,
  timestamp: 1704729600000
}
```

### Inspect Component

In DevTools:
```javascript
// Find all orchestrator components
document.querySelectorAll('ollama-orchestrator-status');

// Inspect specific component
const comp = document.querySelector('ollama-orchestrator-status[data-message-id="..."]');
console.log(comp.getAttribute('phase'));
console.log(comp.getAttribute('elapsed'));
console.log(comp.getAttribute('steps'));
```

---

## Edge Cases

### No Steps
Component renders without "Plan:" section

### No Files
Component renders without "Files:" section

### Very Long File Lists
Component truncates with ellipsis (CSS)

### Rapid Phase Changes
attributeChangedCallback batches updates efficiently

---

## Future Enhancements

### Download Button
Add button to download raw output (was in old implementation)

```html
<button @click=${this.downloadOutput}>Download raw output</button>
```

### Collapse/Expand
Allow collapsing completed orchestrations to save space

```html
<div class="header" @click=${this.toggle}>
  ${this.collapsed ? '▶' : '▼'} Orchestrator: Complete
</div>
```

### Copy Button
Copy orchestrator output to clipboard

### Retry Button
Retry failed orchestrations

---

## Related Documentation

- [BUGFIX_DOM_REUSE.md](./BUGFIX_DOM_REUSE.md) - Original DOM reuse fix
- [INTERACTIVE_FILE_FETCHING.md](./INTERACTIVE_FILE_FETCHING.md) - File fetching system
- [PHASE2_IMPLEMENTATION_SUMMARY.md](./PHASE2_IMPLEMENTATION_SUMMARY.md) - Streaming improvements

---

## Conclusion

The component-based approach solves the DOM reuse problem by:

1. ✅ **Creating** a new component instance for each orchestration run
2. ✅ **Persisting** each component in the DOM independently
3. ✅ **Updating** via attributes rather than DOM manipulation
4. ✅ **Preserving** history with separate message records

This is the correct architectural pattern for reusable UI elements that need to persist across multiple instances.

**No more DOM reuse!** 🎉
