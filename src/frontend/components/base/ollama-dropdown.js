import { BaseComponent } from "./base-component.js";

class OllamaDropdown extends BaseComponent {
  static get observedAttributes() {
    return ["open", "position"];
  }

  constructor() {
    super();
    this.handleDocumentClick = (event) => this.onDocumentClick(event);
    this.render();
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.handleDocumentClick);
  }

  disconnectedCallback() {
    document.removeEventListener("click", this.handleDocumentClick);
    super.disconnectedCallback();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  toggle(open) {
    const next = typeof open === "boolean" ? open : !this.hasAttribute("open");
    if (next) {
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
  }

  onDocumentClick(event) {
    if (!this.hasAttribute("open")) return;
    if (this.contains(event.target)) return;
    this.toggle(false);
  }

  attachEventListeners() {
    const trigger = this.shadowRoot?.querySelector(".trigger");
    if (trigger) {
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        this.toggle();
      });
    }
  }

  render() {
    const open = this.hasAttribute("open");
    const position = this.getAttribute("position") || "bottom";
    const isTop = position === "top";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          position: relative;
          display: inline-block;
          width: 100%;
        }

        .panel {
          position: absolute;
          inset-block-start: ${isTop ? "auto" : "calc(100% + var(--spacing-xs))"};
          inset-block-end: ${isTop ? "calc(100% + var(--spacing-xs))" : "auto"};
          inset-inline-end: 0;
          inset-inline-start: 0;
          min-width: 220px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: var(--spacing-sm);
          font-family: var(--font-family-base);
          display: ${open ? "block" : "none"};
          z-index: 9999;
        }
      </style>
      <div class="trigger" part="trigger">
        <slot name="trigger"></slot>
      </div>
      <div class="panel" part="panel" role="menu">
        <slot></slot>
      </div>
    `;

    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-dropdown")) {
  customElements.define("ollama-dropdown", OllamaDropdown);
}

export { OllamaDropdown };
