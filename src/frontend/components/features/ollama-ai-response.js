import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-badge.js";
import "../base/ollama-spinner.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";
import "./ollama-message-actions.js";
import "./ollama-markdown-renderer.js";

class OllamaAiResponse extends BaseComponent {
  static get observedAttributes() {
    return ["content", "timestamp", "tokens", "model", "streaming"];
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

  render() {
    const content = this.getAttribute("content") || "";
    const timestamp = this.getAttribute("timestamp") || "";
    const tokens = this.getAttribute("tokens") || "";
    const model = this.getAttribute("model") || "";
    const streaming = this.hasAttribute("streaming");

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          width: 100%;
        }

        .response {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
        }

        .meta {
          display: inline-flex;
          align-items: baseline;
          gap: var(--spacing-xs);
          color: var(--color-text-secondary);
        }

        .meta > * {
          align-self: baseline;
        }

        .token-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xxs, 2px);
        }

        .meta ::slotted(ollama-message-actions) {
          align-self: baseline;
          position: relative;
          top: 4px;
        }

        .streaming {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
        }
      </style>
      <div class="response" part="response">
        <div class="content" part="content">
          <slot>
            <ollama-markdown-renderer content="${this.escapeAttribute(
              content,
            )}"></ollama-markdown-renderer>
          </slot>
        </div>
        <div class="meta" part="meta">
          ${model ? `<ollama-badge size="sm">${model}</ollama-badge>` : ""}
          ${timestamp ? `<ollama-text variant="caption" color="muted">${timestamp}</ollama-text>` : ""}
          ${
            tokens
              ? `<span class="token-badge">
                   <ollama-badge size="sm" variant="default">${tokens}</ollama-badge>
                   <ollama-tooltip position="top-right">Tokens used</ollama-tooltip>
                 </span>`
              : ""
          }
          ${
            streaming
              ? `<span class="streaming">
                   <ollama-spinner size="sm"></ollama-spinner>
                   <ollama-text variant="caption" color="muted">Generating</ollama-text>
                 </span>`
              : ""
          }
          <slot name="actions">
            <ollama-message-actions size="sm"></ollama-message-actions>
          </slot>
        </div>
      </div>
    `;
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }
}

if (!customElements.get("ollama-ai-response")) {
  customElements.define("ollama-ai-response", OllamaAiResponse);
}

export { OllamaAiResponse };
