import { BaseComponent } from "./base-component.js";
import "./ollama-icon.js";
import "./ollama-tooltip.js";

class OllamaToggleSwitch extends BaseComponent {
  static get observedAttributes() {
    return ["value", "left-label", "right-label"];
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

  get value() {
    return this.getAttribute("value") || "left";
  }

  set value(next) {
    this.setAttribute("value", next);
  }

  attachEventListeners() {
    const buttons = this.shadowRoot?.querySelectorAll("button[data-value]");
    buttons?.forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.getAttribute("data-value");
        if (!next || next === this.value) return;
        this.value = next;
        this.emit("change", { value: next });
      });
    });
  }

  render() {
    const value = this.value;
    const leftLabel = this.getAttribute("left-label") || "Chat";
    const rightLabel = this.getAttribute("right-label") || "Project";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-flex;
        }

        .toggle {
          display: inline-flex;
          align-items: center;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 999px;
          padding: 2px;
          gap: 2px;
          height: 32px;
        }

        button {
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          padding: 6px 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xxs, 2px);
          cursor: pointer;
          height: 28px;
        }

        button.active {
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          box-shadow: var(--shadow-sm);
        }

        button:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }
      </style>
      <div class="toggle" role="tablist">
        <button
          class="${value === "left" ? "active" : ""}"
          data-value="left"
          role="tab"
          aria-selected="${value === "left"}"
        >
          <ollama-icon name="messages-square" size="sm"></ollama-icon>
          <ollama-tooltip>${leftLabel}</ollama-tooltip>
        </button>
        <button
          class="${value === "right" ? "active" : ""}"
          data-value="right"
          role="tab"
          aria-selected="${value === "right"}"
        >
          <ollama-icon name="folder" size="sm"></ollama-icon>
          <ollama-tooltip>${rightLabel}</ollama-tooltip>
        </button>
      </div>
    `;

    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-toggle-switch")) {
  customElements.define("ollama-toggle-switch", OllamaToggleSwitch);
}

export { OllamaToggleSwitch };
