/**
 * Base class for all Ollama Chat components
 * Provides common functionality for Web Components
 */
export class BaseComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.__handleThemeChange = this.__handleThemeChange.bind(this);
    this.__handleLocaleChange = this.__handleLocaleChange.bind(this);

    this.syncThemeAttribute();
    this.syncLocaleAttributes();
  }

  connectedCallback() {
    this.syncThemeAttribute();
    this.syncLocaleAttributes();

    if (typeof window !== "undefined") {
      window.addEventListener("themechange", this.__handleThemeChange);
      window.addEventListener("localechange", this.__handleLocaleChange);
    }
  }

  disconnectedCallback() {
    if (typeof window !== "undefined") {
      window.removeEventListener("themechange", this.__handleThemeChange);
      window.removeEventListener("localechange", this.__handleLocaleChange);
    }
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
        --color-bg-secondary: #f3f4f6;
        --color-bg-tertiary: #e0e0e0;

        --color-text-primary: #1a1a1a;
        --color-text-secondary: #666666;
        --color-text-tertiary: #999999;

        --color-border: #e0e0e0;
        --color-border-hover: #cccccc;
        --color-border-focus: #1d4ed8;

        --color-accent-primary: #1d4ed8;
        --color-accent-primary-hover: #1a43c7;
        --color-accent-secondary: #0d9488;
        --color-on-accent: #ffffff;

        --color-success: #22c55e;
        --color-warning: #f59e0b;
        --color-error: #b91c1c;
        --color-info: #2563eb;

        --badge-success-bg: #15803d;
        --badge-on-success: #ffffff;
        --badge-warning-bg: #b45309;
        --badge-on-warning: #ffffff;
        --badge-error-bg: #b91c1c;
        --badge-on-error: #ffffff;
        --badge-info-bg: #1d4ed8;
        --badge-on-info: #ffffff;

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
        --color-border-focus: #60a5fa;
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
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles,
        composed: true,
      }),
    );
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
      this.setAttribute(name, "");
    } else {
      this.removeAttribute(name);
    }
  }

  /**
   * Ensure component inherits the active theme from <html data-theme="...">
   */
  syncThemeAttribute() {
    if (this.hasAttribute("data-theme")) return;
    const doc =
      typeof document !== "undefined" ? document.documentElement : null;
    const theme = doc?.getAttribute("data-theme") || "light";
    this.setAttribute("data-theme", theme);
  }

  /**
   * Ensure component inherits lang/dir from <html>
   */
  syncLocaleAttributes() {
    const doc =
      typeof document !== "undefined" ? document.documentElement : null;
    if (!this.hasAttribute("lang")) {
      const lang = doc?.getAttribute("lang") || "en";
      this.setAttribute("lang", lang);
    }
    if (!this.hasAttribute("dir")) {
      const dir = doc?.getAttribute("dir") || "ltr";
      this.setAttribute("dir", dir);
    }
  }

  /**
   * Apply lang/dir attributes to interactive descendants
   * @param {HTMLElement|null} element
   */
  applyLocalizationAttributes(element) {
    if (!element) return;
    const lang = this.getAttribute("lang") || "en";
    const dir = this.getAttribute("dir") || "ltr";
    element.setAttribute("lang", lang);
    element.setAttribute("dir", dir);
  }

  __handleThemeChange(event) {
    const theme = event?.detail?.theme;
    if (!theme) return;
    this.setAttribute("data-theme", theme);
    if (typeof this.render === "function") {
      this.render();
    }
  }

  __handleLocaleChange(event) {
    const { locale, dir } = event?.detail || {};
    if (locale) this.setAttribute("lang", locale);
    if (dir) this.setAttribute("dir", dir);
    if (typeof this.render === "function") {
      this.render();
    }
  }
}
