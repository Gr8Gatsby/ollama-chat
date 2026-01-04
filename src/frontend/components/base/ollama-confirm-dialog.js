import { BaseComponent } from "./base-component.js";
import "./ollama-dialog.js";
import "./ollama-button.js";

class OllamaConfirmDialog extends BaseComponent {
  static get observedAttributes() {
    return ["open", "title", "message", "confirm-label", "cancel-label"];
  }

  constructor() {
    super();
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      this.attachEventListeners();
    }
  }

  get isOpen() {
    return this.hasAttribute("open");
  }

  open() {
    this.setAttribute("open", "");
  }

  close() {
    this.removeAttribute("open");
  }

  attachEventListeners() {
    const cancelButton = this.shadowRoot?.querySelector("[data-cancel]");
    const confirmButton = this.shadowRoot?.querySelector("[data-confirm]");
    const dialog = this.shadowRoot?.querySelector("ollama-dialog");

    cancelButton?.addEventListener("click", () => {
      this.close();
      this.emit("cancel");
    });

    confirmButton?.addEventListener("click", () => {
      this.close();
      this.emit("confirm");
    });

    dialog?.addEventListener("close", () => {
      if (!this.isOpen) {
        this.emit("cancel");
      }
    });
  }

  render() {
    const title = this.getAttribute("title") || "Confirm";
    const message = this.getAttribute("message") || "";
    const confirmLabel = this.getAttribute("confirm-label") || "Confirm";
    const cancelLabel = this.getAttribute("cancel-label") || "Cancel";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: ${this.isOpen ? "block" : "none"};
        }

        .message {
          font-family: var(--font-family);
          color: var(--color-text-primary);
          line-height: 1.4;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm);
        }
      </style>
      <ollama-dialog
        ${this.isOpen ? "open" : ""}
        title="${this.escapeAttribute(title)}"
        dismissible
      >
        <div class="message">${this.escapeHtml(message)}</div>
        <div slot="footer" class="actions">
          <ollama-button variant="danger" data-confirm>${confirmLabel}</ollama-button>
          <ollama-button variant="primary" data-cancel>${cancelLabel}</ollama-button>
        </div>
      </ollama-dialog>
    `;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }
}

if (!customElements.get("ollama-confirm-dialog")) {
  customElements.define("ollama-confirm-dialog", OllamaConfirmDialog);
}

export { OllamaConfirmDialog };
