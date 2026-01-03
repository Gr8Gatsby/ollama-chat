import { BaseComponent } from "../base/base-component.js";
import "./ollama-chat-message.js";

class OllamaMessageList extends BaseComponent {
  static get observedAttributes() {
    return ["auto-scroll", "empty-text"];
  }

  constructor() {
    super();
    this.render();
  }

  connectedCallback() {
    super.connectedCallback();
    this.attachEventListeners();
    this.updateEmptyState();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get autoScroll() {
    return this.hasAttribute("auto-scroll");
  }

  attachEventListeners() {
    const slot = this.shadowRoot?.querySelector("slot");
    if (!slot) return;
    slot.addEventListener("slotchange", () => {
      this.updateEmptyState();
      if (this.autoScroll) {
        this.scrollToBottom();
      }
    });
  }

  updateEmptyState() {
    const hasMessages = this.querySelector(
      "ollama-chat-message, ollama-user-message, ollama-ai-response",
    );
    const empty = this.shadowRoot?.querySelector(".empty-state");
    if (empty) {
      empty.hidden = Boolean(hasMessages);
    }
  }

  scrollToBottom() {
    const container = this.shadowRoot?.querySelector(".list");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  render() {
    const emptyText =
      this.getAttribute("empty-text") ||
      "Start a conversation to see messages.";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          height: 100%;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          height: 100%;
          overflow-y: auto;
        }

        .empty-state {
          color: var(--color-text-secondary);
          text-align: center;
          padding: var(--spacing-lg);
        }
      </style>
      <div class="list" part="list">
        <slot></slot>
        <div class="empty-state" part="empty-state">${emptyText}</div>
      </div>
    `;
  }
}

if (!customElements.get("ollama-message-list")) {
  customElements.define("ollama-message-list", OllamaMessageList);
}

export { OllamaMessageList };
