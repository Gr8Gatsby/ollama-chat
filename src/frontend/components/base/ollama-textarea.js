import { BaseComponent } from './base-component.js';

/**
 * <ollama-textarea> - Multi-line text input
 *
 * Attributes:
 *   placeholder, value, disabled, required, error, rows (default: 3)
 *
 * Events: input, change
 */
export class OllamaTextarea extends BaseComponent {
  static get observedAttributes() {
    return ['placeholder', 'value', 'disabled', 'required', 'error', 'rows'];
  }

  constructor() {
    super();
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'value') {
        const textarea = this.shadowRoot.querySelector('textarea');
        if (textarea && textarea.value !== newValue) {
          textarea.value = newValue || '';
        }
      } else {
        this.render();
      }
    }
  }

  setupEventListeners() {
    const textarea = this.shadowRoot.querySelector('textarea');
    textarea.addEventListener('input', (e) => {
      this.setAttribute('value', e.target.value);
      this.emit('input', { value: e.target.value });
    });
    textarea.addEventListener('change', (e) => {
      this.emit('change', { value: e.target.value });
    });
  }

  render() {
    const placeholder = this.getAttribute('placeholder') || '';
    const value = this.getAttribute('value') || '';
    const disabled = this.getBooleanAttribute('disabled');
    const required = this.getBooleanAttribute('required');
    const error = this.getAttribute('error');
    const rows = this.getAttribute('rows') || '3';

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host { display: block; width: 100%; }

        textarea {
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
          resize: vertical;
          min-height: 60px;
        }

        textarea::placeholder { color: var(--color-text-tertiary); }
        textarea:hover:not(:disabled) { border-color: var(--color-border-hover); }
        textarea:focus {
          border-color: var(--color-border-focus);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        textarea:disabled {
          background: var(--color-bg-secondary);
          cursor: not-allowed;
          opacity: 0.6;
        }
        textarea.error { border-color: var(--color-error); }
        textarea.error:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }

        .error-message {
          color: var(--color-error);
          font-size: var(--font-size-xs);
          margin-top: var(--spacing-xs);
        }
      </style>
      <div>
        <textarea
          placeholder="${placeholder}"
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
          rows="${rows}"
          class="${error ? 'error' : ''}"
        >${value}</textarea>
        ${error ? `<div class="error-message">${error}</div>` : ''}
      </div>
    `;
    this.setupEventListeners();
  }

  get value() { return this.getAttribute('value') || ''; }
  set value(val) { this.setAttribute('value', val); }
}

customElements.define('ollama-textarea', OllamaTextarea);
