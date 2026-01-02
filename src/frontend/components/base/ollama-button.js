import { BaseComponent } from './base-component.js';

/**
 * <ollama-button> - Button component with multiple variants
 *
 * Attributes:
 *   variant: primary | secondary | icon (default: primary)
 *   disabled: Boolean attribute
 *   size: sm | md | lg (default: md)
 *   aria-label: Accessible label (required for icon buttons)
 *
 * Events:
 *   click: Emitted when button is clicked (if not disabled)
 *
 * Example:
 *   <ollama-button variant="primary">Send</ollama-button>
 *   <ollama-button variant="icon" aria-label="Delete">
 *     <ollama-icon name="trash-2"></ollama-icon>
 *   </ollama-button>
 */
export class OllamaButton extends BaseComponent {
  static get observedAttributes() {
    return ['variant', 'disabled', 'size'];
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
    const button = this.shadowRoot.querySelector('button');
    button.addEventListener('click', (e) => {
      if (!this.getBooleanAttribute('disabled')) {
        this.emit('click', { originalEvent: e });
      }
    });
  }

  render() {
    const variant = this.getAttribute('variant') || 'primary';
    const size = this.getAttribute('size') || 'md';
    const disabled = this.getBooleanAttribute('disabled');
    const ariaLabel = this.getAttribute('aria-label');

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-block;
        }

        button {
          font-family: var(--font-family);
          font-size: var(--font-size-md);
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          border-radius: var(--radius-md);
          outline: none;
        }

        button:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Variant: Primary */
        button.primary {
          background: var(--color-accent-primary);
          color: white;
          padding: var(--spacing-sm) var(--spacing-md);
        }

        button.primary:hover:not(:disabled) {
          background: var(--color-accent-primary-hover);
        }

        /* Variant: Secondary */
        button.secondary {
          background: transparent;
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          padding: var(--spacing-sm) var(--spacing-md);
        }

        button.secondary:hover:not(:disabled) {
          background: var(--color-bg-secondary);
          border-color: var(--color-border-hover);
        }

        /* Variant: Icon */
        button.icon {
          background: transparent;
          color: var(--color-text-secondary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
        }

        button.icon:hover:not(:disabled) {
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
        }

        /* Size: Small */
        button.sm {
          font-size: var(--font-size-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
        }

        button.sm.icon {
          padding: var(--spacing-xs);
        }

        /* Size: Large */
        button.lg {
          font-size: var(--font-size-lg);
          padding: var(--spacing-md) var(--spacing-lg);
        }

        button.lg.icon {
          padding: var(--spacing-md);
        }

        ::slotted(*) {
          pointer-events: none;
        }
      </style>
      <button
        class="${variant} ${size}"
        ${disabled ? 'disabled' : ''}
        ${ariaLabel ? `aria-label="${ariaLabel}"` : ''}
      >
        <slot></slot>
      </button>
    `;

    // Re-setup event listeners after render
    this.setupEventListeners();
  }
}

customElements.define('ollama-button', OllamaButton);
