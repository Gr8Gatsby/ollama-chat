import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-icon.js";
import "../base/ollama-text.js";

class OllamaFileTree extends BaseComponent {
  static get observedAttributes() {
    return ["tree", "selected", "expanded"];
  }

  constructor() {
    super();
    this.expandedPaths = new Set();
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === "expanded") {
        this.expandedPaths = new Set(this.parseExpanded());
      }
      this.render();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.expandedPaths = new Set(this.parseExpanded());
    this.attachEventListeners();
  }

  parseTree() {
    const raw = this.getAttribute("tree");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("<ollama-file-tree> invalid tree", error);
      return null;
    }
  }

  parseExpanded() {
    const raw = this.getAttribute("expanded");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("<ollama-file-tree> invalid expanded", error);
      return [];
    }
  }

  getSelectedPath() {
    return this.getAttribute("selected") || "";
  }

  isExpanded(path) {
    return this.expandedPaths.has(path);
  }

  toggleDirectory(path) {
    if (this.expandedPaths.has(path)) {
      this.expandedPaths.delete(path);
    } else {
      this.expandedPaths.add(path);
    }
    this.render();
  }

  attachEventListeners() {
    const tree = this.shadowRoot?.querySelector(".tree");
    if (!tree) return;
    tree.addEventListener("click", (event) => {
      const target = event.target.closest("[data-path]");
      if (!target) return;
      const path = target.getAttribute("data-path");
      const type = target.getAttribute("data-type");
      if (!path) return;
      if (type === "directory") {
        this.toggleDirectory(path);
      } else {
        this.emit("file-selected", { path });
        this.setAttribute("selected", path);
      }
    });
  }

  iconForNode(node) {
    if (node.type === "directory") {
      return this.isExpanded(node.path) ? "folder-open" : "folder";
    }
    const name = node.name || "";
    if (name.endsWith(".js") || name.endsWith(".ts")) return "file-code";
    if (name.endsWith(".css")) return "file-code";
    if (name.endsWith(".html")) return "file-code";
    if (name.endsWith(".json")) return "file-code";
    if (name.endsWith(".md")) return "file-text";
    return "file";
  }

  renderNode(node, depth = 0, parentPath = "") {
    const path = node.path || `${parentPath}${node.name}`;
    const isDirectory = node.type === "directory";
    const isExpanded = isDirectory && this.isExpanded(path);
    const selected = this.getSelectedPath() === path;

    const children =
      isDirectory && node.children
        ? node.children
            .map((child) => this.renderNode(child, depth + 1, `${path}/`))
            .join("")
        : "";

    const depthClass = `depth-${Math.min(depth, 6)}`;

    return `
      <div
        class="node ${depthClass} ${selected ? "selected" : ""}"
        data-path="${path}"
        data-type="${node.type}"
        role="treeitem"
        aria-expanded="${isDirectory ? String(isExpanded) : "false"}"
      >
        <ollama-icon name="${this.iconForNode({ ...node, path })}" size="sm"></ollama-icon>
        <ollama-text>${node.name}</ollama-text>
      </div>
      ${isExpanded ? children : ""}
    `;
  }

  render() {
    const tree = this.parseTree();
    const content = tree
      ? this.renderNode(tree, 0, "")
      : `<ollama-text variant="caption" color="muted">No files yet.</ollama-text>`;

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
        }

        .tree {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xxs, 2px);
        }

        .node {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .node.depth-0 { padding-inline-start: var(--spacing-sm); }
        .node.depth-1 { padding-inline-start: calc(var(--spacing-sm) + 12px); }
        .node.depth-2 { padding-inline-start: calc(var(--spacing-sm) + 24px); }
        .node.depth-3 { padding-inline-start: calc(var(--spacing-sm) + 36px); }
        .node.depth-4 { padding-inline-start: calc(var(--spacing-sm) + 48px); }
        .node.depth-5 { padding-inline-start: calc(var(--spacing-sm) + 60px); }
        .node.depth-6 { padding-inline-start: calc(var(--spacing-sm) + 72px); }

        .node:hover {
          background: var(--color-bg-secondary);
        }

        .node.selected {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
        }
      </style>
      <div class="tree" role="tree">${content}</div>
    `;

    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-file-tree")) {
  customElements.define("ollama-file-tree", OllamaFileTree);
}

export { OllamaFileTree };
