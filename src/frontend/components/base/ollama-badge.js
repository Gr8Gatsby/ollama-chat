import { BaseComponent } from './base-component.js';

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
    return ['variant', 'size'];
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
    const variant = this.getAttribute('variant') || 'default';
    const size = this.getAttribute('size') || 'md';

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
          padding: var(--spacing-xs) var(--spacing-sm);
          font-size: var(--font-size-xs);
          line-height: 1;
        }

        .badge.default {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
        }

        .badge.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--color-success);
        }

        .badge.warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--color-warning);
        }

        .badge.error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error);
        }

        .badge.info {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-info);
        }

        .badge.sm {
          font-size: 0.625rem;
          padding: 1px var(--spacing-xs);
        }

        .badge.lg {
          font-size: var(--font-size-sm);
          padding: var(--spacing-sm) var(--spacing-md);
        }
      </style>
      <span class="badge ${variant} ${size}">
        <slot></slot>
      </span>
    `;
  }
}

customElements.define('ollama-badge', OllamaBadge);
