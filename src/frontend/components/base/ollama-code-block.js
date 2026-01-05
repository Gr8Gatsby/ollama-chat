import { BaseComponent } from "./base-component.js";
import "./ollama-badge.js";
import "./ollama-button.js";
import "./ollama-icon.js";
import "./ollama-text.js";
import "./ollama-tooltip.js";
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
        import(`${PRISM_BASE_URL}/components/prism-bash.js`),
      ]);
      return window.Prism;
    })();
  }
  return prismLoadPromise;
}

class OllamaCodeBlock extends BaseComponent {
  static get observedAttributes() {
    return ["language", "code", "expanded"];
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

  getCode() {
    const attr = this.getAttribute("code");
    if (attr !== null) return attr;
    return (this.textContent || "").trim();
  }

  attachEventListeners() {
    const button = this.shadowRoot?.querySelector(".copy-button");
    if (!button) return;

    if (!this._copyHandler) {
      this._copyHandler = async () => {
        const code = this.getCode();
        try {
          await navigator.clipboard?.writeText(code);
          this.copySuccess = true;
          this.updateCopyButton();
          this.emit("copy", { code });

          setTimeout(() => {
            this.copySuccess = false;
            this.updateCopyButton();
          }, 2000);
        } catch {
          this.emit("copy", { code, failed: true });
        }
      };
    }

    button.addEventListener("click", this._copyHandler);

    const toggle = this.shadowRoot?.querySelector(".toggle-button");
    if (toggle) {
      toggle.addEventListener("click", () => {
        if (this.hasAttribute("expanded")) {
          this.removeAttribute("expanded");
        } else {
          this.setAttribute("expanded", "");
        }
      });
    }
  }

  updateCopyButton() {
    const copyButton = this.shadowRoot?.querySelector(".copy-button");
    if (!copyButton) return;

    const icon = copyButton.querySelector("ollama-icon");
    const tooltip = copyButton.querySelector("ollama-tooltip");

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

  async applyHighlight(languageKey, code) {
    const codeNode = this.shadowRoot?.querySelector("code");
    if (!codeNode) return;

    try {
      const Prism = await ensurePrismLoaded();
      if (Prism && Prism.languages?.[languageKey]) {
        codeNode.innerHTML = Prism.highlight(
          code,
          Prism.languages[languageKey],
          languageKey,
        );
        return;
      }
    } catch (error) {
      console.warn("[ollama-code-block] Prism failed to load", error);
    }

    codeNode.textContent = code;
  }

  render() {
    const language = this.getAttribute("language") || "text";
    const code = this.getCode();
    const languageKey = this.normalizeLanguage(language);
    const expanded = this.hasAttribute("expanded");
    const derivedLines = code ? code.split("\n").length : 0;
    const derivedSize = this.formatBytes(new TextEncoder().encode(code).length);

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          width: 100%;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-primary);
        }

        .meta {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .code {
          padding: var(--spacing-sm);
          font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: var(--font-size-sm);
          line-height: 1.5;
          white-space: pre;
          overflow-x: auto;
          color: var(--color-text-primary);
        }

        .copy-button {
          width: 24px;
          height: 24px;
          border-radius: 12px;
        }

        .toggle-button {
          width: 24px;
          height: 24px;
          border-radius: 12px;
        }

        :host(:not([expanded])) .code {
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
      <div class="header">
        <div class="meta">
          <ollama-text variant="caption" color="muted">${language}</ollama-text>
          <ollama-badge size="sm">${derivedSize}</ollama-badge>
          <ollama-badge size="sm">${derivedLines} lines</ollama-badge>
        </div>
        <div class="meta">
          <ollama-button class="toggle-button" variant="icon" aria-label="${
            expanded ? "Collapse code" : "Expand code"
          }">
            <ollama-icon name="${expanded ? "chevron-up" : "chevron-down"}" size="xs"></ollama-icon>
            <ollama-tooltip>${expanded ? "Collapse" : "Expand"}</ollama-tooltip>
          </ollama-button>
          <ollama-button class="copy-button" variant="icon" aria-label="Copy code">
            <ollama-icon name="copy" size="xs"></ollama-icon>
            <ollama-tooltip>Copy</ollama-tooltip>
          </ollama-button>
        </div>
      </div>
      <pre class="code"><code></code></pre>
    `;

    this.applyHighlight(languageKey, code);
    this.attachEventListeners();
  }

  normalizeLanguage(language) {
    const normalized = String(language).toLowerCase();
    const mapping = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      html: "markup",
      xml: "markup",
      css: "css",
      sh: "bash",
      shell: "bash",
      bash: "bash",
    };
    return mapping[normalized] || normalized;
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
}

if (!customElements.get("ollama-code-block")) {
  customElements.define("ollama-code-block", OllamaCodeBlock);
}

export { OllamaCodeBlock };
