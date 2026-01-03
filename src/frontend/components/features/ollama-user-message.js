import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-badge.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";
import "./ollama-message-actions.js";

class OllamaUserMessage extends BaseComponent {
  static get observedAttributes() {
    return ["content", "timestamp", "tokens", "model"];
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

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
        }

        .row {
          display: flex;
          justify-content: flex-end;
        }

        .bubble {
          max-width: min(70ch, 80%);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-sm) var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .meta {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          color: var(--color-text-secondary);
        }
      </style>
      <div class="row">
        <div class="bubble" part="bubble">
          <div class="content" part="content">
            <slot>
              <ollama-text>${content}</ollama-text>
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
            <slot name="actions">
              <ollama-message-actions size="sm"></ollama-message-actions>
            </slot>
          </div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get("ollama-user-message")) {
  customElements.define("ollama-user-message", OllamaUserMessage);
}

export { OllamaUserMessage };
