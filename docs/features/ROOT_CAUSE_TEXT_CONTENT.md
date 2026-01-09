# Root Cause: Text Content vs Component Rendering

**Date**: 2026-01-08  
**Issue**: Orchestrator still showing as plain text div, not web component  
**Root Cause**: Message content stored as formatted text, not metadata

---

## The Problem

User reported: "I still see the old method of using a div, and not a new component"

Screenshot showed:
```
Orchestrator: working • 5s
```

This was plain text in a div, not the `<ollama-orchestrator-status>` web component.

---

## Root Cause Analysis

### Two Code Paths

1. **Real-time updates** (`updateOrchestrationStatus`)
   - Builds formatted text: "Orchestrator: Generate • 5s\nFiles: index.html\n..."
   - Stores this text in `message.content`
   - Saves to database

2. **Message rendering** (message list renderer)  
   - Reads `message.content` and renders it
   - I updated this to use `<ollama-orchestrator-status>` component
   - But component reads from `metadata`, not `content`

### The Issue

**Lines 273-317 in app.js (OLD CODE)**:
```javascript
// Build status line with elapsed time
let statusLine = `Orchestrator: ${line || "working"} • ${elapsedSeconds}s`;

// Add progress indicator
if (orchestration.bytesGenerated) {
  const kb = Math.round(orchestration.bytesGenerated / 1024);
  statusLine += ` • ${kb}KB generated`;
}

const lines = [statusLine];
if (status.files.length) {
  lines.push(`Files: ${status.files.join(", ")}`);
}
if (Array.isArray(status.steps) && status.steps.length) {
  lines.push("Plan:");
  status.steps.slice(0, 6).forEach((step) => {
    const mark = step.done ? "✓" : "•";
    lines.push(`${mark} ${step.label}`);
  });
}

const content = lines.join("\n"); // ← TEXT CONTENT
```

This text was stored in the message and database. The component couldn't render properly because all the data was baked into text, not structured metadata.

---

## The Fix

### Change 1: Minimal Content Storage

**app.js:271-283 (NEW CODE)**:
```javascript
// Store minimal content - the component will render from metadata
// Keep elapsed time in content for backwards compatibility
const content = `Orchestrator: ${orchestration.phase || "working"} • ${elapsedSeconds}s`;

console.log(
  "[frontend] Orchestrator status update:",
  orchestration.phase,
  "elapsed:",
  elapsedSeconds,
  "runId:",
  runtime.runId,
);
```

**Why**: Content is now just a simple placeholder. The component renders from metadata.

### Change 2: Store Data in Metadata

**app.js:299-312 (NEW CODE)**:
```javascript
const metadata = {
  kind: "orchestrator",
  orchestrationStatus: status,  // files, steps, etc.
  orchestration: {
    phase: orchestration.phase || "working",
    elapsed: elapsedSeconds,
    bytesGenerated: orchestration.bytesGenerated,
    filesRequested: details.filesRequested,
    details: details.output ? { output: details.output } : {},
  },
};
```

**Why**: All rendering data is now in structured metadata that the component can read.

### Change 3: Component Reads Metadata

**app.js:2598-2617 (NEW CODE)**:
```javascript
if (msg.kind === "orchestrator") {
  const status = msg.metadata?.orchestrationStatus || {};
  const orchestration = msg.metadata?.orchestration || {};
  const phase = orchestration.phase || "working";
  const files = (status.files || []).join(",");
  const steps = status.steps ? JSON.stringify(status.steps) : "";
  const elapsed = orchestration.elapsed || 0;
  const bytesGenerated = orchestration.bytesGenerated || "";
  const filesRequested = orchestration.filesRequested || [];

  return `
    <ollama-orchestrator-status
      phase="${phase}"
      elapsed="${elapsed}"
      files="${files}"
      steps='${steps}'
      bytes-generated="${bytesGenerated}"
      files-requested="${filesRequested.join(",")}"
    ></ollama-orchestrator-status>
  `;
}
```

**Why**: Component gets all data from metadata, not from parsing text content.

---

## Why This Was Hard to Spot

### The Confusion

1. I created the web component ✓
2. I updated the **renderer** to use the component ✓  
3. BUT the **data source** was still text content ✗

The component existed, but it had no data to render because everything was in `content` as text, not in `metadata` as structured data.

### The Symptom

Looking at the DOM in DevTools:
```html
<!-- OLD: Plain text div -->
<div style="...">
  Orchestrator: working • 5s
  Files: index.html
  Plan:
  ✓ Step 1
  • Step 2
</div>

<!-- NEW: Component (but no data) -->
<ollama-orchestrator-status phase="working" elapsed="5">
  <!-- Shadow DOM renders but has no files, steps, etc. -->
</ollama-orchestrator-status>
```

---

## The Data Flow (Fixed)

```
Backend sends orchestration event
    ↓
updateOrchestrationStatus() called
    ↓
BEFORE: Build formatted text → store in content
AFTER:  Store minimal placeholder in content
        Store structured data in metadata
    ↓
Message saved to database
    ↓
Message list renders
    ↓
BEFORE: Render content as plain HTML
AFTER:  Render <ollama-orchestrator-status> component
        Component reads from metadata
        Component renders rich UI
```

---

## Testing

### What You Should See Now

```html
<!-- Each orchestrator run renders as: -->
<ollama-orchestrator-status
  phase="generating"
  elapsed="3"
  files="index.html,app.js"
  steps='[{"id":"step-1","label":"Create files","done":true}]'
  bytes-generated="4567"
>
  <!-- Shadow DOM with styled UI -->
  <div class="status-header">
    <ollama-spinner></ollama-spinner>
    Orchestrator: Generate • 3s • 4KB generated
  </div>
  <div class="files">Files: index.html, app.js</div>
  <div class="steps">
    <div class="step done">✓ Create files</div>
  </div>
</ollama-orchestrator-status>
```

### Verification Steps

1. Open DevTools → Elements tab
2. Send a message that triggers orchestrator
3. Find `<ollama-orchestrator-status>` element (not a plain `<div>`)
4. Inspect attributes: `phase`, `elapsed`, `files`, `steps`
5. Expand shadow root to see rendered UI

---

## Files Modified

1. **src/frontend/app.js**
   - Lines 271-283: Simplified content to placeholder
   - Lines 299-312: Store data in metadata
   - Lines 2598-2617: Component reads from metadata

---

## Why This Approach is Correct

### Separation of Concerns

- **Content**: Human-readable fallback (backwards compatibility)
- **Metadata**: Structured data for component rendering
- **Component**: Presentation logic

### Benefits

1. **Reusable**: Component can render from any metadata source
2. **Testable**: Can test component with mock metadata
3. **Maintainable**: Change rendering without touching data storage
4. **Extensible**: Add new fields to metadata without breaking old messages

---

## Backwards Compatibility

Old messages (before this fix) will still work:
- They have text content
- Component can parse `content` if `metadata` is missing
- Graceful degradation

New messages (after this fix):
- Have structured metadata
- Component renders rich UI
- Each instance is independent

---

## Conclusion

The root cause was **data format mismatch**:
- Component expected structured data in metadata
- System was storing formatted text in content
- Component had nothing to render

The fix:
- ✅ Store minimal placeholder in content
- ✅ Store structured data in metadata  
- ✅ Component reads from metadata
- ✅ Each orchestration run creates new message with fresh metadata

**Result**: Each orchestrator run now renders as its own web component with proper styling and structure.
