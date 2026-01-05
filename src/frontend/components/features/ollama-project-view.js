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
    this.expanded = this.getAttribute("expanded") || "[]";
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
      // Create bound handlers only once
      if (!this._boundFileSelectedHandler) {
        this._boundFileSelectedHandler = (event) => {
          const path = event.detail?.path;
          if (path) {
            this.setAttribute("selected-path", path);
            this.emit("file-selected", { path });
          }
        };
      }
      if (!this._boundExpandedChangeHandler) {
        this._boundExpandedChangeHandler = (event) => {
          const expanded = event.detail?.expanded || [];
          this.expanded = JSON.stringify(expanded);
        };
      }

      // Remove from previous fileTree if it exists
      if (this._currentFileTree && this._currentFileTree !== fileTree) {
        this._currentFileTree.removeEventListener(
          "file-selected",
          this._boundFileSelectedHandler,
        );
        this._currentFileTree.removeEventListener(
          "expanded-change",
          this._boundExpandedChangeHandler,
        );
      }

      // Add to current fileTree
      fileTree.addEventListener(
        "file-selected",
        this._boundFileSelectedHandler,
      );
      fileTree.addEventListener(
        "expanded-change",
        this._boundExpandedChangeHandler,
      );
      this._currentFileTree = fileTree;
    }

    const downloadButton = this.shadowRoot?.querySelector(".download-button");
    if (downloadButton) {
      if (!this._boundDownloadHandler) {
        this._boundDownloadHandler = () => {
          this.emit("project-download");
        };
      }

      // Remove from previous button if it exists
      if (
        this._currentDownloadButton &&
        this._currentDownloadButton !== downloadButton
      ) {
        this._currentDownloadButton.removeEventListener(
          "click",
          this._boundDownloadHandler,
        );
      }

      downloadButton.addEventListener("click", this._boundDownloadHandler);
      this._currentDownloadButton = downloadButton;
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
    const expanded = this.expanded || "[]";

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
          grid-template-rows: 1fr;
          height: 100%;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
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
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .project-card {
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
        }

        .main {
          padding: var(--spacing-sm);
          overflow: auto;
        }

        .download-button {
          width: 32px;
          height: 32px;
          border-radius: 16px;
        }
      </style>
      <div class="layout" part="layout">
        <aside class="aside" part="file-tree">
          <div class="project-card" part="project-card">
            <div class="meta">
              <ollama-text variant="label">${name}</ollama-text>
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
          </div>
          <slot name="file-tree">
            <ollama-file-tree
              tree='${this.escapeAttribute(tree)}'
              selected="${selectedPath}"
              expanded='${this.escapeAttribute(expanded)}'
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
              expanded
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
