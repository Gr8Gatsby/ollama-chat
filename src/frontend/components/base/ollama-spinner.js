import { BaseComponent } from './base-component.js';

/**
 * <ollama-spinner> - Loading spinner component
 *
 * Attributes:
 *   size: xs | sm | md | lg | xl (default: md)
 *
 * Example:
 *   <ollama-spinner size="md"></ollama-spinner>
 */
export class OllamaSpinner extends BaseComponent {
  static get observedAttributes() {
    return ['size'];
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

  getSizeValue() {
    const sizeMap = {
      'xs': '12',
      'sm': '16',
      'md': '20',
      'lg': '32',
      'xl': '48'
    };
    const size = this.getAttribute('size') || 'md';
    return sizeMap[size] || sizeMap.md;
  }

  render() {
    const size = this.getSizeValue();

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: ${size}px;
          height: ${size}px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
      <div class="spinner" role="status" aria-label="Loading"></div>
    `;
  }
}

customElements.define('ollama-spinner', OllamaSpinner);
