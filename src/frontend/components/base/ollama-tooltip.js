import { BaseComponent } from "./base-component.js";

/**
 * <ollama-tooltip> - Accessible tooltip component
 *
 * Attributes:
 *   position: auto | top | top-right | bottom | bottom-left | bottom-right | left | right (default: auto)
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
    this.applyAutoPosition(tooltip);
    this.applyPositionStyles(tooltip);
    tooltip.classList.add("visible");
  }

  hide() {
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    tooltip.classList.remove("visible");
  }

  applyAutoPosition(tooltip) {
    const explicitPosition = this.getAttribute("position");
    if (explicitPosition && explicitPosition !== "auto") {
      this.removeAttribute("data-position");
      return;
    }

    const parent = this.parentElement;
    if (!parent || !tooltip) return;

    const rect = parent.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    const horizontal =
      rect.left < viewportWidth * 0.3
        ? "right"
        : rect.right > viewportWidth * 0.7
          ? "left"
          : "center";
    const vertical = rect.top < viewportHeight * 0.3 ? "bottom" : "top";

    let computed = "top";
    if (vertical === "bottom" && horizontal === "right") {
      computed = "bottom-right";
    } else if (vertical === "bottom" && horizontal === "left") {
      computed = "bottom-left";
    } else if (vertical === "bottom") {
      computed = "bottom";
    } else if (vertical === "top" && horizontal === "right") {
      computed = "top-right";
    } else if (vertical === "top" && horizontal === "left") {
      computed = "left";
    }

    this.setAttribute("data-position", computed);
  }

  applyPositionStyles(tooltip) {
    const parent = this.parentElement;
    if (!parent || !tooltip) return;

    const position =
      this.getAttribute("position") ||
      this.getAttribute("data-position") ||
      "top";
    const rect = parent.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth || 0;
    const tooltipHeight = tooltip.offsetHeight || 0;
    const spacing = 8;
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.top - tooltipHeight - spacing;

    if (position === "top-right") {
      left = rect.left + rect.width / 2;
      top = rect.top - tooltipHeight - spacing;
    } else if (position === "bottom") {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.bottom + spacing;
    } else if (position === "bottom-left") {
      left = rect.left + rect.width / 2 - tooltipWidth;
      top = rect.bottom + spacing;
    } else if (position === "bottom-right") {
      left = rect.left + rect.width / 2;
      top = rect.bottom + spacing;
    } else if (position === "left") {
      left = rect.left - tooltipWidth - spacing;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (position === "right") {
      left = rect.right + spacing;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    }

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    left = clamp(left, spacing, viewportWidth - tooltipWidth - spacing);
    top = clamp(top, spacing, viewportHeight - tooltipHeight - spacing);

    this.style.left = `${left}px`;
    this.style.top = `${top}px`;
    this.style.right = "auto";
    this.style.bottom = "auto";
    this.style.transform = "none";
  }

  render() {
    const position = this.getAttribute("position") || "auto";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          position: fixed;
          z-index: 2147483647;
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
          transform: translateY(-2px);
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
