/**
 * Base class for all Ollama Chat components
 * Provides common functionality for Web Components
 */
export class BaseComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /**
   * Load theme CSS variables into component's shadow DOM
   * @returns {string} CSS custom properties
   */
  getThemeStyles() {
    return `
      :host {
        /* Spacing scale */
        --spacing-xs: 2px;
        --spacing-sm: 4px;
        --spacing-md: 8px;
        --spacing-lg: 12px;
        --spacing-xl: 16px;

        /* Colors - Light theme defaults */
        --color-bg-primary: #ffffff;
        --color-bg-secondary: #f5f5f5;
        --color-bg-tertiary: #e0e0e0;

        --color-text-primary: #1a1a1a;
        --color-text-secondary: #666666;
        --color-text-tertiary: #999999;

        --color-border: #e0e0e0;
        --color-border-hover: #cccccc;
        --color-border-focus: #3b82f6;

        --color-accent-primary: #3b82f6;
        --color-accent-primary-hover: #2563eb;
        --color-accent-secondary: #10b981;

        --color-success: #22c55e;
        --color-warning: #f59e0b;
        --color-error: #ef4444;
        --color-info: #3b82f6;

        /* Typography */
        --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        --font-size-xs: 0.75rem;
        --font-size-sm: 0.875rem;
        --font-size-md: 1rem;
        --font-size-lg: 1.125rem;
        --font-size-xl: 1.25rem;

        /* Border radius */
        --radius-sm: 4px;
        --radius-md: 6px;
        --radius-lg: 8px;
        --radius-full: 9999px;

        /* Shadows */
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

        /* Transitions */
        --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
        --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
        --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Dark theme overrides */
      :host([data-theme="dark"]) {
        --color-bg-primary: #1a1a1a;
        --color-bg-secondary: #262626;
        --color-bg-tertiary: #333333;

        --color-text-primary: #f5f5f5;
        --color-text-secondary: #a3a3a3;
        --color-text-tertiary: #737373;

        --color-border: #333333;
        --color-border-hover: #404040;
      }
    `;
  }

  /**
   * Common reset styles for shadow DOM
   * @returns {string} Reset CSS
   */
  getResetStyles() {
    return `
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
    `;
  }

  /**
   * Emit custom event from component
   * @param {string} eventName - Name of the event
   * @param {*} detail - Event detail data
   * @param {boolean} bubbles - Whether event bubbles (default: true)
   */
  emit(eventName, detail = null, bubbles = true) {
    this.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles,
      composed: true
    }));
  }

  /**
   * Get attribute as boolean
   * @param {string} name - Attribute name
   * @returns {boolean}
   */
  getBooleanAttribute(name) {
    return this.hasAttribute(name);
  }

  /**
   * Set attribute as boolean
   * @param {string} name - Attribute name
   * @param {boolean} value - Value
   */
  setBooleanAttribute(name, value) {
    if (value) {
      this.setAttribute(name, '');
    } else {
      this.removeAttribute(name);
    }
  }
}
