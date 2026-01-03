import { BaseComponent } from "./base-component.js";

/**
 * <ollama-tooltip> - Accessible tooltip component
 *
 * Attributes:
 *   position: top | bottom | left | right (default: top)
 *
 * Usage: Place inside element that needs tooltip
 * Example:
 *   <ollama-button variant="icon" aria-label="Delete">
 *     <ollama-icon name="trash-2"></ollama-icon>
 *     <ollama-tooltip>Delete message</ollama-tooltip>
 *   </ollama-button>
 */
export class OllamaTooltip extends BaseComponent {
  static get observedAttributes() {
    return ["position"];
  }

  constructor() {
    super();
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  setupEventListeners() {
    const parent = this.parentElement;
    if (!parent) return;

    parent.addEventListener("mouseenter", () => this.show());
    parent.addEventListener("mouseleave", () => this.hide());
    parent.addEventListener("focus", () => this.show());
    parent.addEventListener("blur", () => this.hide());
  }

  show() {
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    tooltip.classList.add("visible");
  }

  hide() {
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    tooltip.classList.remove("visible");
  }

  render() {
    const position = this.getAttribute("position") || "top";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          position: absolute;
          z-index: 9999;
          pointer-events: none;
        }

        .tooltip {
          background: var(--color-text-primary);
          color: var(--color-bg-primary);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-family: var(--font-family);
          white-space: nowrap;
          opacity: 0;
          transform: translateY(0);
          transition: opacity var(--transition-fast), transform var(--transition-fast);
          box-shadow: var(--shadow-md);
        }

        .tooltip.visible {
          opacity: 1;
        }

        /* Position: Top */
        :host([position="top"]) {
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: var(--spacing-sm);
        }

        :host([position="top"]) .tooltip.visible {
          transform: translateY(-4px);
        }

        /* Position: Bottom */
        :host([position="bottom"]) {
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: var(--spacing-sm);
        }

        :host([position="bottom"]) .tooltip.visible {
          transform: translateY(4px);
        }

        /* Position: Left */
        :host([position="left"]) {
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: var(--spacing-sm);
        }

        :host([position="left"]) .tooltip.visible {
          transform: translateX(-4px) translateY(-50%);
        }

        /* Position: Right */
        :host([position="right"]) {
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: var(--spacing-sm);
        }

        :host([position="right"]) .tooltip.visible {
          transform: translateX(4px) translateY(-50%);
        }
      </style>
      <div class="tooltip" role="tooltip">
        <slot></slot>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    // Ensure parent has position: relative
    if (this.parentElement) {
      const parentPosition = window.getComputedStyle(
        this.parentElement,
      ).position;
      if (parentPosition === "static") {
        this.parentElement.style.position = "relative";
      }
    }
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    this.applyLocalizationAttributes(tooltip);
  }
}

customElements.define("ollama-tooltip", OllamaTooltip);
