import "./components/features/ollama-chat-container.js";
import "./components/features/ollama-conversation-list.js";
import "./components/features/ollama-conversation-item.js";
import "./components/features/ollama-message-list.js";
import "./components/features/ollama-user-message.js";
import "./components/features/ollama-ai-response.js";
import "./components/features/ollama-orchestrator-status.js";
import "./components/features/ollama-chat-input.js";
import "./components/features/ollama-project-view.js";
import "./components/features/ollama-live-preview.js";
import "./components/features/ollama-sidebar-user.js";
import "./components/base/ollama-button.js";
import "./components/base/ollama-action-bar.js";
import "./components/base/ollama-confirm-dialog.js";
import "./components/base/ollama-icon.js";
import "./components/base/ollama-text.js";
import "./components/base/ollama-toggle-switch.js";
import {
  BACKEND_BASE,
  fetchConversations,
  createConversation,
  fetchMessages,
  fetchConversationProject,
  fetchProjectFiles,
  fetchProjectFile,
  createMessage,
  updateMessage,
  upsertProjectFile,
  updateProject,
  deleteConversation,
  updateConversationTitle,
  logTokenUsage,
  streamConversationChat,
  fetchModels,
} from "./utils/backend-client.js";

const DEFAULT_MODELS = [{ label: "llama3", value: "llama3" }];
const DEFAULT_PREVIEW = `<!doctype html><html><body style="font-family: system-ui; padding: 24px;"><h2>Live preview</h2><p>Project preview area.</p></body></html>`;

class OllamaFrontendApp extends HTMLElement {
  constructor() {
    super();
    this.mode = "chat";
    this.sidebarOpen = true;
    this.models = DEFAULT_MODELS;
    this.activeModel = DEFAULT_MODELS[0].value;
    this.activeConversationId = "";
    this.conversations = [];
    this.messagesByConversation = {};
    this.editingConversationId = "";
    this.renameDrafts = {};
    this.projectByConversation = {};
    this.projectFilesByProject = {};
    this.projectManifestByProject = {};
    this.projectTreeByProject = {};
    this.projectStateByConversation = {};
    this.projectFileContentByProject = {};
    this.projectLintByProject = {};
    this.isStreaming = false;
    this.pendingDeleteConversation = null;
    this.renderQueued = false;
    this.abortController = null;
    this.deferProjectContent = false;
    this.deferredProjectToken = 0;
    this.projectRecoveryInFlight = new Set();
    this.stopRequested = false;
    this.stopRequestedReason = "";
    this.orchestrationStatusByConversation = {};
    this.orchestrationRuntimeByConversation = {};
    this.missingFixInFlight = new Set();
    this.orchestrationBufferByConversation = {};
    this.orchestrationUpdateTimers = {}; // Debounce timers for DB writes
    this.orchestratorComponentsByRunId = {}; // Map runId -> DOM element
  }

  connectedCallback() {
    this.render();
    this.loadModels();
    this.loadConversations();
  }

  async loadModels() {
    try {
      const models = await fetchModels();
      this.models = models.map((model) => ({
        label: model.name,
        value: model.name,
        supportsVision: this.isVisionModelName(model.name),
      }));
      this.activeModel = this.models[0]?.value || "";
      this.scheduleRender();
    } catch (error) {
      console.warn("[frontend] Failed to load models:", error);
    }
  }

  isVisionModelName(modelName = "") {
    const visionKeywords = [
      "vision",
      "llava",
      "bakllava",
      "llama3.2-vision",
      "minicpm-v",
    ];
    const nameLower = modelName.toLowerCase();
    return visionKeywords.some((keyword) => nameLower.includes(keyword));
  }

  getActiveModelInfo() {
    return (
      this.models.find((m) => m.value === this.activeModel) || this.models[0]
    );
  }

  activeModelSupportsVision() {
    const modelInfo = this.getActiveModelInfo();
    return modelInfo?.supportsVision || false;
  }

  scheduleRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      console.time("[perf] render");
      this.renderQueued = false;
      this.render();
      console.timeEnd("[perf] render");
    });
  }

  async flushOrchestrationUpdate(conversationId) {
    // Immediately flush any pending database write
    const timerId = this.orchestrationUpdateTimers[conversationId];
    if (timerId) {
      clearTimeout(timerId);
      delete this.orchestrationUpdateTimers[conversationId];

      // Find the last assistant message to flush its orchestration metadata
      const messages = this.messagesByConversation[conversationId] || [];
      let lastAssistant = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (
          messages[i].role === "assistant" &&
          messages[i].kind !== "orchestrator"
        ) {
          lastAssistant = messages[i];
          break;
        }
      }

      if (lastAssistant) {
        try {
          await updateMessage(conversationId, lastAssistant.id, {
            content: lastAssistant.content,
            metadata: lastAssistant.metadata,
          });
        } catch (error) {
          console.warn(
            "[frontend] Failed to flush assistant message with orchestration metadata:",
            error,
          );
        }
      }
    }
  }

  async updateOrchestrationStatus(conversationId, orchestration) {
    if (!conversationId) return;

    console.log("[updateOrchestrationStatus] Incoming orchestration:", {
      phase: orchestration.phase,
      details: orchestration.details,
      validation: orchestration.validation,
    });

    // Find the last assistant message (the one being generated now)
    const messages = this.messagesByConversation[conversationId] || [];
    let lastAssistant = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (
        messages[i].role === "assistant" &&
        messages[i].kind !== "orchestrator"
      ) {
        lastAssistant = messages[i];
        break;
      }
    }

    let runtime = this.orchestrationRuntimeByConversation[conversationId] || {};

    // Start a new orchestration run - completely reset runtime
    if (orchestration.phase === "start") {
      const previousRunId = runtime.runId;
      console.log(
        "[updateOrchestrationStatus] Starting NEW orchestration run",
        {
          previousRunId,
          newRunId: Date.now(),
          timestamp: orchestration.timestamp,
        },
      );
      const newRunId = Date.now();
      runtime = {
        runId: newRunId,
        status: { files: [], log: [] },
        lastKey: "",
        lastOutput: "",
        buffer: "",
        suppressAssistant: false,
        componentId: `orchestrator-${newRunId}`, // Unique component ID
      };
      this.orchestrationRuntimeByConversation[conversationId] = runtime;

      // Create and track the new orchestrator component for this run
      console.log(
        `[orchestrator] Created new run ${newRunId} for conversation ${conversationId}`,
      );
    } else if (!runtime.runId) {
      // Fallback for first time initialization
      runtime = {
        runId: Date.now(),
        status: { files: [], log: [] },
        messageId: "",
        lastKey: "",
        lastOutput: "",
        buffer: runtime.buffer || "",
        suppressAssistant: runtime.suppressAssistant || false,
      };
    }
    const status = runtime.status || { files: [], log: [] };
    if (!status.startedAt) {
      status.startedAt = Date.now();
    }
    const files = new Set(status.files || []);
    const details = orchestration.details || {};
    if (details.path) files.add(details.path);
    if (Array.isArray(details.filesFound)) {
      details.filesFound.forEach((file) => files.add(file));
    }
    status.files = Array.from(files).slice(0, 6);

    console.log("[updateOrchestrationStatus] Status after file accumulation:", {
      phase: orchestration.phase,
      statusFiles: status.files,
      statusSteps: status.steps,
      detailsFilesFound: details.filesFound,
    });

    let line = "";
    const phaseLabel = (() => {
      const phase = orchestration.phase || "";
      if (phase === "start") return "Start";
      if (phase === "analyzing") return "Analyzing";
      if (phase === "loading_files") return "Loading files";
      if (phase === "plan") return "Plan";
      if (phase === "generate" || phase === "retry") return "Generate";
      if (phase === "generating") return "Generate"; // New progressive phase
      if (phase === "heartbeat") return ""; // Heartbeat doesn't change label
      if (phase === "validate") return "Validate";
      if (phase === "complete") return "Complete";
      if (phase === "file_complete") return "Generate";
      if (phase) return phase;
      return "";
    })();
    if (orchestration.phase === "file_complete" && details.path) {
      line = `File: ${details.path}`;
    } else if (
      orchestration.phase === "loading_files" &&
      details.filesRequested
    ) {
      line = `${phaseLabel}: ${details.filesRequested.join(", ")}`;
    } else if (orchestration.validation) {
      const status = orchestration.validation;
      line = phaseLabel ? `${phaseLabel}: ${status}` : `Status: ${status}`;
    } else if (phaseLabel) {
      line = `${phaseLabel}${
        orchestration.attempt ? ` (${orchestration.attempt}x)` : ""
      }`;
    }
    if (orchestration.reason) {
      line = `${line} — ${orchestration.reason}`;
    }
    if (line) {
      status.log = [...(status.log || []), line].slice(-3);
    }
    // Do not surface raw output samples in chat status.
    if (Array.isArray(details.steps)) {
      status.steps = details.steps;
    }

    // Use elapsed time from backend if available, otherwise calculate locally
    const elapsedSeconds =
      orchestration.elapsed !== undefined
        ? orchestration.elapsed
        : Math.max(0, Math.round((Date.now() - status.startedAt) / 1000));

    // Track heartbeat for liveliness indicator
    if (orchestration.phase === "heartbeat") {
      runtime.lastHeartbeat = Date.now();
    }

    // Store minimal content - the component will render from metadata
    // Keep elapsed time in content for backwards compatibility with old messages
    const content = `Orchestrator: ${orchestration.phase || "working"} • ${elapsedSeconds}s`;

    console.log(
      "[frontend] Orchestrator status update:",
      orchestration.phase,
      "elapsed:",
      elapsedSeconds,
      "runId:",
      runtime.runId,
    );

    // Build event key for change detection
    const stepKey = Array.isArray(status.steps)
      ? status.steps.map((step) => `${step.id}:${step.done ? 1 : 0}`).join(",")
      : "";
    const eventKeyParts = [
      line,
      status.files.join(","),
      stepKey,
      orchestration.validation || "",
      orchestration.phase || "",
      details.stepId || "",
      details.path || "",
      elapsedSeconds, // Include elapsed to trigger updates
    ];
    const eventKey = eventKeyParts.filter(Boolean).join("|");
    const metadata = {
      orchestrationStatus: status,
      orchestration: {
        phase: orchestration.phase || "working",
        elapsed: elapsedSeconds,
        bytesGenerated: orchestration.bytesGenerated,
        filesRequested: details.filesRequested,
        details: details.output
          ? { output: details.output }
          : runtime.lastOutput
            ? { output: runtime.lastOutput }
            : {},
      },
    };
    if (details.output) {
      runtime.lastOutput = details.output;
    }
    runtime.status = status;

    // If no assistant message exists yet, buffer the update
    if (!lastAssistant) {
      console.log(
        "[updateOrchestrationStatus] No assistant message yet, buffering update",
      );
      runtime.pendingUpdate = { status, metadata };
      this.orchestrationRuntimeByConversation[conversationId] = runtime;
      return;
    }

    console.log("[updateOrchestrationStatus] Attaching to assistant message:", {
      messageId: lastAssistant.id,
      phase: orchestration.phase,
      runId: runtime.runId,
    });

    // Attach orchestration metadata to the assistant message
    lastAssistant.metadata = {
      ...lastAssistant.metadata,
      orchestrationStatus: status,
      orchestration: {
        phase: orchestration.phase || "working",
        elapsed: elapsedSeconds,
        bytesGenerated: orchestration.bytesGenerated,
        filesRequested: details.filesRequested,
        details: details.output
          ? { output: details.output }
          : runtime.lastOutput
            ? { output: runtime.lastOutput }
            : {},
      },
    };

    runtime.status = status;
    runtime.lastKey = eventKey;
    this.orchestrationRuntimeByConversation[conversationId] = runtime;

    // Determine if we should update the UI
    const isHeartbeat = orchestration.phase === "heartbeat";
    const isGenerating = orchestration.phase === "generating";
    const hasElapsedChange = orchestration.elapsed !== runtime.lastElapsed;
    const shouldUpdate =
      eventKey !== runtime.lastKey ||
      isHeartbeat ||
      isGenerating ||
      hasElapsedChange;

    if (shouldUpdate) {
      console.log("[frontend] Updating assistant message metadata:", {
        messageId: lastAssistant.id,
        isHeartbeat,
        hasElapsedChange,
        phase: orchestration.phase,
      });

      // For heartbeat and time updates, force immediate render to show incrementing timer
      if (isHeartbeat || hasElapsedChange) {
        this.renderQueued = false; // Clear any pending render
        this.render(); // Render immediately
      } else {
        this.scheduleRender(); // Schedule for other updates
      }

      // Track last elapsed time to detect changes
      runtime.lastElapsed = orchestration.elapsed;

      // Only update eventKey for significant changes (not heartbeat/elapsed)
      if (eventKey !== runtime.lastKey && !isHeartbeat) {
        runtime.lastKey = eventKey;
      }

      runtime.status = status;
      this.orchestrationRuntimeByConversation[conversationId] = runtime;

      // No need to update DB during streaming - we'll save everything at the end
    }
    this.orchestrationRuntimeByConversation[conversationId] = runtime;
  }

  scheduleDeferredProjectContent() {
    const token = ++this.deferredProjectToken;
    const run = () => {
      if (token !== this.deferredProjectToken) return;
      this.deferProjectContent = false;
      this.scheduleRender();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(run);
      return;
    }

    setTimeout(run, 0);
  }

  get activeMessages() {
    return this.messagesByConversation[this.activeConversationId] || [];
  }

  getProjectState(conversationId) {
    if (!this.projectStateByConversation[conversationId]) {
      this.projectStateByConversation[conversationId] = {
        selectedPath: "",
        expanded: [],
      };
    }
    return this.projectStateByConversation[conversationId];
  }

  setMode(nextMode) {
    console.time(`[perf] setMode to ${nextMode}`);
    this.mode = nextMode;
    if (nextMode === "project") {
      this.deferProjectContent = true;
      this.scheduleDeferredProjectContent();
    } else {
      this.deferProjectContent = false;
    }
    // Immediately schedule a render for instant UI feedback
    this.scheduleRender();
    console.timeLog(`[perf] setMode to ${nextMode}`, "render scheduled");

    // Load project data in background if switching to project mode
    if (nextMode === "project" && this.activeConversationId) {
      this.loadProject(this.activeConversationId).then(() => {
        console.timeEnd(`[perf] setMode to ${nextMode}`);
        this.scheduleRender();
      });
    } else {
      console.timeEnd(`[perf] setMode to ${nextMode}`);
    }
  }

  async loadConversations() {
    try {
      const conversations = await fetchConversations();
      if (conversations.length) {
        this.conversations = conversations.map((item) => ({
          id: item.id,
          title: item.title || "New chat",
          model: item.model || this.activeModel,
          timestamp: item.updatedAt || Date.now(),
          messageCount: item.messageCount || 0,
          tokenCount: item.tokenCount || 0,
          unread: 0,
        }));
        if (!this.activeConversationId && conversations[0]) {
          this.activeConversationId = conversations[0].id;
        }
        await this.loadMessages(this.activeConversationId);
        await this.loadProject(this.activeConversationId);
        this.scheduleRender();
        return;
      }
    } catch (error) {
      console.warn("[frontend] Failed to load conversations:", error);
    }

    const fallbackId = await this.createConversationRecord({
      title: "New chat",
    });
    if (fallbackId) {
      this.conversations = [
        {
          id: fallbackId,
          title: "New chat",
          model: this.activeModel,
          timestamp: Date.now(),
          messageCount: 0,
          tokenCount: 0,
          unread: 0,
        },
      ];
      this.messagesByConversation[fallbackId] = [];
      this.activeConversationId = fallbackId;
      await this.loadProject(fallbackId);
    }
    this.scheduleRender();
  }

  async createConversationRecord({ title } = {}) {
    try {
      const id = await createConversation({
        title: title || "New chat",
        model: this.activeModel,
      });
      if (id) {
        await this.loadProject(id);
      }
      return id;
    } catch (error) {
      console.warn("[frontend] Failed to create conversation:", error);
      return null;
    }
  }

  async loadMessages(conversationId) {
    if (!conversationId) return;
    try {
      const messages = await fetchMessages(conversationId);
      this.messagesByConversation[conversationId] = messages.map((msg) => {
        if (msg.metadata?.orchestrationStatus || msg.metadata?.orchestration) {
          console.log("[loadMessages] Found orchestration metadata:", {
            id: msg.id,
            orchestrationStatus: msg.metadata?.orchestrationStatus,
            orchestration: msg.metadata?.orchestration,
          });
        }
        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          kind: msg.metadata?.kind || "",
          model: msg.model || this.activeModel,
          timestamp: msg.createdAt || Date.now(),
          tokens:
            msg.tokens && Number(msg.tokens) > 0 ? String(msg.tokens) : "",
          images: msg.images ? JSON.parse(msg.images) : undefined,
          metadata: msg.metadata || null,
        };
      });
      await this.ensureProjectFromMessages(conversationId);
    } catch (error) {
      console.warn("[frontend] Failed to load messages:", error);
    }
  }

  async ensureProjectFromMessages(conversationId, force = false) {
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
      const fileCandidates = [];
      for (const message of messages) {
        if (message.role !== "assistant") continue;
        const rawOutput =
          message.metadata?.rawOutput ||
          message.metadata?.orchestration?.details?.output ||
          message.content ||
          "";
        const extracted = this.extractFilesFromContent(rawOutput);
        fileCandidates.push(...extracted);
      }

      for (const file of fileCandidates) {
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

  async loadProject(conversationId, { skipRecovery = false } = {}) {
    if (!conversationId) return;
    console.time(`[perf] loadProject`);
    try {
      console.time(`[perf] fetchConversationProject`);
      const project = await fetchConversationProject(conversationId);
      console.timeEnd(`[perf] fetchConversationProject`);
      if (!project) return;
      this.projectByConversation[conversationId] = project;

      console.time(`[perf] fetchProjectFiles`);
      const files = await fetchProjectFiles(project.id);
      console.timeEnd(`[perf] fetchProjectFiles`);
      this.projectFilesByProject[project.id] = files;
      if (!skipRecovery) {
        const hasUserFiles = files.some(
          (file) => file.path && !file.path.startsWith("project."),
        );
        if (!hasUserFiles) {
          await this.ensureProjectFromMessages(conversationId, true);
          console.timeEnd(`[perf] loadProject`);
          return;
        }
      }

      const initialFiles = this.projectFilesByProject[project.id] || files;
      this.projectTreeByProject[project.id] = this.buildFileTree(
        project.name,
        initialFiles,
      );
      const state = this.getProjectState(conversationId);
      if (!state.selectedPath && initialFiles.length) {
        state.selectedPath = initialFiles[0].path;
      }
      if (!state.expanded.length && project.name) {
        state.expanded = [project.name];
      }

      // Render immediately with cached data for fast UI feedback
      this.scheduleRender();

      const backgroundTasks = [];

      backgroundTasks.push(
        (async () => {
          console.time(`[perf] ensureProjectManifest`);
          await this.ensureProjectManifest(project, files);
          console.timeEnd(`[perf] ensureProjectManifest`);
        })(),
      );

      if (state.selectedPath) {
        backgroundTasks.push(
          (async () => {
            console.time(`[perf] ensureProjectFileContent`);
            await this.ensureProjectFileContent(project.id, state.selectedPath);
            console.timeEnd(`[perf] ensureProjectFileContent`);
          })(),
        );
      }

      backgroundTasks.push(
        (async () => {
          console.time(`[perf] updateProjectLint`);
          await this.updateProjectLint(project.id);
          console.timeEnd(`[perf] updateProjectLint`);
        })(),
      );

      await Promise.all(backgroundTasks);

      const refreshedFiles = this.projectFilesByProject[project.id] || files;
      this.projectTreeByProject[project.id] = this.buildFileTree(
        project.name,
        refreshedFiles,
      );
      const refreshedState = this.getProjectState(conversationId);
      if (!refreshedState.selectedPath && refreshedFiles.length) {
        refreshedState.selectedPath = refreshedFiles[0].path;
      }
      if (!refreshedState.expanded.length && project.name) {
        refreshedState.expanded = [project.name];
      }
      this.scheduleRender();
    } catch (error) {
      console.warn("[frontend] Failed to load project:", error);
    } finally {
      console.timeEnd(`[perf] loadProject`);
    }
  }

  buildProjectManifest(project, files = []) {
    const fileList = files
      .map((file) => file.path)
      .filter(
        (path) =>
          path &&
          path !== "project.manifest.json" &&
          path !== "project.guidance.md" &&
          path !== "project.spec.md",
      )
      .filter((path, index, list) => list.indexOf(path) === index)
      .sort();
    const htmlFiles = fileList.filter((path) => path.endsWith(".html"));
    const entry = fileList.includes("index.html")
      ? "index.html"
      : htmlFiles[0] || fileList[0] || "index.html";
    return {
      preview: {
        entry,
        mode: "static",
        root: "/",
        files: fileList,
      },
      project: {
        id: project.id,
        name: project.name,
        description: project.description || "",
      },
    };
  }

  buildLlmGuidanceMarkdown(projectName) {
    const name = projectName || "Project";
    return `# ${name} LLM Guidance

You are building a no-build web project that runs directly in an iframe.

## Development Philosophy: Start Small, Iterate

You are working with a local LLM with limited context. ALWAYS follow this approach:

### For New Projects
1. **Start with MVP (Minimum Viable Product)**
   - Build the simplest working version first
   - Include ONLY core functionality
   - Use placeholder data instead of complex state management
   - Defer features like error handling, loading states, animations

2. **Suggest Scope Before Building**
   - When user requests a project, identify core MVP features
   - List potential enhancements as "next steps"
   - Ask user to confirm MVP scope before generating code
   - Example: "I'll start with: [list]. We can add [features] later. Sound good?"

3. **One Feature at a Time**
   - After MVP, add ONE feature per conversation turn
   - Update only the affected files
   - Don't regenerate unchanged files

### For Existing Projects
1. **Update Individual Files**
   - Only generate files that need changes
   - Reference existing files by name when building on them
   - Don't duplicate unchanged code

2. **Incremental Enhancement**
   - Add one component at a time
   - Extend functionality in small steps
   - Test each change before adding more

### Why This Matters
- **Token limits**: Large responses may be cut off
- **Quality**: Small changes are more accurate than large rewrites
- **Debugging**: Easier to identify issues in focused changes
- **User experience**: Faster iterations, better feedback loop

## Architecture

Your application should follow this structure:

1. **index.html** - Application layout and shell (semantic HTML only)
   - Contains: \`<header>\`, \`<main>\`, \`<nav>\`, \`<footer>\`, etc.
   - No inline scripts or styles
   - References: styles.css, src/app.js

2. **styles.css** - Global styles and design system
   - CSS custom properties for theming
   - Layout utilities (Grid, Flexbox)
   - Typography and spacing scales

3. **src/app.js** - Application coordination and state
   - Import and register all components
   - Handle application-level state and data flow
   - Coordinate component interactions
   - Setup event listeners for cross-component communication

4. **src/components/*.js** - Reusable Web Components
   - One component per file
   - Self-contained with Shadow DOM
   - Accept data via attributes/properties
   - Emit custom events for parent communication

## Output Rules

- Only emit files using the **File: path/to/file.ext** format. Code fences without file paths are ignored.
- Do NOT use React, Tailwind, Vite, or other build tooling. This project is no-build and runs directly in the browser.

## File Response Format

You MUST respond with files in this exact format:

\`\`\`
File: path/to/file.ext
\`\`\`language
[file content]
\`\`\`
\`\`\`

Example:

\`\`\`
File: index.html
\`\`\`html
<!DOCTYPE html>
<html>
...
</html>
\`\`\`

File: src/components/my-component.js
\`\`\`javascript
class MyComponent extends HTMLElement {
  // component code
}
\`\`\`
\`\`\`

## Component Patterns

### Basic Component
\`\`\`javascript
class ComponentName extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = \\\`
      <style>
        :host { display: block; }
      </style>
      <div>Component content</div>
    \\\`;
  }
}

customElements.define('component-name', ComponentName);
\`\`\`

### Component with Properties
\`\`\`javascript
class UserCard extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'email'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const name = this.getAttribute('name') || 'Unknown';
    const email = this.getAttribute('email') || '';
    this.shadowRoot.innerHTML = \\\`
      <div class="user-card">
        <h3>\${name}</h3>
        <p>\${email}</p>
      </div>
    \\\`;
  }
}
\`\`\`

### Component with Events
\`\`\`javascript
class CustomButton extends HTMLElement {
  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector('button').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('button-clicked', {
        bubbles: true,
        composed: true,
        detail: { id: this.getAttribute('id') }
      }));
    });
  }
}
\`\`\`

## Application Coordination (app.js)

### Component Registration
\`\`\`javascript
import './components/user-card.js';
import './components/custom-button.js';
\`\`\`

### Application State
\`\`\`javascript
class AppState {
  constructor() {
    this.data = [];
    this.listeners = [];
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  setState(newState) {
    this.data = newState;
    this.notify();
  }

  notify() {
    this.listeners.forEach(callback => callback(this.data));
  }
}
\`\`\`

### Component Communication
\`\`\`javascript
document.addEventListener('button-clicked', (e) => {
  // Handle component events
});
\`\`\`

## Project Specification Management

You MUST maintain the \`project.spec.md\` file to track project evolution:

### When Creating a New Project
1. Ask user to clarify MVP scope
2. Create initial \`project.spec.md\` with:
   - Overview of what the project is
   - Current scope (MVP features)
   - Planned enhancements (future features)
   - Technical notes (architecture decisions)
   - Changelog entry for initial creation

### After Each Feature Implementation
1. Update \`project.spec.md\`:
   - Move completed items from "Current Scope" to "Completed Features"
   - Add newly discovered features to "Planned Enhancements"
   - Update "Files" section if structure changed
   - Add any technical notes or decisions made
   - **Add changelog entry** documenting what changed

### When User Requests New Features
1. Add to "Planned Enhancements" section
2. If starting work immediately, move to "Current Scope"
3. Update "Last Updated" field
4. **Add changelog entry** noting the new feature request

### Keep It Concise
- Specification should be brief (1-2 pages max)
- Focus on what's important for context
- Don't duplicate code or implementation details
- Use bullet points and clear sections

## Rules

- Always keep \`index.html\` as the entrypoint
- Every new file must be referenced from \`index.html\` (directly or via \`src/app.js\`)
- Prefer ES modules and \`type="module"\` scripts
- One file per component; avoid multi-file component splits unless requested
- Return complete files (no TODOs or placeholders)
- Prefer semantic HTML for layout
- Use CSS Grid and Flexbox for layout
- Create reusable UI pieces as Web Components in \`src/components/\`
`;
  }

  buildProjectSpecification(projectName, projectDescription = "") {
    const name = projectName || "Project";
    const desc = projectDescription || `A web application built with ${name}`;
    const timestamp = new Date().toISOString().split("T")[0];

    return `# Project Specification: ${name}

## Overview
${desc}

## Current Status
**Phase**: MVP
**Last Updated**: ${timestamp}

## Completed Features
None yet - project just created

## Current Scope (In Progress)
- [ ] Initial project setup
- [ ] Basic application structure

## Planned Enhancements

### High Priority
(Features will be added as project evolves)

### Medium Priority
(Features will be added as project evolves)

### Future Considerations
(Features will be added as project evolves)

## Technical Notes
- Using Web Components for modularity
- No-build workflow - runs directly in browser
- ES modules for component organization

## Files
- \`project.spec.md\` - This specification document
- \`project.guidance.md\` - LLM guidance for code generation

## Changelog

### ${timestamp} - Project Initialized
**Changed**:
- Created project structure
- Set up initial specification

**Added to Spec**:
- Defined project overview
- Created placeholder for MVP features
- Established technical approach
`;
  }

  extractFileDescriptionsFromSpec(specContent) {
    const descriptions = {};
    if (!specContent) return descriptions;

    // Look for the Files section in the spec
    const filesSection = specContent.match(/## Files\n([\s\S]*?)(?=\n##|$)/);
    if (!filesSection) return descriptions;

    // Parse file entries like: - `path/to/file.js` - Description here
    const filePattern = /^-\s*`([^`]+)`\s*-\s*(.+)$/gm;
    let match;

    while ((match = filePattern.exec(filesSection[1])) !== null) {
      const path = match[1].trim();
      const desc = match[2].trim();
      descriptions[path] = desc;
    }

    return descriptions;
  }

  buildSystemContext(project, files, manifest) {
    if (!project || !manifest) return "";

    const existingFiles = files
      .filter((f) => !f.path.startsWith("project."))
      .map((f) => f.path);

    const filesByType = {
      layout: existingFiles.filter((p) => p.endsWith(".html")),
      styles: existingFiles.filter((p) => p.endsWith(".css")),
      app: existingFiles.filter((p) => p === "src/app.js"),
      components: existingFiles.filter((p) => p.startsWith("src/components/")),
    };

    const expectedFiles = ["index.html", "styles.css", "src/app.js"];
    const missingFiles = expectedFiles.filter(
      (f) => !existingFiles.includes(f),
    );

    const isNewProject = existingFiles.length === 0;
    const hasExistingFiles = existingFiles.length > 0;

    // Get guidance and specification content if they exist
    const guidanceContent =
      this.projectFileContentByProject[project.id]?.["project.guidance.md"]
        ?.content;
    const specContent =
      this.projectFileContentByProject[project.id]?.["project.spec.md"]
        ?.content;

    let context = "";

    // Include guidance at the top (most important)
    if (guidanceContent) {
      context += `${guidanceContent}\n\n---\n\n`;
    }

    context += `## Project Architecture\n\nComponent-first web application with separation of concerns.\n\n`;

    // Include specification if available
    if (specContent) {
      context += `### Project Specification\n\n${specContent}\n\n`;
    }

    // Current files with descriptions
    context += `### Current Files (${existingFiles.length})\n\n`;

    if (existingFiles.length > 0) {
      // Get file descriptions from spec if available
      const fileDescriptions =
        this.extractFileDescriptionsFromSpec(specContent);

      // Organize files by type with descriptions
      if (filesByType.layout.length > 0) {
        context += `**Layout Files:**\n`;
        filesByType.layout.forEach((path) => {
          const desc = fileDescriptions[path] || "Application layout";
          context += `  - \`${path}\` - ${desc}\n`;
        });
        context += "\n";
      }

      if (filesByType.styles.length > 0) {
        context += `**Styles:**\n`;
        filesByType.styles.forEach((path) => {
          const desc = fileDescriptions[path] || "Global styles";
          context += `  - \`${path}\` - ${desc}\n`;
        });
        context += "\n";
      }

      if (filesByType.app.length > 0) {
        context += `**Application:**\n`;
        filesByType.app.forEach((path) => {
          const desc =
            fileDescriptions[path] || "Application coordination and state";
          context += `  - \`${path}\` - ${desc}\n`;
        });
        context += "\n";
      }

      if (filesByType.components.length > 0) {
        context += `**Components (${filesByType.components.length}):**\n`;
        filesByType.components.forEach((path) => {
          const componentName = path.split("/").pop().replace(".js", "");
          const desc = fileDescriptions[path] || `${componentName} component`;
          context += `  - \`${path}\` - ${desc}\n`;
        });
        context += "\n";
      }
    } else {
      context += `No files yet - new project ready for initialization.\n\n`;
    }

    // Missing files warning
    if (missingFiles.length > 0) {
      context += `### Missing Core Files\n${missingFiles.map((f) => `- ${f}`).join("\n")}\n\n`;
    }

    // Development approach guidance
    context += `### Development Approach\n\n`;
    if (isNewProject) {
      context += `**New Project**: Start with MVP. Only generate core files needed for basic functionality.
- Suggest scope before building
- Use placeholder data instead of complex state
- Defer advanced features for later iterations\n\n`;
    }

    if (hasExistingFiles) {
      context += `**Existing Project**: Update only what's needed.
- Generate ONLY files that need changes
- Reference existing files by path (don't regenerate)
- Add features incrementally\n\n`;
    }

    // File manifest
    context += `### File Manifest\n${JSON.stringify(manifest, null, 2)}\n\n`;

    context += `**Important**: Generate files using structured format (File: path followed by code block). Code fences without file paths are ignored.\n`;
    context += `Use only the no-build web stack (HTML/CSS/ES modules). Do not output React, Tailwind, or Vite files.\n`;
    if (hasExistingFiles) {
      context += `Only include files you are creating or modifying.`;
    }

    return context;
  }

  buildPreviewUrl(projectId) {
    if (!projectId) return "";
    return `${BACKEND_BASE}/api/projects/${projectId}/preview/?t=${Date.now()}`;
  }

  getSharePreviewUrl(projectId) {
    if (!projectId) return "";
    return `${BACKEND_BASE}/api/projects/${projectId}/preview/`;
  }

  getProjectById(projectId) {
    return Object.values(this.projectByConversation).find(
      (project) => project.id === projectId,
    );
  }

  getProjectEntryPath(projectId) {
    const manifest = this.projectManifestByProject[projectId];
    if (!manifest?.content) return "index.html";
    try {
      const parsed = JSON.parse(manifest.content);
      return parsed?.preview?.entry || "index.html";
    } catch (error) {
      return "index.html";
    }
  }

  collectEntryReferences(html) {
    const references = new Set();
    const attrPattern = /(src|href)=["']([^"']+)["']/gi;
    let match = null;
    while ((match = attrPattern.exec(html)) !== null) {
      const raw = match[2].trim();
      if (!raw) continue;
      if (/^(https?:|data:|mailto:|tel:|#)/i.test(raw)) continue;
      const normalized = raw.replace(/^\/+/, "");
      references.add(normalized);
    }
    return Array.from(references);
  }

  async updateProjectLint(projectId) {
    if (!projectId) return;
    const entryPath = this.getProjectEntryPath(projectId);
    const files = this.projectFilesByProject[projectId] || [];
    const fileMap = new Set(files.map((file) => file.path));
    const lint = [];

    // Only try to load and lint the entry file if it exists in the project
    if (fileMap.has(entryPath)) {
      await this.ensureProjectFileContent(projectId, entryPath);
      const entryFile =
        this.projectFileContentByProject[projectId]?.[entryPath];

      if (!entryFile?.content) {
        lint.push({
          message: `Entry file '${entryPath}' is missing from the project files.`,
        });
      } else {
        const refs = this.collectEntryReferences(entryFile.content);
        refs.forEach((ref) => {
          if (!fileMap.has(ref)) {
            lint.push({
              message: `Reference '${ref}' does not exist in the project files.`,
            });
          }
        });
      }
    }

    this.projectLintByProject[projectId] = lint;
  }

  buildMissingReferencesPrompt(entryPath, lintErrors) {
    const missing = lintErrors
      .map((item) => item.message)
      .filter(Boolean)
      .join("\n");
    return `Fix missing project files referenced by ${entryPath}.

Missing references:
${missing || "No references found."}

Instructions:
- Create any missing files with complete, working content.
- If a reference is wrong, update ${entryPath} to point at the correct existing file.
- Ensure ${entryPath} links all needed CSS/JS files.
- Keep the project manifest consistent with the file list.
- Return complete files (no TODOs or placeholders).`;
  }

  async reconcileProjectManifest(projectId) {
    if (!projectId) return [];
    const project = this.getProjectById(projectId);
    if (!project) return [];
    const files = await fetchProjectFiles(projectId);
    this.projectFilesByProject[projectId] = files;
    const manifest = this.buildProjectManifest(project, files);
    const file = await upsertProjectFile(projectId, {
      path: "project.manifest.json",
      content: JSON.stringify(manifest, null, 2),
      language: "json",
    });
    this.projectManifestByProject[projectId] = file;
    return files;
  }

  async ensureProjectManifest(project, files) {
    const existing = files.find(
      (file) => file.path === "project.manifest.json",
    );
    if (existing) {
      this.projectManifestByProject[project.id] = existing;
    }
    const manifest = this.buildProjectManifest(project, files);
    const file = await upsertProjectFile(project.id, {
      path: "project.manifest.json",
      content: JSON.stringify(manifest, null, 2),
      language: "json",
    });
    this.projectManifestByProject[project.id] = file;
    const guidance = files.find((item) => item.path === "project.guidance.md");
    if (!guidance) {
      await upsertProjectFile(project.id, {
        path: "project.guidance.md",
        content: this.buildLlmGuidanceMarkdown(project.name),
        language: "markdown",
      });
    }
    const spec = files.find((item) => item.path === "project.spec.md");
    if (!spec) {
      await upsertProjectFile(project.id, {
        path: "project.spec.md",
        content: this.buildProjectSpecification(
          project.name,
          project.description,
        ),
        language: "markdown",
      });
    }
    const refreshed = await fetchProjectFiles(project.id);
    this.projectFilesByProject[project.id] = refreshed;
    // Note: We don't eagerly load guidance and spec here for performance
    // They will be loaded on-demand when needed (e.g., when sending to LLM)
  }

  async ensureProjectFileContent(projectId, path) {
    if (!projectId || !path) return;
    if (!this.projectFileContentByProject[projectId]) {
      this.projectFileContentByProject[projectId] = {};
    }
    if (this.projectFileContentByProject[projectId][path]) return;
    try {
      const file = await fetchProjectFile(projectId, path);
      if (file) {
        this.projectFileContentByProject[projectId][path] = file;
      }
    } catch (error) {
      console.warn("[frontend] Failed to load project file:", error);
    }
  }

  async ensureAllProjectFilesContent(projectId) {
    const files = this.projectFilesByProject[projectId] || [];
    await Promise.all(
      files.map((file) => this.ensureProjectFileContent(projectId, file.path)),
    );
  }

  buildFileTree(projectName, files = []) {
    const root = {
      name: projectName || "Project",
      type: "directory",
      children: [],
    };
    const lookup = new Map([["", root]]);
    const manifest = files.find(
      (file) => file.path === "project.manifest.json",
    );
    if (manifest) {
      root.children.push({
        name: "project.manifest.json",
        type: "file",
        path: "project.manifest.json",
        language: manifest.language || "json",
        size: manifest.size || 0,
        pinned: true,
      });
    }
    const guidance = files.find((file) => file.path === "project.guidance.md");
    if (guidance) {
      root.children.push({
        name: "project.guidance.md",
        type: "file",
        path: "project.guidance.md",
        language: guidance.language || "markdown",
        size: guidance.size || 0,
        pinned: true,
      });
    }
    const spec = files.find((file) => file.path === "project.spec.md");
    if (spec) {
      root.children.push({
        name: "project.spec.md",
        type: "file",
        path: "project.spec.md",
        language: spec.language || "markdown",
        size: spec.size || 0,
        pinned: true,
      });
    }
    files.forEach((file) => {
      if (
        file.path === "project.manifest.json" ||
        file.path === "project.guidance.md" ||
        file.path === "project.spec.md"
      )
        return;
      const parts = file.path.split("/").filter(Boolean);
      let currentPath = "";
      let parent = root;
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (isFile) {
          parent.children.push({
            name: part,
            type: "file",
            path: file.path,
            language: file.language,
            size: file.size,
          });
          return;
        }
        if (!lookup.has(currentPath)) {
          const node = {
            name: part,
            type: "directory",
            path: currentPath,
            children: [],
          };
          parent.children.push(node);
          lookup.set(currentPath, node);
        }
        parent = lookup.get(currentPath);
      });
    });
    return root;
  }

  extractFilesFromContent(content) {
    const lines = content.split("\n");
    const files = [];
    let pendingPath = "";
    let inFence = false;
    let fenceLang = "text";
    let buffer = [];
    let jsonIndex = 0;

    const filePattern =
      /^(?:\s*(?:File|Path)\s*[:\-]\s*|\/\/\s*File:\s*|\/\*\s*File:\s*|<!--\s*File:\s*)(.+?)(?:\s*-->|\s*\*\/)?$/i;

    // Validate and sanitize file path
    const validatePath = (path) => {
      if (!path) return null;

      // Remove any leading/trailing whitespace
      path = path.trim();

      // Reject paths with directory traversal
      if (path.includes("..")) {
        console.warn(
          `[extractFiles] Rejected path with directory traversal: ${path}`,
        );
        return null;
      }

      // Reject absolute paths
      if (path.startsWith("/")) {
        console.warn(`[extractFiles] Rejected absolute path: ${path}`);
        return null;
      }

      // Normalize path separators
      path = path.replace(/\\/g, "/");

      return path;
    };

    const flushFence = () => {
      if (buffer.length) {
        let resolvedPath = pendingPath;
        if (!resolvedPath) {
          if (fenceLang === "html") resolvedPath = "index.html";
          if (fenceLang === "css") resolvedPath = "styles.css";
          if (fenceLang === "markdown" || fenceLang === "md") {
            // Don't auto-assign markdown files
            resolvedPath = null;
          }
          if (fenceLang === "json") {
            resolvedPath =
              jsonIndex === 0 ? "data.json" : `data-${jsonIndex}.json`;
            jsonIndex += 1;
          }
        }

        // Validate the path
        resolvedPath = validatePath(resolvedPath);

        if (resolvedPath) {
          files.push({
            path: resolvedPath,
            content: buffer.join("\n").trimEnd(),
            language: fenceLang,
          });
        }
      }
      pendingPath = "";
      buffer = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const fileMatch = trimmed.match(filePattern);
      if (fileMatch && !inFence) {
        pendingPath = fileMatch[1].trim();
        continue;
      }

      if (trimmed.startsWith("```")) {
        if (!inFence) {
          inFence = true;
          const fenceInfo = trimmed.replace(/^```+/, "").trim();
          if (fenceInfo) {
            const parts = fenceInfo.split(/\s+/);
            if (parts[0].includes(".") || parts[0].includes("/")) {
              pendingPath = pendingPath || parts[0];
              fenceLang = "text";
            } else {
              fenceLang = parts[0];
              if (parts[1]) {
                pendingPath = pendingPath || parts[1];
              }
            }
          } else {
            fenceLang = "text";
          }
          continue;
        }
        if (inFence) {
          inFence = false;
          flushFence();
          continue;
        }
      }

      if (inFence) {
        buffer.push(line);
      }
    }

    if (inFence) {
      flushFence();
    }

    return files;
  }

  async ensureProjectScaffold(projectId, project) {
    if (!projectId) return;
    const files = await fetchProjectFiles(projectId);
    const fileSet = new Set(files.map((file) => file.path));
    const hasIndex = fileSet.has("index.html");
    const hasStyles = fileSet.has("styles.css");
    const hasApp = fileSet.has("src/app.js");
    const projectName = project?.name || "Project";

    if (!hasIndex) {
      await upsertProjectFile(projectId, {
        path: "index.html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="app">
      <header class="app__header">
        <h1>${projectName}</h1>
        <p class="app__subtitle">Drafted from chat output.</p>
      </header>
      <section class="app__content">
        <div class="card">
          <h2>Data</h2>
          <pre id="data-output">Loading...</pre>
        </div>
      </section>
    </main>
    <script type="module" src="src/app.js"></script>
  </body>
</html>
`,
        language: "html",
      });
    }

    if (!hasStyles) {
      await upsertProjectFile(projectId, {
        path: "styles.css",
        content: `:root {
  color-scheme: light;
  font-family: system-ui, sans-serif;
  color: #111827;
  background: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 32px;
}

.app {
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
}

.app__header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.app__subtitle {
  margin: 0;
  color: #6b7280;
}

.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}

#data-output {
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
`,
        language: "css",
      });
    }

    if (!hasApp) {
      await upsertProjectFile(projectId, {
        path: "src/app.js",
        content: `const output = document.querySelector("#data-output");

async function loadData() {
  if (!output) return;
  try {
    const response = await fetch("/data.json");
    if (!response.ok) {
      output.textContent = "No data.json found yet.";
      return;
    }
    const data = await response.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = "Failed to load data.json.";
  }
}

loadData();
`,
        language: "javascript",
      });
    }
  }

  async persistFilesFromResponse(conversationId, content) {
    if (!conversationId || !content) return;
    if (!this.projectByConversation[conversationId]) {
      await this.loadProject(conversationId);
    }
    const project = this.projectByConversation[conversationId];
    const projectId = project?.id;
    if (!projectId) return;
    const files = this.extractFilesFromContent(content);
    if (!files.length) return;
    for (const file of files) {
      await upsertProjectFile(projectId, file);
    }
    await this.ensureProjectScaffold(projectId, project);
    await this.reconcileProjectManifest(projectId);
    this.projectFileContentByProject[projectId] = {};
    await this.loadProject(conversationId);

    const lintErrors = this.projectLintByProject[projectId] || [];
    const missingReferences = lintErrors.filter((item) =>
      String(item.message || "").includes("does not exist"),
    );
    if (
      missingReferences.length &&
      !this.missingFixInFlight.has(conversationId)
    ) {
      this.missingFixInFlight.add(conversationId);
      const entryPath = this.getProjectEntryPath(projectId);
      const prompt = this.buildMissingReferencesPrompt(
        entryPath,
        missingReferences,
      );
      await this.handleSend(prompt, [], { internal: true });
      this.missingFixInFlight.delete(conversationId);
    }
  }

  updateConversationMetrics(conversationId, tokenDelta = 0) {
    const conversation = this.conversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) return;
    conversation.timestamp = Date.now();
    conversation.messageCount = this.activeMessages.length;
    conversation.tokenCount =
      (conversation.tokenCount || 0) + (tokenDelta || 0);
  }

  async handleProjectDownload() {
    if (!this.activeConversationId) return;

    const project = this.projectByConversation[this.activeConversationId];
    if (!project?.id) return;

    const projectFiles = this.projectFilesByProject[project.id] || [];
    const messages =
      this.messagesByConversation[this.activeConversationId] || [];

    try {
      // Dynamically import JSZip
      const JSZip = (
        await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")
      ).default;
      const zip = new JSZip();

      // Add project files
      await this.ensureAllProjectFilesContent(project.id);
      const fileContents = this.projectFileContentByProject[project.id] || {};

      for (const file of projectFiles) {
        const fileData = fileContents[file.path];
        const content = fileData?.content || "";
        zip.file(file.path, content);
      }

      // Create chat folder and add conversation
      const chatFolder = zip.folder("chat");
      const chatContent = this.formatChatForExport(messages, project.name);
      chatFolder.file("conversation.md", chatContent);

      // Generate zip file
      const blob = await zip.generateAsync({ type: "blob" });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.name || "project"}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download project:", error);
    }
  }

  formatChatForExport(messages, projectName) {
    let markdown = `# ${projectName || "Project"} - Chat Export\n\n`;
    markdown += `Exported: ${new Date().toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    for (const message of messages) {
      const role = message.role === "user" ? "User" : "Assistant";
      const timestamp = message.timestamp
        ? new Date(message.timestamp).toLocaleString()
        : "";

      markdown += `## ${role}`;
      if (timestamp) {
        markdown += ` - ${timestamp}`;
      }
      if (message.model) {
        markdown += ` (${message.model})`;
      }
      markdown += `\n\n`;
      markdown += `${message.content}\n\n`;
      markdown += `---\n\n`;
    }

    return markdown;
  }

  appendMessage(conversationId, message) {
    if (!this.messagesByConversation[conversationId]) {
      this.messagesByConversation[conversationId] = [];
    }
    this.messagesByConversation[conversationId].push(message);
    this.scheduleRender();
  }

  updateLastAssistantMessage(conversationId, updater) {
    const messages = this.messagesByConversation[conversationId] || [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (
        messages[i].role === "assistant" &&
        messages[i].kind !== "orchestrator"
      ) {
        updater(messages[i]);
        break;
      }
    }
    this.scheduleRender();
  }

  detectStreamingFile(messages) {
    const assistant = messages
      .filter((msg) => msg.role === "assistant")
      .slice(-1)[0];
    if (!assistant) return;
    if (assistant.filePreview) return;
    const content = assistant.content || "";
    const htmlDetected =
      content.includes("<!doctype html") ||
      content.includes("<html") ||
      content.includes("```html");
    if (htmlDetected) {
      assistant.filePreview = true;
      assistant.fileLanguage = "html";
      assistant.filePath = "index.html";
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1]; // Remove data:image/...;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  extractFilePreviewParts(content, fallbackLanguage = "html") {
    const fenceRegex = /```(\w+)?[^\n]*\n([\s\S]*?)```/;
    const match = content.match(fenceRegex);
    if (!match) {
      return {
        before: "",
        code: content,
        after: "",
        language: fallbackLanguage,
      };
    }
    const language = match[1] || fallbackLanguage;
    const code = match[2] || "";
    const before = content.slice(0, match.index || 0).trim();
    const after = content.slice((match.index || 0) + match[0].length).trim();
    return { before, code, after, language };
  }

  async handleSend(message, attachedFiles = [], options = {}) {
    if (!message?.trim()) return;
    this.stopRequested = false;
    this.stopRequestedReason = "";
    let conversationId = this.activeConversationId;
    if (!conversationId) {
      conversationId = await this.createConversationRecord({
        title: "New chat",
      });
      if (conversationId) {
        this.activeConversationId = conversationId;
      }
    }
    if (!this.activeModel) {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "No models are available for the backend. Pull a model in Ollama or configure the backend to point at a host with models.",
        timestamp: Date.now(),
        model: "",
      };
      this.appendMessage(conversationId, assistantMessage);
      this.scheduleRender();
      return;
    }

    // Process images: convert to base64
    const images = [];
    for (const fileData of attachedFiles) {
      if (fileData.type.startsWith("image/")) {
        try {
          const base64 = await this.fileToBase64(fileData.file);
          images.push(base64);
        } catch (error) {
          console.warn("[frontend] Failed to process image:", error);
        }
      }
    }

    if (!options.internal) {
      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
        model: this.activeModel,
        images: images.length > 0 ? images : undefined,
        attachedFiles: attachedFiles.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
      };

      this.appendMessage(conversationId, userMessage);
      this.updateConversationMetrics(conversationId, 0);
      if (conversationId) {
        try {
          const messageId = await createMessage(conversationId, {
            role: "user",
            content: message,
            model: this.activeModel,
            images: images.length > 0 ? JSON.stringify(images) : undefined,
            attachedFiles:
              attachedFiles.length > 0
                ? JSON.stringify(
                    attachedFiles.map((f) => ({
                      name: f.name,
                      size: f.size,
                      type: f.type,
                    })),
                  )
                : undefined,
          });
          userMessage.id = messageId;
        } catch (error) {
          console.warn("[frontend] Failed to persist user message:", error);
        }
      }
    }

    // Create assistant message with temp ID (will save to DB after streaming completes)
    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      model: this.activeModel,
      streaming: true,
    };

    this.appendMessage(conversationId, assistantMessage);

    // If there's a buffered orchestration update waiting, apply it now
    const runtime = this.orchestrationRuntimeByConversation[conversationId];
    if (runtime?.pendingUpdate) {
      console.log(
        "[frontend] Applying buffered orchestration update to new assistant message",
      );
      assistantMessage.metadata = {
        ...assistantMessage.metadata,
        ...runtime.pendingUpdate.metadata,
      };
      delete runtime.pendingUpdate;
      this.orchestrationRuntimeByConversation[conversationId] = runtime;
    }

    this.isStreaming = true;
    this.scheduleRender();

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const projectContext = conversationId
      ? this.projectByConversation[conversationId]
      : null;
    const projectFiles = projectContext
      ? this.projectFilesByProject[projectContext.id] || []
      : [];
    const projectManifest = projectContext
      ? this.buildProjectManifest(projectContext, projectFiles)
      : null;

    // Ensure guidance and spec files are loaded before building context
    if (projectContext && projectContext.id) {
      await this.ensureProjectFileContent(
        projectContext.id,
        "project.guidance.md",
      );
      await this.ensureProjectFileContent(projectContext.id, "project.spec.md");
    }

    const systemContext =
      projectContext && projectManifest
        ? this.buildSystemContext(projectContext, projectFiles, projectManifest)
        : "";
    const payload = {
      model: this.activeModel,
      messages: [
        ...(systemContext
          ? [
              {
                role: "system",
                content: systemContext,
              },
            ]
          : []),
        ...this.activeMessages.map((msg) => {
          const message = {
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          };
          // Add images array if present (for multimodal models)
          if (msg.images && msg.images.length > 0) {
            message.images = msg.images;
          }
          return message;
        }),
        ...(options.internal
          ? [
              {
                role: "user",
                content: message,
              },
            ]
          : []),
      ],
    };

    let lastChunk = "";
    let repeatChunkCount = 0;
    let repetitionStopTriggered = false;
    let orchestrationMeta = null;
    let suppressAssistantOutput = false;

    try {
      for await (const chunk of streamConversationChat(
        conversationId,
        payload,
        { signal: this.abortController.signal },
      )) {
        if (chunk?.orchestration) {
          suppressAssistantOutput = true;
          const runtime =
            this.orchestrationRuntimeByConversation[conversationId] || {};
          runtime.suppressAssistant = true;
          runtime.buffer = runtime.buffer || "";
          this.orchestrationRuntimeByConversation[conversationId] = runtime;
        }
        const content = chunk?.message?.content || "";
        if (content) {
          if (suppressAssistantOutput) {
            const runtime =
              this.orchestrationRuntimeByConversation[conversationId] || {};
            runtime.buffer = `${runtime.buffer || ""}${content}`;
            this.orchestrationRuntimeByConversation[conversationId] = runtime;
          } else {
            this.updateLastAssistantMessage(conversationId, (msg) => {
              msg.content += content;
            });
            this.detectStreamingFile(
              this.messagesByConversation[conversationId],
            );
          }

          if (!repetitionStopTriggered) {
            if (content === lastChunk && content) {
              repeatChunkCount += 1;
            } else {
              repeatChunkCount = 0;
              lastChunk = content;
            }

            const latest =
              this.messagesByConversation[conversationId]?.slice(-1)[0];
            const fullContent = latest?.content || "";
            if (
              repeatChunkCount >= 5 ||
              (fullContent && this.hasRepeatingTail(fullContent))
            ) {
              repetitionStopTriggered = true;
              this.stopStreaming("repetition");
            }
          }
        }
        if (chunk?.orchestration) {
          console.log("[frontend] Orchestration chunk:", {
            phase: chunk.orchestration.phase,
            elapsed: chunk.orchestration.elapsed,
            timestamp: Date.now(),
          });
          await this.updateOrchestrationStatus(
            conversationId,
            chunk.orchestration,
          );
          // Note: updateOrchestrationStatus already handles rendering internally
        }
        if (chunk?.done) {
          const totalTokens =
            (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0);
          const runtime =
            this.orchestrationRuntimeByConversation[conversationId] || {};
          const bufferedContent = runtime.buffer || "";
          const finalContent = suppressAssistantOutput ? bufferedContent : null;
          let finalMessageContent = "";
          this.updateLastAssistantMessage(conversationId, (msg) => {
            msg.streaming = false;
            msg.tokens = totalTokens ? String(totalTokens) : msg.tokens;
            if (chunk?.orchestration) {
              // Preserve existing orchestration metadata (accumulated status)
              msg.metadata = {
                ...(msg.metadata || {}),
                orchestration: {
                  ...(msg.metadata?.orchestration || {}),
                  ...chunk.orchestration,
                },
              };
            }
            if (suppressAssistantOutput) {
              const files = this.extractFilesFromContent(finalContent);
              const filePaths = files.map((file) => file.path);
              if (filePaths.length) {
                finalMessageContent = `Files updated:\n${filePaths
                  .map((path) => `- ${path}`)
                  .join("\n")}\n\nOpen the Project tab to view file contents.`;
              } else {
                finalMessageContent = finalContent;
              }
              msg.content = finalMessageContent;
              msg.fileBlocks = filePaths.length ? files : [];
              // Preserve orchestrationStatus when adding rawOutput
              msg.metadata = {
                ...(msg.metadata || {}),
                rawOutput: finalContent,
                orchestration: {
                  ...(msg.metadata?.orchestration || {}),
                  ...chunk?.orchestration,
                },
              };
            }
          });
          this.isStreaming = false;
          orchestrationMeta = chunk?.orchestration || null;

          // Flush any pending orchestration status updates
          await this.flushOrchestrationUpdate(conversationId);

          // Save generated files to project if orchestration completed successfully
          console.log("[frontend] Checking if files should be saved:", {
            suppressAssistantOutput,
            hasFinalContent: !!finalContent,
            hasOrchestration: !!chunk?.orchestration,
            hasOutput: !!chunk?.orchestration?.details?.output,
            orchestrationPhase: chunk?.orchestration?.phase,
            validation: chunk?.orchestration?.validation,
          });

          if (
            suppressAssistantOutput &&
            finalContent &&
            chunk?.orchestration?.details?.output
          ) {
            console.log(
              "[frontend] Orchestration completed, saving files to project",
            );
            await this.persistFilesFromResponse(
              conversationId,
              chunk.orchestration.details.output,
            );
            console.log("[frontend] Files saved successfully");
          } else {
            console.warn("[frontend] File save condition not met");
          }

          const assistantContent = suppressAssistantOutput
            ? finalContent
            : this.activeMessages
                .filter((msg) => msg.role === "assistant")
                .slice(-1)[0]?.content;
          if (conversationId && assistantContent) {
            try {
              const messageContent = suppressAssistantOutput
                ? finalMessageContent || assistantContent
                : assistantContent;
              // Get the assistant message from memory (has orchestrationStatus from updateOrchestrationStatus calls)
              const messages =
                this.messagesByConversation[conversationId] || [];
              const lastAssistant = messages
                .filter((msg) => msg.role === "assistant")
                .slice(-1)[0];

              // Merge ALL metadata: use in-memory orchestrationStatus + final orchestration from stream
              const finalMetadata = {
                ...(lastAssistant?.metadata || {}),
                orchestration: {
                  ...(lastAssistant?.metadata?.orchestration || {}),
                  ...(orchestrationMeta || {}),
                },
                ...(suppressAssistantOutput
                  ? { rawOutput: assistantContent }
                  : {}),
              };

              console.log(
                "[handleSend] Saving assistant message with metadata:",
                {
                  hasOrchestrationStatus:
                    !!lastAssistant?.metadata?.orchestrationStatus,
                  orchestrationStatus:
                    lastAssistant?.metadata?.orchestrationStatus,
                  finalMetadata: finalMetadata,
                },
              );

              // Create the message in DB with final content and ALL metadata (including orchestrationStatus)
              const messageId = await createMessage(conversationId, {
                role: "assistant",
                content: messageContent,
                model: this.activeModel,
                metadata: finalMetadata,
              });
              await logTokenUsage({
                messageId,
                conversationId,
                model: this.activeModel,
                promptTokens: chunk.prompt_eval_count || 0,
                completionTokens: chunk.eval_count || 0,
                totalTokens,
              });
              this.updateConversationMetrics(conversationId, totalTokens || 0);
              await this.persistFilesFromResponse(
                conversationId,
                assistantContent,
              );
            } catch (error) {
              console.warn(
                "[frontend] Failed to persist assistant message:",
                error,
              );
            }
          }
          this.scheduleRender();
        }
      }
    } catch (error) {
      if (this.stopRequested && this.abortController?.signal?.aborted) {
        this.updateLastAssistantMessage(conversationId, (msg) => {
          msg.streaming = false;
          if (this.stopRequestedReason === "repetition") {
            msg.content = `${msg.content || ""}\n\n[Stopped due to repetition]`;
          }
        });
        this.isStreaming = false;
        this.stopRequested = false;
        this.stopRequestedReason = "";
        this.scheduleRender();
        return;
      }
      console.error("[frontend] Chat stream failed:", error);
      this.updateLastAssistantMessage(conversationId, (msg) => {
        msg.streaming = false;
        msg.content = msg.content || "Unable to stream response.";
      });
      this.isStreaming = false;
      this.scheduleRender();
    }
  }

  stopStreaming(reason = "") {
    if (!this.isStreaming) return;
    this.stopRequested = true;
    this.stopRequestedReason = reason;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  hasRepeatingTail(content) {
    const minLen = 20;
    const maxLen = 200;
    const tail = content.slice(-maxLen * 3);
    for (let len = minLen; len <= maxLen; len += 10) {
      const repeatLen = len * 3;
      if (tail.length < repeatLen) continue;
      const segment = tail.slice(-len);
      if (tail.endsWith(segment.repeat(3))) {
        return true;
      }
    }
    return false;
  }

  attachListeners() {
    const chatInput = this.querySelector("ollama-chat-input");
    chatInput?.addEventListener("send", (event) => {
      this.handleSend(event.detail?.value, event.detail?.attachedFiles);
    });
    chatInput?.addEventListener("stop", () => {
      this.stopStreaming();
    });
    chatInput?.addEventListener("model-change", (event) => {
      const value = event.detail?.value;
      if (value) {
        this.activeModel = value;
        // Don't re-render - the chat-input component handles its own update
      }
    });

    // Handle regenerate from user messages
    this.addEventListener("regenerate-message", (event) => {
      // Find the message that triggered regenerate
      const messageElement = event.target.closest("ollama-user-message");
      if (!messageElement) return;

      const content = messageElement.getAttribute("content");
      if (content) {
        this.handleSend(content, []);
      }
    });

    const toggle = this.querySelector("ollama-toggle-switch");
    toggle?.addEventListener("change", (event) => {
      const value = event.detail?.value;
      this.setMode(value === "right" ? "project" : "chat");
    });

    const container = this.querySelector("ollama-chat-container");
    container?.addEventListener("sidebar-toggle", (event) => {
      const open = event.detail?.open;
      this.sidebarOpen = Boolean(open);
      this.scheduleRender();
    });

    this.querySelectorAll("ollama-conversation-item").forEach((item) => {
      item.addEventListener("conversation-selected", (event) => {
        const id = event.detail?.id;
        if (!id) return;
        this.activeConversationId = id;
        Promise.all([this.loadMessages(id), this.loadProject(id)]).then(() =>
          this.scheduleRender(),
        );
      });
      item.addEventListener("conversation-rename", async (event) => {
        const id = event.detail?.id;
        if (!id) return;
        this.editingConversationId = id;
        this.scheduleRender();
      });
      item.addEventListener("conversation-rename-draft", (event) => {
        const id = event.detail?.id;
        if (!id) return;
        this.renameDrafts[id] = event.detail?.title ?? "";
      });
      item.addEventListener("conversation-rename-commit", async (event) => {
        const id = event.detail?.id;
        const nextTitle = event.detail?.title?.trim();
        if (!id) return;
        const conversation = this.conversations.find((item) => item.id === id);
        const currentTitle = conversation?.title || "New chat";
        if (!nextTitle || nextTitle === currentTitle) {
          this.editingConversationId = "";
          delete this.renameDrafts[id];
          this.scheduleRender();
          return;
        }
        conversation.title = nextTitle;
        this.editingConversationId = "";
        delete this.renameDrafts[id];
        this.scheduleRender();
        try {
          await updateConversationTitle(id, nextTitle);
          const project = this.projectByConversation[id];
          if (project?.id) {
            await updateProject(project.id, { name: nextTitle });
            project.name = nextTitle;
            await this.ensureProjectManifest(
              project,
              this.projectFilesByProject[project.id] || [],
            );
            await this.loadProject(id);
          }
        } catch (error) {
          console.warn("[frontend] Failed to rename conversation:", error);
          this.editingConversationId = id;
          this.renameDrafts[id] = nextTitle;
          this.scheduleRender();
        }
      });
      item.addEventListener("conversation-rename-cancel", () => {
        const id = this.editingConversationId;
        this.editingConversationId = "";
        if (id) {
          delete this.renameDrafts[id];
        }
        this.scheduleRender();
      });
      item.addEventListener("conversation-action", (event) => {
        const id = event.detail?.id;
        const action = event.detail?.action;
        if (!id || action !== "delete") return;
        this.pendingDeleteConversation = id;
        this.scheduleRender();
      });
    });

    const newChatButton = this.querySelector("[data-new-chat]");
    newChatButton?.addEventListener("click", async () => {
      const id = await this.createConversationRecord({ title: "New chat" });
      if (!id) return;
      this.conversations.unshift({
        id,
        title: "New chat",
        model: this.activeModel,
        timestamp: Date.now(),
        messageCount: 0,
        tokenCount: 0,
        unread: 0,
      });
      this.activeConversationId = id;
      this.messagesByConversation[id] = [];
      this.scheduleRender();
    });

    const confirmDialog = this.querySelector("ollama-confirm-dialog");
    confirmDialog?.addEventListener("confirm", async () => {
      const id = this.pendingDeleteConversation;
      this.pendingDeleteConversation = null;
      if (!id) return;
      try {
        await deleteConversation(id);
        this.conversations = this.conversations.filter(
          (entry) => entry.id !== id,
        );
        delete this.messagesByConversation[id];
        if (this.activeConversationId === id) {
          const next = this.conversations[0];
          if (next) {
            this.activeConversationId = next.id;
            await this.loadMessages(next.id);
          } else {
            const newId = await this.createConversationRecord({
              title: "New chat",
            });
            if (newId) {
              this.conversations = [
                {
                  id: newId,
                  title: "New chat",
                  model: this.activeModel,
                  timestamp: Date.now(),
                  messageCount: 0,
                  tokenCount: 0,
                  unread: 0,
                },
              ];
              this.activeConversationId = newId;
              this.messagesByConversation[newId] = [];
            }
          }
        }
        this.scheduleRender();
      } catch (error) {
        console.warn("[frontend] Failed to delete conversation:", error);
      }
    });
    confirmDialog?.addEventListener("cancel", () => {
      this.pendingDeleteConversation = null;
      this.scheduleRender();
    });

    const projectView = this.querySelector("ollama-project-view");
    if (projectView) {
      projectView.addEventListener("file-selected", (event) => {
        const path = event.detail?.path;
        if (!path || !this.activeConversationId) return;
        const state = this.getProjectState(this.activeConversationId);
        state.selectedPath = path;
        const project = this.projectByConversation[this.activeConversationId];
        if (project?.id) {
          this.ensureProjectFileContent(project.id, path).then(() =>
            this.scheduleRender(),
          );
        } else {
          this.scheduleRender();
        }
      });
      projectView.addEventListener("expanded-change", (event) => {
        const expanded = event.detail?.expanded || [];
        if (!this.activeConversationId) return;
        const state = this.getProjectState(this.activeConversationId);
        state.expanded = expanded;
        this.scheduleRender();
      });

      projectView.addEventListener("project-download", async () => {
        await this.handleProjectDownload();
      });
    }

    const previewToggle = this.querySelector("[data-preview-open]");
    previewToggle?.addEventListener("click", async () => {
      const project = this.projectByConversation[this.activeConversationId];
      if (!project?.id) return;
      await this.ensureAllProjectFilesContent(project.id);
      await this.updateProjectLint(project.id);
      const lintErrors = this.projectLintByProject[project.id] || [];
      if (lintErrors.length) {
        this.previewOpen = true;
        this.previewError =
          "Preview blocked. Fix missing file references in index.html.";
        this.previewUrl = "";
        this.scheduleRender();
        return;
      }
      this.previewOpen = true;
      this.previewError = "";
      this.previewUrl = this.buildPreviewUrl(project.id);
      this.scheduleRender();
    });

    const previewClose = this.querySelector("[data-preview-close]");
    previewClose?.addEventListener("click", () => {
      this.previewOpen = false;
      this.previewError = "";
      this.previewUrl = "";
      this.scheduleRender();
    });

    const previewReload = this.querySelector("[data-preview-reload]");
    previewReload?.addEventListener("click", () => {
      const project = this.projectByConversation[this.activeConversationId];
      if (!project?.id) return;
      this.previewError = "";
      this.previewUrl = this.buildPreviewUrl(project.id);
      this.scheduleRender();
    });

    const previewCopy = this.querySelector("[data-preview-copy]");
    previewCopy?.addEventListener("click", async () => {
      const project = this.projectByConversation[this.activeConversationId];
      if (!project?.id) return;
      const url = this.getSharePreviewUrl(project.id);
      try {
        await navigator.clipboard.writeText(url);
      } catch (error) {
        console.warn("[frontend] Failed to copy preview URL:", error);
      }
    });

    this.querySelectorAll("[data-orchestration-download]").forEach((button) => {
      button.onclick = () => {
        const messageId = button.getAttribute("data-message-id");
        const conversationId = this.activeConversationId;
        if (!messageId || !conversationId) return;
        const messages = this.messagesByConversation[conversationId] || [];
        const message = messages.find((msg) => msg.id === messageId);
        const output = message?.metadata?.orchestration?.details?.output;
        if (!output) return;
        const blob = new Blob([output], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `orchestration-output-${messageId}.txt`;
        link.click();
        URL.revokeObjectURL(url);
      };
    });

    const recoverButton = this.querySelector("[data-recover-files]");
    recoverButton?.addEventListener("click", async () => {
      const conversationId = this.activeConversationId;
      if (!conversationId) return;
      await this.ensureProjectFromMessages(conversationId, true);
    });

    const fixMissingButton = this.querySelector("[data-fix-missing]");
    fixMissingButton?.addEventListener("click", async () => {
      const conversationId = this.activeConversationId;
      const project = this.projectByConversation[conversationId];
      if (!conversationId || !project?.id) return;
      const entryPath = this.getProjectEntryPath(project.id);
      const lintErrors = this.projectLintByProject[project.id] || [];
      if (!lintErrors.length) return;
      const prompt = this.buildMissingReferencesPrompt(entryPath, lintErrors);
      await this.handleSend(prompt);
    });
  }

  renderMessages(messages) {
    if (!messages.length) {
      return "";
    }
    return messages
      .map((msg) => {
        if (msg.role === "user") {
          return `
            <ollama-user-message
              content="${this.escapeAttribute(msg.content)}"
              timestamp="${msg.timestamp || ""}"
              model="${msg.model || ""}"
              ${msg.tokens ? `tokens="${msg.tokens}"` : ""}
            ></ollama-user-message>
          `;
        }
        // Orchestrator messages are now rendered inside ai-response components
        // This code path should not be hit anymore
        if (msg.kind === "orchestrator") {
          console.warn(
            "[render] Unexpected standalone orchestrator message:",
            msg.id,
          );
          return ""; // Don't render standalone orchestrator messages
        }
        if (msg.filePreview) {
          const parts = this.extractFilePreviewParts(
            msg.content,
            msg.fileLanguage || "html",
          );
          return `
            <ollama-ai-response
              timestamp="${msg.timestamp || ""}"
              model="${msg.model || ""}"
              ${msg.tokens ? `tokens="${msg.tokens}"` : ""}
              ${msg.streaming ? "streaming" : ""}
            >
              ${
                parts.before
                  ? `<ollama-markdown-renderer content="${this.escapeAttribute(
                      parts.before,
                    )}"></ollama-markdown-renderer>`
                  : ""
              }
              <ollama-code-block
                language="${this.escapeAttribute(parts.language)}"
                code="${this.escapeAttribute(parts.code)}"
              ></ollama-code-block>
              ${
                parts.after
                  ? `<ollama-markdown-renderer content="${this.escapeAttribute(
                      parts.after,
                    )}"></ollama-markdown-renderer>`
                  : ""
              }
            </ollama-ai-response>
          `;
        }
        // Check if this message has orchestration metadata
        const hasOrchestration =
          msg.metadata?.orchestrationStatus || msg.metadata?.orchestration;
        const orchestratorHtml = hasOrchestration
          ? (() => {
              const status = msg.metadata?.orchestrationStatus || {};
              const orchestration = msg.metadata?.orchestration || {};
              const phase = orchestration.phase || "working";
              const files = (status.files || []).join(",");
              const steps = status.steps ? JSON.stringify(status.steps) : "";
              const elapsed = orchestration.elapsed || 0;
              const bytesGenerated = orchestration.bytesGenerated || "";
              const filesRequested = orchestration.filesRequested || [];

              console.log(
                "[render] Orchestrator metadata for message:",
                msg.id,
                {
                  phase,
                  statusFiles: status.files,
                  statusSteps: status.steps,
                  files,
                  steps,
                },
              );

              return `
            <ollama-orchestrator-status
              slot="details"
              phase="${this.escapeAttribute(phase)}"
              elapsed="${elapsed}"
              ${files ? `files="${this.escapeAttribute(files)}"` : ""}
              ${steps ? `steps="${this.escapeAttribute(steps)}"` : ""}
              ${bytesGenerated ? `bytes-generated="${bytesGenerated}"` : ""}
              ${filesRequested.length ? `files-requested="${this.escapeAttribute(filesRequested.join(","))}"` : ""}
            ></ollama-orchestrator-status>
          `;
            })()
          : "";

        return `
          <ollama-ai-response
            content="${this.escapeAttribute(msg.content)}"
            timestamp="${msg.timestamp || ""}"
            model="${msg.model || ""}"
            ${msg.tokens ? `tokens="${msg.tokens}"` : ""}
            ${msg.streaming ? "streaming" : ""}
          >
            ${orchestratorHtml}
          </ollama-ai-response>
        `;
      })
      .join("");
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }

  render() {
    const showProject = this.mode === "project";
    const modelOptions = JSON.stringify(this.models);
    const messages = this.activeMessages;
    const activeConversation =
      this.conversations.find(
        (entry) => entry.id === this.activeConversationId,
      ) || this.conversations[0];
    const chatLabel = activeConversation?.title || "Chat";
    const messageCount = activeConversation?.messageCount || 0;
    const tokenCount = activeConversation?.tokenCount || 0;
    const headerLabel = showProject ? `Project for ${chatLabel}` : chatLabel;
    const pendingConversation = this.pendingDeleteConversation
      ? this.conversations.find(
          (entry) => entry.id === this.pendingDeleteConversation,
        )
      : null;
    const deleteMessage = pendingConversation
      ? `Deleting the conversation '${pendingConversation.title || "Untitled chat"}' cannot be undone.`
      : "";
    const activeProject =
      this.projectByConversation[this.activeConversationId] || null;
    const projectFiles = activeProject
      ? this.projectFilesByProject[activeProject.id] || []
      : [];
    const projectTree = activeProject
      ? this.projectTreeByProject[activeProject.id] || {
          name: activeProject.name || "Project",
          type: "directory",
          children: [],
        }
      : { name: "Project", type: "directory", children: [] };
    const projectState = this.activeConversationId
      ? this.getProjectState(this.activeConversationId)
      : { selectedPath: "", expanded: [] };
    const selectedPath = projectState.selectedPath || "";
    const selectedFile = activeProject
      ? this.projectFileContentByProject[activeProject.id]?.[selectedPath]
      : null;
    const selectedMeta = selectedPath
      ? projectFiles.find((file) => file.path === selectedPath)
      : null;
    const entryPath = activeProject
      ? this.getProjectEntryPath(activeProject.id)
      : "";
    const lintErrors =
      activeProject && selectedPath === entryPath
        ? this.projectLintByProject[activeProject.id] || []
        : [];
    const hasLintErrors = Boolean(
      activeProject &&
      (this.projectLintByProject[activeProject.id] || []).length,
    );
    const previewUrl = this.previewUrl || "";
    const deferFileContent = showProject && this.deferProjectContent;

    this.innerHTML = `
      <ollama-chat-container ${
        !showProject && this.sidebarOpen ? "sidebar-open" : ""
      } ${showProject ? 'mode="project"' : 'mode="chat"'}>
        <nav
          slot="sidebar"
          aria-label="Conversations"
          style="display: flex; flex-direction: column; gap: 16px; height: 100%;"
        >
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <ollama-text variant="title" size="md" weight="semibold">
              Conversations
            </ollama-text>
            <ollama-conversation-list>
              ${this.conversations
                .map(
                  (conversation) => `
                    <ollama-conversation-item
                      conversation-id="${conversation.id}"
                      conversation-title="${this.escapeAttribute(conversation.title)}"
                      message-count="${conversation.messageCount || 0}"
                      token-count="${conversation.tokenCount || 0}"
                      ${conversation.unread ? `unread-count="${conversation.unread}"` : ""}
                      ${
                        conversation.id === this.activeConversationId
                          ? "selected"
                          : ""
                      }
                      ${conversation.id === this.editingConversationId ? "editing" : ""}
                      ${
                        conversation.id === this.editingConversationId &&
                        this.renameDrafts[conversation.id]
                          ? `draft-title="${this.escapeAttribute(
                              this.renameDrafts[conversation.id],
                            )}"`
                          : ""
                      }
                    ></ollama-conversation-item>
                  `,
                )
                .join("")}
            </ollama-conversation-list>
          </div>
          <div style="margin-top: auto;">
            <ollama-sidebar-user name="Kevin Hill" logged-in></ollama-sidebar-user>
          </div>
        </nav>
        <header slot="header" aria-label="App bar" style="display: flex; align-items: center; gap: 12px;">
          <ollama-text variant="label">${this.escapeAttribute(headerLabel)}</ollama-text>
          ${
            !showProject && activeConversation
              ? `
            <div style="display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary);">
              <div style="display: flex; align-items: center; gap: 4px;">
                <ollama-icon name="messages-square" size="xs"></ollama-icon>
                <ollama-text variant="caption" color="muted">${messageCount > 99 ? "99+" : messageCount}</ollama-text>
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <ollama-icon name="ticket" size="xs"></ollama-icon>
                <ollama-text variant="caption" color="muted">${tokenCount < 1000 ? tokenCount : Math.floor(tokenCount / 1000) + "K"}</ollama-text>
              </div>
            </div>
          `
              : ""
          }
        </header>
        ${
          showProject
            ? `
              <div slot="header-actions" aria-label="Project actions">
                <ollama-action-bar>
                  ${
                    this.previewOpen
                      ? `
                        <ollama-button
                          variant="icon"
                          aria-label="Close preview"
                          data-preview-close
                        >
                          <ollama-icon name="x"></ollama-icon>
                          <ollama-tooltip>Close preview</ollama-tooltip>
                        </ollama-button>
                        <ollama-button
                          variant="icon"
                          aria-label="Refresh preview"
                          data-preview-reload
                        >
                          <ollama-icon name="refresh-cw"></ollama-icon>
                          <ollama-tooltip>Refresh preview</ollama-tooltip>
                        </ollama-button>
                        <ollama-button
                          variant="icon"
                          aria-label="Copy preview link"
                          data-preview-copy
                        >
                          <ollama-icon name="link"></ollama-icon>
                          <ollama-tooltip>Copy preview link</ollama-tooltip>
                        </ollama-button>
                      `
                      : `
                        <ollama-button
                          variant="icon"
                          aria-label="Open preview"
                          data-preview-open
                          ${hasLintErrors ? "disabled" : ""}
                        >
                          <ollama-icon name="play"></ollama-icon>
                          <ollama-tooltip>${
                            hasLintErrors
                              ? "Fix missing files before preview"
                              : "Preview"
                          }</ollama-tooltip>
                        </ollama-button>
                        ${
                          hasLintErrors
                            ? `
                              <ollama-button
                                variant="icon"
                                aria-label="Fix missing files"
                                data-fix-missing
                              >
                                <ollama-icon name="wand-2"></ollama-icon>
                                <ollama-tooltip>Fix missing files</ollama-tooltip>
                              </ollama-button>
                            `
                            : ""
                        }
                      `
                  }
                  <ollama-button
                    variant="icon"
                    aria-label="Recover files from chat"
                    data-recover-files
                  >
                    <ollama-icon name="search"></ollama-icon>
                    <ollama-tooltip>Recover files</ollama-tooltip>
                  </ollama-button>
                </ollama-action-bar>
              </div>
            `
            : `
              <div slot="header-actions" aria-label="Chat actions">
                <ollama-action-bar>
                  <ollama-button
                    class="sidebar-toggle"
                    variant="icon"
                    aria-label="Toggle sidebar"
                    aria-expanded="${this.sidebarOpen ? "true" : "false"}"
                    aria-controls="ollama-sidebar-panel"
                  >
                    <ollama-icon name="panel-left"></ollama-icon>
                    <ollama-tooltip>Toggle sidebar</ollama-tooltip>
                  </ollama-button>
                  <ollama-button
                    variant="icon"
                    aria-label="New chat"
                    data-new-chat
                  >
                    <ollama-icon name="message-square-plus"></ollama-icon>
                    <ollama-tooltip>New chat</ollama-tooltip>
                  </ollama-button>
                </ollama-action-bar>
              </div>
            `
        }
        <div slot="header-controls" aria-label="Header controls">
          <ollama-action-bar>
            <ollama-toggle-switch
              value="${showProject ? "right" : "left"}"
              left-label="Chat"
              right-label="Project"
            ></ollama-toggle-switch>
          </ollama-action-bar>
        </div>
        <main slot="main" aria-label="Workspace" style="height: 100%;">
          ${
            showProject
              ? `
                <div style="position: relative; height: 100%;">
                  ${
                    this.previewOpen
                      ? `<ollama-live-preview
                           title="Preview"
                           chromeless
                           error="${this.escapeAttribute(this.previewError || "")}"
                           src="${this.escapeAttribute(previewUrl)}"
                         ></ollama-live-preview>`
                      : `<ollama-project-view
                           project-name="${this.escapeAttribute(activeProject?.name || "Project")}"
                           description="${this.escapeAttribute(
                             activeProject?.description ||
                               "Generated by Ollama Chat",
                           )}"
                           file-count="${projectFiles.length || 0}"
                           selected-path="${this.escapeAttribute(selectedPath)}"
                           file-language="${this.escapeAttribute(
                             selectedFile?.language ||
                               selectedMeta?.language ||
                               "",
                           )}"
                           file-size="${this.escapeAttribute(
                             selectedFile?.size || selectedMeta?.size || "",
                           )}"
                           file-lines="${this.escapeAttribute(
                             deferFileContent
                               ? ""
                               : selectedFile?.content
                                 ? selectedFile.content.split("\n").length
                                 : "",
                           )}"
                           file-content="${this.escapeAttribute(
                             deferFileContent
                               ? ""
                               : selectedFile?.content || "",
                           )}"
                           ${deferFileContent ? "loading" : ""}
                           lint-errors='${this.escapeAttribute(
                             JSON.stringify(lintErrors),
                           )}'
                           expanded='${this.escapeAttribute(
                             JSON.stringify(projectState.expanded || []),
                           )}'
                           tree='${this.escapeAttribute(JSON.stringify(projectTree))}'
                         ></ollama-project-view>`
                  }
                </div>
              `
              : `
                <ollama-message-list auto-scroll>
                  ${this.renderMessages(messages)}
                </ollama-message-list>
              `
          }
        </main>
        ${
          showProject
            ? ""
            : `
              <footer slot="footer" aria-label="Chat composer" style="padding: 12px 16px;">
                <ollama-chat-input
                  placeholder="Send a message..."
                  model="${this.activeModel}"
                  model-options='${this.escapeAttribute(modelOptions)}'
                  ${this.isStreaming ? "busy" : ""}
                ></ollama-chat-input>
              </footer>
            `
        }
      </ollama-chat-container>
      <ollama-confirm-dialog
        ${this.pendingDeleteConversation ? "open" : ""}
        title="Delete conversation"
        message="${this.escapeAttribute(deleteMessage)}"
        confirm-label="Delete"
        cancel-label="Cancel"
      ></ollama-confirm-dialog>
    `;

    this.attachListeners();
  }
}

if (!customElements.get("ollama-frontend-app")) {
  customElements.define("ollama-frontend-app", OllamaFrontendApp);
}
