import { BaseComponent } from './base-component.js';

/**
 * <ollama-select> - Dropdown select component
 *
 * Attributes:
 *   value: Selected value
 *   disabled: Boolean attribute
 *   size: sm | md | lg (default: md)
 *
 * Usage: Add <option> elements as children
 * Example:
 *   <ollama-select value="opt1">
 *     <option value="opt1">Option 1</option>
 *     <option value="opt2">Option 2</option>
 *   </ollama-select>
 */
export class OllamaSelect extends BaseComponent {
  static get observedAttributes() {
    return ['value', 'disabled', 'size'];
  }

  constructor() {
    super();
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'value') {
        const select = this.shadowRoot.querySelector('select');
        if (select) select.value = newValue || '';
      } else {
        this.render();
      }
    }
  }

  setupEventListeners() {
    const select = this.shadowRoot.querySelector('select');
    select.addEventListener('change', (e) => {
      this.setAttribute('value', e.target.value);
      this.emit('change', { value: e.target.value });
    });
  }

  render() {
    const value = this.getAttribute('value') || '';
    const disabled = this.getBooleanAttribute('disabled');
    const size = this.getAttribute('size') || 'md';

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host { display: inline-block; }

        select {
          font-family: var(--font-family);
          font-size: var(--font-size-md);
          color: var(--color-text-primary);
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm) var(--spacing-md);
          padding-right: var(--spacing-xl);
          outline: none;
          cursor: pointer;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right var(--spacing-sm) center;
        }

        select:hover:not(:disabled) { border-color: var(--color-border-hover); }
        select:focus {
          border-color: var(--color-border-focus);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        select:disabled {
          background: var(--color-bg-secondary);
          cursor: not-allowed;
          opacity: 0.6;
        }

        select.sm {
          font-size: var(--font-size-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          padding-right: var(--spacing-lg);
        }

        select.lg {
          font-size: var(--font-size-lg);
          padding: var(--spacing-md) var(--spacing-lg);
          padding-right: calc(var(--spacing-xl) + var(--spacing-md));
        }
      </style>
      <select ${disabled ? 'disabled' : ''} class="${size}">
        <slot></slot>
      </select>
    `;
    this.setupEventListeners();

    // Set initial value
    const select = this.shadowRoot.querySelector('select');
    if (value) select.value = value;
  }

  get value() { return this.getAttribute('value') || ''; }
  set value(val) { this.setAttribute('value', val); }
}

customElements.define('ollama-select', OllamaSelect);
