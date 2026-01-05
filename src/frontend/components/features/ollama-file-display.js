import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-badge.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";
import "../base/ollama-spinner.js";
const PRISM_BASE_URL = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0";
let prismLoadPromise = null;

async function ensurePrismLoaded() {
  if (typeof window === "undefined") return null;
  if (window.Prism) return window.Prism;
  if (!prismLoadPromise) {
    prismLoadPromise = (async () => {
      await import(`${PRISM_BASE_URL}/prism.js`);
      await Promise.all([
        import(`${PRISM_BASE_URL}/components/prism-javascript.js`),
        import(`${PRISM_BASE_URL}/components/prism-typescript.js`),
        import(`${PRISM_BASE_URL}/components/prism-json.js`),
        import(`${PRISM_BASE_URL}/components/prism-markup.js`),
        import(`${PRISM_BASE_URL}/components/prism-css.js`),
        import(`${PRISM_BASE_URL}/components/prism-markdown.js`),
      ]);
      return window.Prism;
    })();
  }
  return prismLoadPromise;
}

class OllamaFileDisplay extends BaseComponent {
  static get observedAttributes() {
    return [
      "path",
      "content",
      "language",
      "size",
      "lines",
      "loading",
      "expanded",
    ];
  }

  constructor() {
    super();
    this.copySuccess = false;
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.attachEventListeners();
  }

  getContent() {
    const attr = this.getAttribute("content");
    if (attr !== null) return attr;
    return (this.textContent || "").trim();
  }

  attachEventListeners() {
    const copyButton = this.shadowRoot?.querySelector(".copy-button");
    if (!copyButton) return;

    if (!this._copyHandler) {
      this._copyHandler = async () => {
        const code = this.getContent();
        try {
          await navigator.clipboard?.writeText(code);
          this.copySuccess = true;
          this.updateCopyButton();
          this.emit("copy-file", { content: code });

          // Reset after 2 seconds
          setTimeout(() => {
            this.copySuccess = false;
            this.updateCopyButton();
          }, 2000);
        } catch {
          this.emit("copy-file", { content: code, failed: true });
        }
      };
    }

    copyButton.addEventListener("click", this._copyHandler);

    const toggleButton = this.shadowRoot?.querySelector(".toggle-button");
    if (toggleButton) {
      toggleButton.addEventListener("click", () => {
        if (this.hasAttribute("expanded")) {
          this.removeAttribute("expanded");
        } else {
          this.setAttribute("expanded", "");
        }
      });
    }
  }

  normalizeLanguage(language) {
    const normalized = String(language || "text").toLowerCase();
    const mapping = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      html: "markup",
      xml: "markup",
      css: "css",
      md: "markdown",
    };
    return mapping[normalized] || normalized;
  }

  updateCopyButton() {
    const copyButton = this.shadowRoot?.querySelector(".copy-button");
    const icon = copyButton?.querySelector("ollama-icon");
    const tooltip = copyButton?.querySelector("ollama-tooltip");

    if (icon && tooltip) {
      if (this.copySuccess) {
        icon.setAttribute("name", "check");
        tooltip.textContent = "Copied!";
      } else {
        icon.setAttribute("name", "copy");
        tooltip.textContent = "Copy";
      }
    }
  }

  formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const idx = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** idx;
    return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  async applyHighlight(language, content) {
    const codeNode = this.shadowRoot?.querySelector("code");
    if (!codeNode) return;
    try {
      const Prism = await ensurePrismLoaded();
      if (Prism && Prism.languages?.[language]) {
        codeNode.innerHTML = Prism.highlight(
          content,
          Prism.languages[language],
          language,
        );
        return;
      }
    } catch (error) {
      console.warn("[ollama-file-display] Prism failed to load", error);
    }
    codeNode.textContent = content;
  }

  render() {
    const path = this.getAttribute("path") || "untitled";
    const language = this.normalizeLanguage(this.getAttribute("language"));
    const size = this.getAttribute("size");
    const lines = this.getAttribute("lines");
    const loading = this.hasAttribute("loading");
    const content = this.getContent();
    const expanded = this.hasAttribute("expanded");
    const derivedLines = lines || String(content.split("\n").length || 0);
    const derivedSize =
      size || this.formatBytes(new TextEncoder().encode(content).length);

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          height: 100%;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .body {
          position: relative;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding: var(--spacing-sm) var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
        }

        .meta {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          color: var(--color-text-secondary);
        }

        .header-actions {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .content {
          padding: var(--spacing-md);
          font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: var(--font-size-sm);
          line-height: 1.6;
          white-space: pre;
          overflow: auto;
          flex: 1;
          min-height: 0;
        }

        .loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(2px);
          font-family: var(--font-family);
        }

        .copy-button {
          width: 24px;
          height: 24px;
          border-radius: 12px;
        }

        :host(:not([expanded])) .body {
          display: none;
        }

        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: var(--color-text-tertiary);
        }

        .token.punctuation {
          color: var(--color-text-secondary);
        }

        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol {
          color: #2563eb;
        }

        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          color: #059669;
        }

        .token.operator,
        .token.entity,
        .token.url,
        .token.variable {
          color: #db2777;
        }

        .token.atrule,
        .token.keyword,
        .token.attr-value {
          color: #7c3aed;
        }

        .token.function,
        .token.class-name {
          color: #f59e0b;
        }

        .token.regex,
        .token.important {
          color: #ef4444;
        }
      </style>
      <div class="container">
      <div class="header">
        <div class="meta">
          <ollama-text variant="label">${path}</ollama-text>
          ${language ? `<ollama-badge size="sm">${language}</ollama-badge>` : ""}
          ${derivedSize ? `<ollama-badge size="sm">${derivedSize}</ollama-badge>` : ""}
          ${derivedLines ? `<ollama-badge size="sm">${derivedLines} lines</ollama-badge>` : ""}
        </div>
        <div class="meta">
          <div class="header-actions">
            <ollama-button class="toggle-button" variant="icon" aria-label="${
              expanded ? "Collapse file" : "Expand file"
            }">
              <ollama-icon name="${expanded ? "chevron-up" : "chevron-down"}" size="xs"></ollama-icon>
              <ollama-tooltip>${expanded ? "Collapse" : "Expand"}</ollama-tooltip>
            </ollama-button>
            <ollama-button class="copy-button" variant="icon" aria-label="Copy file">
              <ollama-icon name="copy" size="xs"></ollama-icon>
              <ollama-tooltip>Copy</ollama-tooltip>
            </ollama-button>
          </div>
        </div>
      </div>
      <div class="body">
        <pre class="content"><code></code></pre>
        ${
          loading
            ? `<div class="loading">
                 <ollama-spinner size="sm"></ollama-spinner>
                 <ollama-text>Generating...</ollama-text>
               </div>`
            : ""
        }
      </div>
      </div>
    `;

    this.applyHighlight(language, content);
    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-file-display")) {
  customElements.define("ollama-file-display", OllamaFileDisplay);
}

export { OllamaFileDisplay };
