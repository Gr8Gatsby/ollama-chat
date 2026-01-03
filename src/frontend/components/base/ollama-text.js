import { BaseComponent } from "./base-component.js";

/**
 * <ollama-text> - Typography wrapper for consistent labels/body text
 *
 * Attributes:
 *   variant: body | label | caption | title (default: body)
 *   size: sm | md | lg (optional)
 *   weight: regular | medium | semibold | bold (optional)
 *   color: primary | secondary | muted (optional)
 */
export class OllamaText extends BaseComponent {
  static get observedAttributes() {
    return ["variant", "size", "weight", "color"];
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
    const variant = this.getAttribute("variant") || "body";
    const size = this.getAttribute("size") || "";
    const weight = this.getAttribute("weight") || "";
    const color = this.getAttribute("color") || "";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-block;
          font-family: var(--font-family);
          color: var(--color-text-primary);
        }

        .text {
          font-size: var(--font-size-md);
          font-weight: 400;
          line-height: 1.4;
        }

        .text.label {
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--color-text-secondary);
          letter-spacing: 0.01em;
        }

        .text.caption {
          font-size: var(--font-size-xs);
          font-weight: 500;
          color: var(--color-text-tertiary);
        }

        .text.title {
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .text.size-sm { font-size: var(--font-size-sm); }
        .text.size-md { font-size: var(--font-size-md); }
        .text.size-lg { font-size: var(--font-size-lg); }

        .text.weight-regular { font-weight: 400; }
        .text.weight-medium { font-weight: 500; }
        .text.weight-semibold { font-weight: 600; }
        .text.weight-bold { font-weight: 700; }

        .text.color-primary { color: var(--color-text-primary); }
        .text.color-secondary { color: var(--color-text-secondary); }
        .text.color-muted { color: var(--color-text-tertiary); }
      </style>
      <span class="text ${variant} ${size ? `size-${size}` : ""} ${
        weight ? `weight-${weight}` : ""
      } ${color ? `color-${color}` : ""}">
        <slot></slot>
      </span>
    `;
  }
}

customElements.define("ollama-text", OllamaText);
