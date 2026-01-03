import { BaseComponent } from "./base-component.js";
import "./ollama-button.js";
import "./ollama-icon.js";
import "./ollama-tooltip.js";

class OllamaDialog extends BaseComponent {
  static get observedAttributes() {
    return ["open", "title", "aria-label", "aria-labelledby", "dismissible"];
  }

  constructor() {
    super();
    this.handleKeydown = (event) => this.onKeydown(event);
    this.render();
  }

  connectedCallback() {
    super.connectedCallback();
    this.attachEventListeners();
    if (this.isOpen) {
      this.focusFirst();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      this.attachEventListeners();
      if (this.isOpen) {
        this.focusFirst();
      }
    }
  }

  get isOpen() {
    return this.hasAttribute("open");
  }

  open() {
    this.setAttribute("open", "");
    this.emit("open");
  }

  close() {
    this.removeAttribute("open");
    this.emit("close");
  }

  onKeydown(event) {
    if (!this.isOpen) return;
    if (event.key === "Escape" && this.isDismissible) {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== "Tab") return;
    const focusables = this.getFocusableElements();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  getFocusableElements() {
    const container = this.shadowRoot?.querySelector(".dialog");
    if (!container) return [];
    return Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled"));
  }

  focusFirst() {
    const focusables = this.getFocusableElements();
    if (focusables.length) {
      focusables[0].focus();
    }
  }

  get isDismissible() {
    return this.hasAttribute("dismissible");
  }

  attachEventListeners() {
    const overlay = this.shadowRoot?.querySelector(".overlay");
    if (overlay) {
      overlay.onclick = () => {
        if (this.isDismissible) {
          this.close();
        }
      };
    }

    const closeButton = this.shadowRoot?.querySelector(".close-button");
    if (closeButton) {
      closeButton.onclick = () => this.close();
    }

    const dialog = this.shadowRoot?.querySelector(".dialog");
    if (dialog) {
      dialog.removeEventListener("keydown", this.handleKeydown);
      dialog.addEventListener("keydown", this.handleKeydown);
    }
  }

  render() {
    const title = this.getAttribute("title") || "";
    const ariaLabel = this.getAttribute("aria-label");
    const ariaLabelledBy = this.getAttribute("aria-labelledby");
    const computedLabelledBy = ariaLabelledBy || (title ? "dialog-title" : "");
    const open = this.isOpen;
    const dismissible = this.isDismissible;

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: ${open ? "block" : "none"};
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1000;
        }

        .dialog {
          position: fixed;
          inset: 50% auto auto 50%;
          transform: translate(-50%, -50%);
          width: min(540px, calc(100vw - 32px));
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 1001;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
        }

        .body {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm);
        }

        .close-button {
          width: 28px;
          height: 28px;
          border-radius: 14px;
        }
      </style>
      <div class="overlay" aria-hidden="true"></div>
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        ${ariaLabel ? `aria-label="${ariaLabel}"` : ""}
        ${computedLabelledBy ? `aria-labelledby="${computedLabelledBy}"` : ""}
      >
        <div class="header">
          <div>
            <slot name="header">
              ${title ? `<h2 id="dialog-title">${title}</h2>` : ""}
            </slot>
          </div>
          ${dismissible ? `
            <ollama-button class="close-button" variant="icon" aria-label="Close">
              <ollama-icon name="x"></ollama-icon>
              <ollama-tooltip>Close</ollama-tooltip>
            </ollama-button>
          ` : ""}
        </div>
        <div class="body">
          <slot></slot>
        </div>
        <div class="footer">
          <slot name="footer"></slot>
        </div>
      </section>
    `;
  }
}

if (!customElements.get("ollama-dialog")) {
  customElements.define("ollama-dialog", OllamaDialog);
}

export { OllamaDialog };
