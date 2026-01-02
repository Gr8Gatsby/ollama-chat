import { BaseComponent } from './base-component.js';

/**
 * <ollama-input> - Text input component
 *
 * Attributes:
 *   type: text | email | password | search | url (default: text)
 *   placeholder: Placeholder text
 *   value: Input value
 *   disabled: Boolean attribute
 *   required: Boolean attribute
 *   error: Error message to display
 *   size: sm | md | lg (default: md)
 *
 * Events:
 *   input: Emitted on value change
 *   change: Emitted when input loses focus
 *
 * Example:
 *   <ollama-input placeholder="Enter text..." value=""></ollama-input>
 */
export class OllamaInput extends BaseComponent {
  static get observedAttributes() {
    return ['type', 'placeholder', 'value', 'disabled', 'required', 'error', 'size'];
  }

  constructor() {
    super();
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'value') {
        const input = this.shadowRoot.querySelector('input');
        if (input && input.value !== newValue) {
          input.value = newValue || '';
        }
      } else {
        this.render();
      }
    }
  }

  setupEventListeners() {
    const input = this.shadowRoot.querySelector('input');

    input.addEventListener('input', (e) => {
      this.setAttribute('value', e.target.value);
      this.emit('input', { value: e.target.value });
    });

    input.addEventListener('change', (e) => {
      this.emit('change', { value: e.target.value });
    });
  }

  render() {
    const type = this.getAttribute('type') || 'text';
    const placeholder = this.getAttribute('placeholder') || '';
    const value = this.getAttribute('value') || '';
    const disabled = this.getBooleanAttribute('disabled');
    const required = this.getBooleanAttribute('required');
    const error = this.getAttribute('error');
    const size = this.getAttribute('size') || 'md';

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-block;
          width: 100%;
        }

        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        input {
          font-family: var(--font-family);
          font-size: var(--font-size-md);
          color: var(--color-text-primary);
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm) var(--spacing-md);
          outline: none;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          width: 100%;
        }

        input::placeholder {
          color: var(--color-text-tertiary);
        }

        input:hover:not(:disabled) {
          border-color: var(--color-border-hover);
        }

        input:focus {
          border-color: var(--color-border-focus);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        input:disabled {
          background: var(--color-bg-secondary);
          cursor: not-allowed;
          opacity: 0.6;
        }

        input.error {
          border-color: var(--color-error);
        }

        input.error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        /* Size: Small */
        input.sm {
          font-size: var(--font-size-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
        }

        /* Size: Large */
        input.lg {
          font-size: var(--font-size-lg);
          padding: var(--spacing-md) var(--spacing-lg);
        }

        .error-message {
          color: var(--color-error);
          font-size: var(--font-size-xs);
          margin-top: var(--spacing-xs);
        }
      </style>
      <div class="input-wrapper">
        <input
          type="${type}"
          placeholder="${placeholder}"
          value="${value}"
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
          class="${error ? 'error' : ''} ${size}"
        />
        ${error ? `<div class="error-message">${error}</div>` : ''}
      </div>
    `;

    this.setupEventListeners();
  }

  // Public API
  get value() {
    return this.getAttribute('value') || '';
  }

  set value(val) {
    this.setAttribute('value', val);
  }

  focus() {
    this.shadowRoot.querySelector('input').focus();
  }

  blur() {
    this.shadowRoot.querySelector('input').blur();
  }
}

customElements.define('ollama-input', OllamaInput);
