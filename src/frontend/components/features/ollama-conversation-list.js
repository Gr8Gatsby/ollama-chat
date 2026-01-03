import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-text.js";

class OllamaConversationList extends BaseComponent {
  static get observedAttributes() {
    return ["empty-title", "empty-description", "aria-label"];
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

  attachEventListeners() {
    const slot = this.shadowRoot?.querySelector("slot");
    if (slot) {
      slot.addEventListener("slotchange", () => this.updateEmptyState());
    }

    this.addEventListener("conversation-selected", (event) => {
      const id = event.detail?.id;
      if (!id) return;
      this.setSelectedItem(id);
    });
  }

  updateEmptyState() {
    const items = this.querySelectorAll("ollama-conversation-item");
    const emptyState = this.shadowRoot?.querySelector(".empty-state");
    if (emptyState) {
      emptyState.hidden = items.length > 0;
    }
  }

  setSelectedItem(selectedId) {
    const items = Array.from(
      this.querySelectorAll("ollama-conversation-item"),
    );
    items.forEach((item) => {
      const itemId = item.getAttribute("conversation-id") || "";
      if (itemId === selectedId) {
        item.setAttribute("selected", "");
      } else {
        item.removeAttribute("selected");
      }
    });
  }

  render() {
    const emptyTitle = this.getAttribute("empty-title") || "No conversations";
    const emptyDescription =
      this.getAttribute("empty-description") ||
      "Start a new chat to see it listed here.";
    const ariaLabel = this.getAttribute("aria-label") || "Conversations";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          width: 100%;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .empty-state {
          padding: var(--spacing-md);
          text-align: center;
          color: var(--color-text-secondary);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-md);
        }
      </style>
      <div class="list" role="list" aria-label="${ariaLabel}">
        <slot></slot>
      </div>
      <div class="empty-state" part="empty-state">
        <ollama-text variant="label">${emptyTitle}</ollama-text>
        <ollama-text variant="caption" color="muted">${emptyDescription}</ollama-text>
      </div>
    `;
  }
}

if (!customElements.get("ollama-conversation-list")) {
  customElements.define("ollama-conversation-list", OllamaConversationList);
}

export { OllamaConversationList };
