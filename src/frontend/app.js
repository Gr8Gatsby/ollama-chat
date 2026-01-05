import "./components/features/ollama-chat-container.js";
import "./components/features/ollama-conversation-list.js";
import "./components/features/ollama-conversation-item.js";
import "./components/features/ollama-message-list.js";
import "./components/features/ollama-user-message.js";
import "./components/features/ollama-ai-response.js";
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
import { listModels, streamChat } from "./utils/ollama-client.js";
import {
  BACKEND_BASE,
  fetchConversations,
  createConversation,
  fetchMessages,
  fetchConversationProject,
  fetchProjectFiles,
  fetchProjectFile,
  createMessage,
  upsertProjectFile,
  updateProject,
  deleteConversation,
  updateConversationTitle,
  logTokenUsage,
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
  }

  connectedCallback() {
    this.render();
    this.loadModels();
    this.loadConversations();
  }

  async loadModels() {
    try {
      const models = await listModels();
      if (models.length) {
        this.models = models.map((model) => ({
          label: model.label,
          value: model.value,
          supportsVision: model.supportsVision,
        }));
        this.activeModel = this.models[0].value;
        this.scheduleRender();
      }
    } catch (error) {
      console.warn("[frontend] Failed to load models:", error);
    }
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
      this.renderQueued = false;
      this.render();
    });
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
    this.mode = nextMode;
    if (nextMode === "project" && this.activeConversationId) {
      this.loadProject(this.activeConversationId).then(() =>
        this.scheduleRender(),
      );
    }
    this.render();
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
      this.messagesByConversation[conversationId] = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model || this.activeModel,
        timestamp: msg.createdAt || Date.now(),
        tokens: msg.tokens && Number(msg.tokens) > 0 ? String(msg.tokens) : "",
        images: msg.images ? JSON.parse(msg.images) : undefined,
      }));
    } catch (error) {
      console.warn("[frontend] Failed to load messages:", error);
    }
  }

  async loadProject(conversationId) {
    if (!conversationId) return;
    try {
      const project = await fetchConversationProject(conversationId);
      if (!project) return;
      this.projectByConversation[conversationId] = project;
      const files = await fetchProjectFiles(project.id);
      this.projectFilesByProject[project.id] = files;
      await this.ensureProjectManifest(project, files);
      const refreshedFiles = this.projectFilesByProject[project.id] || files;
      this.projectTreeByProject[project.id] = this.buildFileTree(
        project.name,
        refreshedFiles,
      );
      const state = this.getProjectState(conversationId);
      if (!state.selectedPath && refreshedFiles.length) {
        state.selectedPath = refreshedFiles[0].path;
      }
      if (!state.expanded.length && project.name) {
        state.expanded = [project.name];
      }
      if (state.selectedPath) {
        await this.ensureProjectFileContent(project.id, state.selectedPath);
      }
      await this.updateProjectLint(project.id);
    } catch (error) {
      console.warn("[frontend] Failed to load project:", error);
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

    // Current files summary
    context += `### Current Files (${existingFiles.length})\n\n`;
    context += `Layout: ${filesByType.layout.join(", ") || "None"}\n`;
    context += `Styles: ${filesByType.styles.join(", ") || "None"}\n`;
    context += `App: ${filesByType.app.join(", ") || "None"}\n`;
    context += `Components: ${filesByType.components.length} component(s)\n`;
    if (filesByType.components.length > 0) {
      context +=
        filesByType.components.map((c) => `  - ${c}`).join("\n") + "\n";
    }
    context += "\n";

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

    context += `**Important**: Generate files using structured format (File: path followed by code block).\n`;
    if (hasExistingFiles) {
      context += `Only include files you are creating or modifying.`;
    }

    return context;
  }

  buildPreviewUrl(projectId) {
    if (!projectId) return "";
    return `${BACKEND_BASE}/api/projects/${projectId}/preview/?t=${Date.now()}`;
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
    await this.ensureProjectFileContent(project.id, "project.guidance.md");
    await this.ensureProjectFileContent(project.id, "project.spec.md");
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
          if (
            fenceLang === "js" ||
            fenceLang === "javascript" ||
            fenceLang === "ts" ||
            fenceLang === "typescript"
          ) {
            resolvedPath = "src/app.js";
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

  async persistFilesFromResponse(conversationId, content) {
    if (!conversationId || !content) return;
    const project = this.projectByConversation[conversationId];
    if (!project) {
      await this.loadProject(conversationId);
    }
    const projectId = this.projectByConversation[conversationId]?.id;
    if (!projectId) return;
    const files = this.extractFilesFromContent(content);
    if (!files.length) return;
    for (const file of files) {
      await upsertProjectFile(projectId, file);
    }
    await this.reconcileProjectManifest(projectId);
    this.projectFileContentByProject[projectId] = {};
    await this.loadProject(conversationId);
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
      if (messages[i].role === "assistant") {
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

  async handleSend(message, attachedFiles = []) {
    if (!message?.trim()) return;
    let conversationId = this.activeConversationId;
    if (!conversationId) {
      conversationId = await this.createConversationRecord({
        title: "New chat",
      });
      if (conversationId) {
        this.activeConversationId = conversationId;
      }
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

    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      model: this.activeModel,
      streaming: true,
    };

    this.appendMessage(conversationId, assistantMessage);
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
      ],
    };

    try {
      for await (const chunk of streamChat(payload, {
        signal: this.abortController.signal,
      })) {
        const content = chunk?.message?.content || "";
        if (content) {
          this.updateLastAssistantMessage(conversationId, (msg) => {
            msg.content += content;
          });
          this.detectStreamingFile(this.messagesByConversation[conversationId]);
        }
        if (chunk?.done) {
          const totalTokens =
            (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0);
          this.updateLastAssistantMessage(conversationId, (msg) => {
            msg.streaming = false;
            msg.tokens = totalTokens ? String(totalTokens) : msg.tokens;
          });
          this.isStreaming = false;
          const assistantContent = this.activeMessages
            .filter((msg) => msg.role === "assistant")
            .slice(-1)[0]?.content;
          if (conversationId && assistantContent) {
            try {
              const messageId = await createMessage(conversationId, {
                role: "assistant",
                content: assistantContent,
                model: this.activeModel,
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
      console.error("[frontend] Chat stream failed:", error);
      this.updateLastAssistantMessage(conversationId, (msg) => {
        msg.streaming = false;
        msg.content = msg.content || "Unable to stream response.";
      });
      this.isStreaming = false;
      this.scheduleRender();
    }
  }

  attachListeners() {
    const chatInput = this.querySelector("ollama-chat-input");
    chatInput?.addEventListener("send", (event) => {
      this.handleSend(event.detail?.value, event.detail?.attachedFiles);
    });
    chatInput?.addEventListener("model-change", (event) => {
      const value = event.detail?.value;
      if (value) {
        this.activeModel = value;
        // Don't re-render - the chat-input component handles its own update
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

    const previewShot = this.querySelector("[data-preview-shot]");
    previewShot?.addEventListener("click", async () => {
      const preview = this.querySelector("ollama-live-preview");
      if (!preview?.captureScreenshot) return;
      const dataUrl = await preview.captureScreenshot();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "preview.png";
      link.click();
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
        return `
          <ollama-ai-response
            content="${this.escapeAttribute(msg.content)}"
            timestamp="${msg.timestamp || ""}"
            model="${msg.model || ""}"
            ${msg.tokens ? `tokens="${msg.tokens}"` : ""}
            ${msg.streaming ? "streaming" : ""}
          ></ollama-ai-response>
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
              Sidebar
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
                          aria-label="Screenshot preview"
                          data-preview-shot
                        >
                          <ollama-icon name="camera"></ollama-icon>
                          <ollama-tooltip>Screenshot</ollama-tooltip>
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
                             selectedFile?.content
                               ? selectedFile.content.split("\n").length
                               : "",
                           )}"
                           file-content="${this.escapeAttribute(
                             selectedFile?.content || "",
                           )}"
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
