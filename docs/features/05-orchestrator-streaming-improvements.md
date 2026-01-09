# Feature: Orchestrator & Streaming Improvements

## Metadata

**Feature ID**: F-05  
**Status**: 🟡 In Progress  
**Started**: 2026-01-07  
**Dependencies**: F-04 (LLM Structured File Generation)

## Problem Statement

After implementing the structured file generation system, we've identified critical issues with the Orchestrator and streaming architecture that prevent a good user experience:

### Current Issues

1. **Orchestrator Not Doing Multi-Pass Planning** ❌
   - Only does 1 attempt with minimal validation retry logic
   - Plan generation happens but isn't used to guide multi-step execution
   - No iterative refinement or breakdown of complex tasks
   - Plan steps are tracked but don't drive actual generation phases

2. **Streaming Status Updates Too Slow** 🐌
   - Status updates only sent when detecting "```" or "File:" markers
   - No periodic heartbeat during long generation periods
   - User sees nothing for 5-10+ seconds during generation
   - Status appears "stuck" during validation or large file generation

3. **File Validation & Project Addition Issues** ⚠️
   - Validation only checks file existence, not content quality
   - File extraction is regex-based and fragile
   - Project recovery extracts from all messages without deduplication
   - Can create duplicate/conflicting files

### Impact

- **Poor Quality Outputs**: Single-pass generation produces incomplete or incorrect code
- **Frustrating UX**: Users think the system is frozen during generation
- **Data Integrity**: Invalid files make it into projects
- **Performance**: Synchronous database writes on every status update

## Critical Fragile Areas

| Area | File:Line | Issue | Impact |
|------|-----------|-------|--------|
| **Orchestrator Loop** | `index.js:358-442` | Single-pass only, no iterative refinement | Poor quality outputs |
| **Plan Execution** | `index.js:343-354` | Plan generated but not used to drive execution | Plans are decorative |
| **Status Streaming** | `index.js:397-425` | Only updates on markers, no heartbeat | Appears frozen |
| **Validation Logic** | `index.js:264-292` | Only checks file existence | Bad files pass through |
| **File Extraction** | `index.js:215-242` | Regex-based, fragile parsing | Missing files silently |
| **Project Recovery** | `app.js:1230-1280` | Extracts from all messages, no dedup | Duplicate/conflicting files |
| **Status Updates** | `app.js:232-315` | Synchronous DB writes on every update | Performance bottleneck |
| **Content Validation** | No validation | Extracted files never validated | Broken code deployed |

## Goals

1. **Real-Time Streaming** - User sees updates within 500ms, never waits >2s without feedback
2. **Robust Validation** - Only valid, complete files make it to projects
3. **Multi-Pass Planning** - Orchestrator uses plans to drive iterative generation (future)
4. **Performance** - Debounced database writes, optimized rendering

## Proposed Solution

### Phase 1: Fix Orchestrator Multi-Pass Planning 🎯

**Status**: 📋 Planned for Future Implementation

**Goal**: Make the orchestrator actually use plans to drive iterative generation.

**Changes to `src/backend/index.js`**:

```javascript
// 1. Change maxAttempts to support quality refinement (not just error recovery)
const maxAttempts = 3; // Allow iterative improvement

// 2. Implement step-by-step execution
async function executeStep(step, context) {
  // Generate content for ONE step
  // Validate step output
  // Return result + next action
}

// 3. Add quality validation (not just structure)
function validateStepOutput(content, step) {
  // Check syntax
  // Validate references
  // Assess completeness
  return { ok: boolean, issues: [], suggestions: [] };
}

// 4. Implement feedback loop
while (attempt < maxAttempts) {
  for (const step of planSteps) {
    const result = await executeStep(step, context);
    if (result.needsRefinement) {
      // Add refinement step to plan
      planSteps.push(result.refinementStep);
    }
  }
  
  // Validate overall output
  const validation = validateQuality(allOutput);
  if (validation.ok) break;
  
  // Use validation feedback for next attempt
  context.feedback = validation.issues;
  attempt++;
}
```

**Expected Behavior**:
- Plans broken into 3-6 executable steps
- Each step generates specific files/components
- Validation after each step catches issues early
- Failed steps trigger refinement sub-tasks
- Multi-pass improves quality progressively

**Implementation Steps**:
1. Create `executeStep()` function for step-by-step generation
2. Add quality validation beyond structure checks
3. Implement feedback collection and injection
4. Update plan structure to support sub-tasks
5. Add logging for observability

---

### Phase 2: Real-Time Streaming Status ⚡

**Status**: 🔄 In Progress

**Goal**: User sees updates within 500ms, never waits more than 2 seconds without feedback.

#### Backend Changes (`src/backend/index.js`)

**1. Add Heartbeat Mechanism**

```javascript
// Send periodic updates even when no content is generated
const statusHeartbeat = setInterval(() => {
  sendNdjson(res, {
    message: { content: "" },
    done: false,
    orchestration: {
      phase: "generating",
      heartbeat: true,
      elapsed: Date.now() - startTime
    }
  });
}, 1000); // Every 1 second

// Clear heartbeat when stream completes
req.on('close', () => clearInterval(statusHeartbeat));
```

**2. Immediate Phase Change Notifications**

```javascript
function updatePhase(phase, details = {}) {
  sendNdjson(res, {
    message: { content: "" },
    done: false,
    orchestration: { 
      phase, 
      ...details, 
      timestamp: Date.now() 
    }
  });
}

// Use at every phase transition
updatePhase('plan', { steps: planSteps });
updatePhase('generate', { attempt: attemptsUsed });
updatePhase('validate', { validation: 'passed' });
```

**3. Progressive Chunk Tracking**

```javascript
let chunkBuffer = "";
let lastUpdateBytes = 0;

for await (const chunk of stream) {
  chunkBuffer += chunkText;
  
  // Send mini-updates for long generations (every 500 bytes)
  if (chunkBuffer.length - lastUpdateBytes > 500) {
    sendNdjson(res, {
      message: { content: "" },
      done: false,
      orchestration: {
        phase: "generating",
        bytesGenerated: chunkBuffer.length,
        elapsed: Date.now() - startTime
      }
    });
    lastUpdateBytes = chunkBuffer.length;
  }
}
```

#### Frontend Changes (`src/frontend/app.js`)

**1. Debounce Database Writes**

```javascript
// Add to OllamaFrontendApp constructor
this.orchestrationUpdateTimers = {};

async updateOrchestrationStatus(conversationId, orchestration) {
  // Update UI immediately (optimistic)
  const runtime = this.orchestrationRuntimeByConversation[conversationId] || {};
  
  // ... update runtime status ...
  
  // Update UI immediately
  this.scheduleRender();
  
  // Debounce database writes
  const timerId = this.orchestrationUpdateTimers[conversationId];
  if (timerId) clearTimeout(timerId);
  
  this.orchestrationUpdateTimers[conversationId] = setTimeout(async () => {
    try {
      if (runtime.messageId) {
        await updateMessage(conversationId, runtime.messageId, {
          content,
          metadata,
        });
      }
    } catch (error) {
      console.warn("[frontend] Failed to persist orchestrator message:", error);
    }
    delete this.orchestrationUpdateTimers[conversationId];
  }, 2000); // Write every 2 seconds max
}
```

**2. Show Elapsed Time and Progress**

```javascript
// Update status display to show elapsed time
const elapsedSeconds = Math.max(
  0,
  Math.round((Date.now() - status.startedAt) / 1000),
);

const lines = [`Orchestrator: ${line || "working"} • ${elapsedSeconds}s`];

// Add progress indicator
if (orchestration.bytesGenerated) {
  const kb = Math.round(orchestration.bytesGenerated / 1024);
  lines.push(`Generated: ${kb}KB`);
}
```

**3. Heartbeat Visual Feedback**

```javascript
// Add heartbeat tracking to runtime
if (orchestration.heartbeat) {
  runtime.lastHeartbeat = Date.now();
  runtime.isAlive = true;
}

// Show visual indicator when alive
const isActive = runtime.lastHeartbeat && 
                 (Date.now() - runtime.lastHeartbeat) < 2000;

if (isActive) {
  lines.unshift("🟢 Active");
} else {
  lines.unshift("⏸️ Waiting");
}
```

**Expected Behavior**:
- User sees update within 500ms of generation starting
- Heartbeat every 1s shows "still working" 
- File completions appear as they're detected
- Elapsed time shown throughout
- Progress indicator for long generations
- No frozen UI states

---

### Phase 3: Robust File Validation & Addition ✅

**Status**: 📋 Planned for Next Sprint

**Goal**: Only valid, complete files make it to the project. No duplicates or conflicts.

#### File Extraction Improvements (`src/backend/index.js`)

**1. Enhanced Extraction with Validation**

```javascript
function extractFilesFromContent(content) {
  const files = [];
  
  // Current regex-based extraction
  const rawFiles = extractFilesFromContentRegex(content);
  
  // Validate each extracted file
  for (const file of rawFiles) {
    const validation = validateFileContent(file);
    if (!validation.ok) {
      console.warn(`[extractFiles] Invalid file ${file.path}: ${validation.reason}`);
      continue; // Skip invalid files
    }
    files.push(file);
  }
  
  // Deduplicate files (last wins)
  const fileMap = new Map();
  files.forEach(f => fileMap.set(f.path, f));
  
  return Array.from(fileMap.values());
}
```

**2. Content Validation**

```javascript
function validateFileContent(file) {
  // Check minimum content length
  if (file.content.trim().length < 10) {
    return { ok: false, reason: 'Content too short' };
  }
  
  // Check for common placeholders
  const placeholders = ['TODO', 'FIXME', '...', 'PLACEHOLDER', 'TBD'];
  const hasPlaceholder = placeholders.some(p => 
    file.content.toUpperCase().includes(p)
  );
  if (hasPlaceholder) {
    return { ok: false, reason: 'Contains placeholders' };
  }
  
  // Syntax check for JavaScript files
  if (file.language === 'javascript' || file.path.endsWith('.js')) {
    try {
      // Simple parse check (don't execute)
      new Function(file.content);
    } catch (e) {
      return { ok: false, reason: `Syntax error: ${e.message}` };
    }
  }
  
  // Check for balanced braces/brackets (basic structural check)
  const open = (file.content.match(/[{[(]/g) || []).length;
  const close = (file.content.match(/[}\])]/g) || []).length;
  if (Math.abs(open - close) > 5) { // Allow some tolerance
    return { ok: false, reason: 'Unbalanced braces' };
  }
  
  return { ok: true };
}
```

#### Project Addition Improvements (`src/frontend/app.js`)

**1. File Deduplication**

```javascript
async function ensureProjectFromMessages(conversationId, force = false) {
  if (!conversationId || this.projectRecoveryInFlight.has(conversationId)) {
    return;
  }
  
  const project = this.projectByConversation[conversationId];
  if (!project?.id) return;

  this.projectRecoveryInFlight.add(conversationId);
  
  try {
    const files = await fetchProjectFiles(project.id);
    const hasUserFiles = files.some(
      (file) => file.path && !file.path.startsWith("project."),
    );
    if (hasUserFiles && !force) return;

    const messages = this.messagesByConversation[conversationId] || [];
    
    // Use Map for deduplication (newer messages override older)
    const fileMap = new Map();
    
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      const rawOutput =
        message.metadata?.rawOutput ||
        message.metadata?.orchestration?.details?.output ||
        message.content ||
        "";
      const extracted = this.extractFilesFromContent(rawOutput);
      
      // Add to map (newer messages override)
      extracted.forEach(file => {
        if (this.validateProjectFile(file)) {
          fileMap.set(file.path, file);
        }
      });
    }

    // Write deduplicated files
    for (const file of fileMap.values()) {
      await upsertProjectFile(project.id, file);
    }

    await this.ensureProjectScaffold(project.id, project);
    await this.reconcileProjectManifest(project.id);
    this.projectFileContentByProject[project.id] = {};
    await this.loadProject(conversationId, { skipRecovery: true });
  } catch (error) {
    console.warn("[frontend] Failed to recover project files:", error);
  } finally {
    this.projectRecoveryInFlight.delete(conversationId);
  }
}
```

**2. File Validation**

```javascript
validateProjectFile(file) {
  // Path security checks
  if (!file.path || file.path.includes('..') || file.path.startsWith('/')) {
    console.warn(`[validateProjectFile] Invalid path: ${file.path}`);
    return false;
  }
  
  // Content quality checks
  if (!file.content || file.content.trim().length < 10) {
    console.warn(`[validateProjectFile] Content too short: ${file.path}`);
    return false;
  }
  
  // No hidden system files (except project.* files)
  if (file.path.startsWith('.') && !file.path.startsWith('project.')) {
    console.warn(`[validateProjectFile] System file rejected: ${file.path}`);
    return false;
  }
  
  return true;
}
```

---

### Phase 4: Additional Improvements 🔧

**Status**: 📋 Future Consideration

#### 1. Structured Logging

```javascript
function logOrchestration(conversationId, phase, details) {
  console.log(JSON.stringify({
    timestamp: Date.now(),
    conversationId,
    phase,
    ...details
  }));
}

// Use throughout orchestration flow
logOrchestration(conversationId, 'plan_generated', { steps: planSteps.length });
logOrchestration(conversationId, 'generation_started', { attempt: 1 });
logOrchestration(conversationId, 'validation_failed', { reason: validation.reason });
```

#### 2. Metrics Collection

```javascript
// Track orchestrator performance
const metrics = {
  conversationId,
  startTime: Date.now(),
  planGenerationTime: 0,
  executionTime: 0,
  validationTime: 0,
  totalAttempts: 0,
  filesGenerated: 0,
  bytesGenerated: 0
};

// Log metrics at completion
logOrchestration(conversationId, 'completed', metrics);
```

#### 3. Error Recovery

```javascript
try {
  for await (const chunk of stream) {
    // ... process chunk
  }
} catch (error) {
  if (error.name === 'AbortError') {
    // User cancelled - save partial progress
    logOrchestration(conversationId, 'cancelled_by_user', { 
      filesGenerated: files.length 
    });
    
    // Save what we have so far
    if (files.length > 0) {
      await savePartialProgress(conversationId, files);
    }
  } else {
    // Unexpected error - log and notify user
    logOrchestration(conversationId, 'error', { 
      error: error.message,
      stack: error.stack 
    });
    
    sendNdjson(res, {
      message: { content: "" },
      done: true,
      orchestration: { 
        phase: 'error', 
        error: error.message 
      }
    });
  }
}
```

## Implementation Plan

### Priority 1: Phase 2 - Real-Time Streaming (Current Sprint) ⚡

**Why First**: Quick wins, visible user impact, no breaking changes

**Tasks**:
1. ✅ Add heartbeat mechanism to backend stream handler
2. ✅ Add immediate phase change notifications
3. ✅ Add progressive chunk tracking
4. ✅ Debounce database writes in frontend
5. ✅ Add elapsed time display
6. ✅ Add heartbeat visual feedback
7. ⏳ Test streaming improvements end-to-end

**Estimated Effort**: 4-6 hours  
**Risk**: Low - additive changes only

---

### Priority 2: Phase 3 - File Validation (Next Sprint) ✅

**Why Second**: Prevents bad data from accumulating, defensive programming

**Tasks**:
1. Enhance file extraction with validation
2. Add content validation function
3. Implement file deduplication in project recovery
4. Add validateProjectFile method
5. Update error handling and logging
6. Test with intentionally malformed inputs

**Estimated Effort**: 6-8 hours  
**Risk**: Medium - changes data processing pipeline

---

### Priority 3: Phase 1 - Multi-Pass Planning (Future Sprint) 🎯

**Why Last**: Most complex, builds on solid foundation from P2/P3

**Tasks**:
1. Design step execution architecture
2. Implement executeStep function
3. Add quality validation beyond structure
4. Implement feedback loop
5. Update plan structure for sub-tasks
6. Add comprehensive logging
7. Test with complex multi-file projects

**Estimated Effort**: 12-16 hours  
**Risk**: High - fundamental change to orchestration logic

---

### Priority 4: Phase 4 - Additional Improvements (Ongoing) 🔧

**Why Optional**: Nice-to-haves that improve observability and robustness

**Tasks**:
1. Add structured logging throughout
2. Implement metrics collection
3. Add error recovery with partial progress saving
4. Create monitoring dashboard (future)

**Estimated Effort**: 4-6 hours  
**Risk**: Low - orthogonal to core functionality

## Success Criteria

### Phase 2 (Streaming)
- [ ] User sees first status update within 500ms
- [ ] Heartbeat updates visible every 1-2 seconds
- [ ] Elapsed time displays throughout generation
- [ ] No "frozen" UI states reported by users
- [ ] Database write frequency reduced by >80%

### Phase 3 (Validation)
- [ ] No syntax-invalid JavaScript files in projects
- [ ] No duplicate files from message recovery
- [ ] No files with TODO/FIXME placeholders
- [ ] Validation warnings logged for debugging
- [ ] File extraction success rate >95%

### Phase 1 (Multi-Pass)
- [ ] Plans drive actual generation steps
- [ ] Each step validates before proceeding
- [ ] Failed steps trigger refinement
- [ ] Multi-pass improves quality measurably
- [ ] Orchestrator completes 90% of tasks without user intervention

## Architecture Decisions

### Key Decisions Made

1. **Heartbeat Interval**: 1 second (balance between responsiveness and overhead)
2. **Database Write Debounce**: 2 seconds (balance between data loss risk and performance)
3. **Chunk Update Threshold**: 500 bytes (roughly 1-2 sentences, feels responsive)
4. **Validation Strictness**: Warn but don't block (allow LLM to iterate and fix)
5. **Deduplication Strategy**: Last wins (newer messages override older ones)

### Open Questions

1. **Step-by-step vs batch generation**: Should orchestrator generate files one-by-one or in batches?
   - **Recommendation**: Batch per plan step (e.g., all HTML files together)
   
2. **Validation strictness**: Reject all invalid files or allow with warnings?
   - **Recommendation**: Warn in development, reject in production
   
3. **Recovery strategy**: Save partial progress on errors or discard?
   - **Recommendation**: Always save partial progress with clear markers
   
4. **Retry budget**: How many attempts before giving up?
   - **Recommendation**: 3 attempts max (current plan generation → validation → 1 retry)

## Testing Strategy

### Phase 2 Testing
1. **Manual Testing**: Open chat, send message, observe status updates
2. **Network Delay Simulation**: Throttle to ensure heartbeat appears
3. **Long Generation Test**: Generate large project (10+ files)
4. **Cancellation Test**: Cancel mid-generation, verify cleanup
5. **Multiple Concurrent Tests**: Multiple tabs generating simultaneously

### Phase 3 Testing
1. **Invalid Syntax Test**: Force LLM to generate syntax errors
2. **Placeholder Test**: Include TODO markers in generated code
3. **Duplicate File Test**: Multiple messages with same file paths
4. **Security Test**: Attempt path traversal attacks
5. **Empty File Test**: Generate files with no content

### Phase 1 Testing
1. **Simple Project**: 3-file project (HTML, CSS, JS)
2. **Complex Project**: 10+ files with components
3. **Refinement Test**: Intentionally break a step, verify retry
4. **Feedback Loop Test**: Verify feedback improves quality
5. **Performance Test**: Measure time to completion vs single-pass

## Rollback Plan

### Phase 2 Rollback
- Remove heartbeat interval (1 line change)
- Remove database debouncing (revert to immediate writes)
- No data migration needed

### Phase 3 Rollback
- Disable validation (skip validation checks)
- Revert to old extractFilesFromContent
- No data migration needed

### Phase 1 Rollback
- Set maxAttempts back to 1
- Remove step execution logic
- Plans continue to work (just not used for execution)

## Monitoring & Observability

### Key Metrics to Track
- **Streaming**: Time to first update, update frequency, database write frequency
- **Validation**: Validation pass rate, rejection reasons, file count accuracy
- **Multi-Pass**: Average attempts per generation, success rate, quality scores

### Logging Strategy
- **Info**: Phase transitions, file counts, elapsed time
- **Warn**: Validation failures, missing files, recoverable errors
- **Error**: Unrecoverable errors, stream failures, database issues

### Alerts
- Streaming heartbeat stops for >5 seconds
- Validation rejection rate >50%
- Database write errors
- Orchestration timeout (>2 minutes)

## Related Documentation
- [F-04: LLM Structured File Generation](./04-llm-structured-file-generation.md)
- [F-03: Conversation Projects](./03-conversation-projects.md)

## Changelog

### 2026-01-07
- Initial assessment and planning document created
- Identified critical issues with orchestrator and streaming
- Designed comprehensive 4-phase improvement plan
- Prioritized Phase 2 (streaming) for immediate implementation
