import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-select.js";
import "../base/ollama-badge.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";

class OllamaModelSelector extends BaseComponent {
  static get observedAttributes() {
    return ["value", "label", "models", "disabled"];
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

  get models() {
    const raw = this.getAttribute("models");
    if (!raw) {
      return [
        {
          value: "llama3",
          label: "llama3",
          size: "8B",
          capabilities: ["chat"],
        },
      ];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : [];
    } catch (error) {
      console.warn("<ollama-model-selector> invalid models", error);
      return [];
    }
  }

  attachEventListeners() {
    const select = this.shadowRoot?.querySelector("ollama-select");
    if (!select) return;
    select.addEventListener("change", (event) => {
      const value = event.detail?.value ?? "";
      this.setAttribute("value", value);
      this.emit("model-change", { value });
    });
  }

  render() {
    const label = this.getAttribute("label");
    const value = this.getAttribute("value") || "";
    const disabled = this.hasAttribute("disabled");
    const models = this.models;
    const selected =
      models.find((model) => model.value === value) || models[0];
    const capabilities = selected?.capabilities || [];
    const size = selected?.size;

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .row {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .meta {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          color: var(--color-text-secondary);
        }
      </style>
      ${label ? `<ollama-text variant="label">${label}</ollama-text>` : ""}
      <div class="row">
        <ollama-select
          value="${selected?.value || ""}"
          aria-label="Model"
          size="sm"
          ${disabled ? "disabled" : ""}
        >
          ${models
            .map(
              (model) =>
                `<option value="${model.value}">${model.label}</option>`,
            )
            .join("")}
        </ollama-select>
        <div class="meta">
          ${size ? `<ollama-badge size="sm">${size}</ollama-badge>` : ""}
          ${capabilities
            .map(
              (capability) =>
                `<ollama-badge size="sm" variant="default">
                   ${capability}
                   <ollama-tooltip position="top-right">
                     ${capability} capability
                   </ollama-tooltip>
                 </ollama-badge>`,
            )
            .join("")}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-model-selector")) {
  customElements.define("ollama-model-selector", OllamaModelSelector);
}

export { OllamaModelSelector };
