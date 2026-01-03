import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";
import "./ollama-file-tree.js";
import "./ollama-file-display.js";

class OllamaProjectView extends BaseComponent {
  static get observedAttributes() {
    return [
      "project-name",
      "description",
      "file-count",
      "tree",
      "selected-path",
      "file-content",
      "file-language",
      "file-size",
      "file-lines",
      "loading",
    ];
  }

  constructor() {
    super();
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  attachEventListeners() {
    const fileTree = this.shadowRoot?.querySelector("ollama-file-tree");
    if (fileTree) {
      fileTree.addEventListener("file-selected", (event) => {
        const path = event.detail?.path;
        if (path) {
          this.setAttribute("selected-path", path);
          this.emit("file-selected", { path });
        }
      });
    }

    const downloadButton = this.shadowRoot?.querySelector(".download-button");
    if (downloadButton) {
      downloadButton.addEventListener("click", () => {
        this.emit("project-download");
      });
    }
  }

  render() {
    const name = this.getAttribute("project-name") || "Untitled project";
    const description = this.getAttribute("description") || "";
    const fileCount = this.getAttribute("file-count") || "";
    const tree = this.getAttribute("tree") || "";
    const selectedPath = this.getAttribute("selected-path") || "";
    const fileContent = this.getAttribute("file-content") || "";
    const fileLanguage = this.getAttribute("file-language") || "";
    const fileSize = this.getAttribute("file-size") || "";
    const fileLines = this.getAttribute("file-lines") || "";
    const loading = this.hasAttribute("loading");

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          height: 100%;
        }

        .layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          grid-template-rows: auto 1fr;
          height: 100%;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .header {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm) var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-primary);
        }

        .meta {
          display: inline-flex;
          flex-direction: column;
          gap: var(--spacing-xxs, 2px);
        }

        .meta.align-end {
          align-items: flex-end;
        }

        .aside {
          border-right: 1px solid var(--color-border);
          padding: var(--spacing-sm);
          background: var(--color-bg-secondary);
          overflow: auto;
        }

        .main {
          padding: var(--spacing-sm);
          overflow: hidden;
        }

        .download-button {
          width: 32px;
          height: 32px;
          border-radius: 16px;
        }
      </style>
      <div class="layout" part="layout">
        <header class="header" part="header">
          <div class="meta">
            <ollama-text variant="title" size="md" weight="semibold">
              ${name}
            </ollama-text>
            ${
              description
                ? `<ollama-text variant="caption" color="muted">${description}</ollama-text>`
                : ""
            }
          </div>
          <div class="meta align-end">
            ${fileCount ? `<ollama-text variant="caption" color="muted">${fileCount} files</ollama-text>` : ""}
            <ollama-button class="download-button" variant="icon" aria-label="Download project">
              <ollama-icon name="download"></ollama-icon>
              <ollama-tooltip>Download</ollama-tooltip>
            </ollama-button>
          </div>
        </header>
        <aside class="aside" part="file-tree">
          <slot name="file-tree">
            <ollama-file-tree
              tree='${this.escapeAttribute(tree)}'
              selected="${selectedPath}"
            ></ollama-file-tree>
          </slot>
        </aside>
        <section class="main" part="file-display">
          <slot name="file-display">
            <ollama-file-display
              path="${selectedPath || "Select a file"}"
              content="${this.escapeAttribute(fileContent)}"
              language="${fileLanguage}"
              size="${fileSize}"
              lines="${fileLines}"
              ${loading ? "loading" : ""}
            ></ollama-file-display>
          </slot>
        </section>
      </div>
    `;

    this.attachEventListeners();
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }
}

if (!customElements.get("ollama-project-view")) {
  customElements.define("ollama-project-view", OllamaProjectView);
}

export { OllamaProjectView };
