import { BaseComponent } from "./base-component.js";

class OllamaActionBar extends BaseComponent {
  static get observedAttributes() {
    return ["variant"];
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
    const variant = this.getAttribute("variant") || "pill";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-flex;
        }

        .bar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
        }

        .bar.pill {
          padding: var(--spacing-xs);
          border-radius: var(--radius-full);
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
        }
      </style>
      <div class="bar ${variant}">
        <slot></slot>
      </div>
    `;
  }
}

if (!customElements.get("ollama-action-bar")) {
  customElements.define("ollama-action-bar", OllamaActionBar);
}

export { OllamaActionBar };
