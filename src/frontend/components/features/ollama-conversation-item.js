import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-badge.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";

class OllamaConversationItem extends BaseComponent {
  static get observedAttributes() {
    return [
      "conversation-id",
      "title",
      "conversation-title",
      "preview",
      "model",
      "timestamp",
      "unread-count",
      "selected",
    ];
  }

  constructor() {
    super();
    this.suppressTitleRemove = false;
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === "title" && newValue && !this.suppressTitleRemove) {
        this._title = newValue;
        this.suppressTitleRemove = true;
        this.removeAttribute("title");
        this.suppressTitleRemove = false;
      }
      this.render();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.attachEventListeners();
  }

  attachEventListeners() {
    const mainButton = this.shadowRoot?.querySelector(".item-main");
    if (mainButton) {
      mainButton.addEventListener("click", () => this.emitSelection());
      mainButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.emitSelection();
        }
      });
    }

    const actionButton = this.shadowRoot?.querySelector(".action-button");
    if (actionButton) {
      actionButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.emitAction("menu");
      });
    }
  }

  emitSelection() {
    const id = this.getAttribute("conversation-id") || "";
    this.emit("conversation-selected", { id });
  }

  emitAction(action) {
    const id = this.getAttribute("conversation-id") || "";
    this.emit("conversation-action", { id, action });
  }

  render() {
    const title =
      this.getAttribute("conversation-title") || this._title || "Untitled chat";
    const preview = this.getAttribute("preview") || "";
    const model = this.getAttribute("model");
    const timestamp = this.getAttribute("timestamp");
    const unread = Number(this.getAttribute("unread-count") || 0);
    const selected = this.hasAttribute("selected");

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
        }

        .item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--spacing-sm);
          align-items: center;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          background: ${selected ? "var(--color-bg-secondary)" : "transparent"};
        }

        .item-main {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          align-items: flex-start;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          width: 100%;
        }

        .title-row {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .title-text {
          position: relative;
        }

        .meta-row {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          color: var(--color-text-secondary);
        }

        .action-slot {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .action-button {
          width: 28px;
          height: 28px;
          border-radius: 14px;
        }

        :host(:focus-within) .item {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }
      </style>
      <div class="item" part="item" role="listitem">
        <button
          class="item-main"
          type="button"
          aria-pressed="${selected ? "true" : "false"}"
        >
          <div class="title-row">
            <span class="title-text">
              <ollama-text variant="label">${title}</ollama-text>
              <ollama-tooltip position="bottom-right">${title}</ollama-tooltip>
            </span>
            ${unread > 0 ? `<ollama-badge size="sm">${unread}</ollama-badge>` : ""}
          </div>
          <div class="meta-row">
            ${preview ? `<ollama-text variant="caption" color="muted">${preview}</ollama-text>` : ""}
            ${
              model
                ? `<ollama-badge variant="default" size="sm">${model}</ollama-badge>`
                : ""
            }
            ${
              timestamp
                ? `<ollama-text variant="caption" color="muted">${timestamp}</ollama-text>`
                : ""
            }
          </div>
        </button>
        <div class="action-slot" part="actions">
          <slot name="actions">
            <ollama-button
              class="action-button"
              variant="icon"
              aria-label="More actions"
            >
              <ollama-icon name="more-vertical"></ollama-icon>
              <ollama-tooltip>More actions</ollama-tooltip>
            </ollama-button>
          </slot>
        </div>
      </div>
    `;
  }
}

if (!customElements.get("ollama-conversation-item")) {
  customElements.define("ollama-conversation-item", OllamaConversationItem);
}

export { OllamaConversationItem };
