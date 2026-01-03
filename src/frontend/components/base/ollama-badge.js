import { BaseComponent } from "./base-component.js";

/**
 * <ollama-badge> - Badge component for labels and status indicators
 *
 * Attributes:
 *   variant: default | success | warning | error | info (default: default)
 *   size: sm | md | lg (default: md)
 *
 * Example:
 *   <ollama-badge variant="success">Active</ollama-badge>
 */
export class OllamaBadge extends BaseComponent {
  static get observedAttributes() {
    return ["variant", "size"];
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
    const variant = this.getAttribute("variant") || "default";
    const size = this.getAttribute("size") || "md";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-flex;
          align-items: center;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-family);
          font-weight: 500;
          border-radius: var(--radius-full);
          padding: calc(var(--spacing-xs) + 1px) calc(var(--spacing-sm) + 1px);
          font-size: var(--font-size-xs);
          line-height: 1;
        }

        .badge.default {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
        }

        .badge.success {
          background: var(--badge-success-bg, #15803d);
          color: var(--badge-on-success, #fff);
        }

        .badge.warning {
          background: var(--badge-warning-bg, #b45309);
          color: var(--badge-on-warning, #fff);
        }

        .badge.error {
          background: var(--badge-error-bg, #b91c1c);
          color: var(--badge-on-error, #fff);
        }

        .badge.info {
          background: var(--badge-info-bg, #1d4ed8);
          color: var(--badge-on-info, #fff);
        }

        .badge.sm {
          font-size: 0.625rem;
          padding: calc(1px + 1px) calc(var(--spacing-xs) + 1px);
        }

        .badge.lg {
          font-size: var(--font-size-sm);
          padding: calc(var(--spacing-sm) + 1px) calc(var(--spacing-md) + 1px);
        }
      </style>
      <span class="badge ${variant} ${size}">
        <slot></slot>
      </span>
    `;
  }
}

customElements.define("ollama-badge", OllamaBadge);
