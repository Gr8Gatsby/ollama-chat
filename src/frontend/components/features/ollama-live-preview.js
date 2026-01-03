import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";

class OllamaLivePreview extends BaseComponent {
  static get observedAttributes() {
    return ["srcdoc", "title", "error"];
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
    const reloadButton = this.shadowRoot?.querySelector(".reload-button");
    if (reloadButton) {
      reloadButton.addEventListener("click", () => {
        this.reload();
      });
    }
  }

  reload() {
    const iframe = this.shadowRoot?.querySelector("iframe");
    if (!iframe) return;
    const srcdoc = this.getAttribute("srcdoc") || "";
    iframe.srcdoc = srcdoc;
    this.emit("preview-reload");
  }

  render() {
    const title = this.getAttribute("title") || "Live preview";
    const srcdoc = this.getAttribute("srcdoc") || "";
    const error = this.getAttribute("error") || "";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          height: 100%;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-bg-primary);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-bottom: 1px solid var(--color-border);
        }

        .frame {
          position: relative;
          height: calc(100% - 40px);
        }

        iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: white;
        }

        .error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          background: rgba(255, 255, 255, 0.9);
          text-align: center;
          padding: var(--spacing-lg);
        }

        .reload-button {
          width: 28px;
          height: 28px;
          border-radius: 14px;
        }
      </style>
      <div class="header">
        <ollama-text variant="label">${title}</ollama-text>
        <ollama-button class="reload-button" variant="icon" aria-label="Reload preview">
          <ollama-icon name="refresh-cw" size="xs"></ollama-icon>
          <ollama-tooltip>Reload</ollama-tooltip>
        </ollama-button>
      </div>
      <div class="frame">
        <iframe
          title="${this.escapeAttribute(title)}"
          sandbox="allow-scripts allow-same-origin"
          srcdoc="${this.escapeAttribute(srcdoc)}"
        ></iframe>
        ${
          error
            ? `<div class="error" role="alert">
                 <ollama-text variant="label">Preview error</ollama-text>
                 <ollama-text variant="caption" color="muted">${error}</ollama-text>
               </div>`
            : ""
        }
      </div>
    `;

    this.attachEventListeners();
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }
}

if (!customElements.get("ollama-live-preview")) {
  customElements.define("ollama-live-preview", OllamaLivePreview);
}

export { OllamaLivePreview };
