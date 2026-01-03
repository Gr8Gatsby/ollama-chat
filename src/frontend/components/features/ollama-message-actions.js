import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-tooltip.js";

class OllamaMessageActions extends BaseComponent {
  static get observedAttributes() {
    return ["disabled", "busy", "actions", "size"];
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

  get actions() {
    const raw = this.getAttribute("actions");
    if (!raw) {
      return [
        { id: "copy", icon: "copy", label: "Copy" },
        { id: "regenerate", icon: "refresh-cw", label: "Regenerate" },
        { id: "delete", icon: "trash-2", label: "Delete" },
      ];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : [];
    } catch (error) {
      console.warn("<ollama-message-actions> invalid actions", error);
      return [];
    }
  }

  attachEventListeners() {
    const buttons = this.shadowRoot?.querySelectorAll("[data-action]");
    if (!buttons) return;
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        if (this.isDisabled) return;
        const action = button.getAttribute("data-action");
        if (!action) return;
        this.emit(`${action}-message`, { action });
        this.emit("action", { action });
      });
    });
  }

  get isDisabled() {
    return this.hasAttribute("disabled") || this.hasAttribute("busy");
  }

  render() {
    const disabled = this.isDisabled;
    const actions = this.actions;
    const size = this.getAttribute("size") || "sm";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .action-button {
          width: 24px;
          height: 24px;
          border-radius: 12px;
        }

        :host([size="md"]) .action-button {
          width: 28px;
          height: 28px;
          border-radius: 14px;
        }

        :host([size="lg"]) .action-button {
          width: 32px;
          height: 32px;
          border-radius: 16px;
        }
      </style>
      ${actions
        .map(
          (action) => `
          <ollama-button
            class="action-button"
            variant="icon"
            size="${size}"
            aria-label="${action.label}"
            data-action="${action.id}"
            ${disabled ? "disabled" : ""}
          >
            <ollama-icon name="${action.icon}" size="${size === "sm" ? "xs" : "sm"}"></ollama-icon>
            <ollama-tooltip>${action.label}</ollama-tooltip>
          </ollama-button>
        `,
        )
        .join("")}
      <slot></slot>
    `;

    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-message-actions")) {
  customElements.define("ollama-message-actions", OllamaMessageActions);
}

export { OllamaMessageActions };
