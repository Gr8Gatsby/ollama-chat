import { BaseComponent } from "./base-component.js";

let textareaIdCounter = 0;

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
    return [
      "placeholder",
      "value",
      "disabled",
      "required",
      "error",
      "rows",
      "label",
      "aria-label",
      "aria-labelledby",
      "appearance",
    ];
  }

  constructor() {
    super();
    this.textareaId = `ollama-textarea-${++textareaIdCounter}`;
    this.errorMessageId = `ollama-textarea-error-${++textareaIdCounter}`;
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === "value") {
        const textarea = this.shadowRoot.querySelector("textarea");
        if (textarea && textarea.value !== newValue) {
          textarea.value = newValue || "";
        }
      } else {
        this.render();
      }
    }
  }

  setupEventListeners() {
    const textarea = this.shadowRoot.querySelector("textarea");
    textarea.addEventListener("input", (e) => {
      this.setAttribute("value", e.target.value);
      this.emit("input", { value: e.target.value });
    });
    textarea.addEventListener("change", (e) => {
      this.emit("change", { value: e.target.value });
    });
  }

  render() {
    const placeholder = this.getAttribute("placeholder") || "";
    const value = this.getAttribute("value") || "";
    const disabled = this.getBooleanAttribute("disabled");
    const required = this.getBooleanAttribute("required");
    const error = this.getAttribute("error");
    const rows = this.getAttribute("rows") || "3";
    const labelText = this.getAttribute("label");
    const ariaLabel = this.getAttribute("aria-label");
    const ariaLabelledBy = this.getAttribute("aria-labelledby");
    const labelId = labelText ? `${this.textareaId}-label` : null;
    const computedLabelledBy = [ariaLabelledBy, labelId]
      .filter(Boolean)
      .join(" ");
    const describedBy = error
      ? `aria-describedby="${this.errorMessageId}"`
      : "";
    const ariaInvalid = error ? "true" : "false";
    const resolvedAriaLabel =
      !labelText && !ariaLabel && !ariaLabelledBy && placeholder
        ? placeholder
        : ariaLabel || "";
    const appearance = this.getAttribute("appearance") || "default";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host { display: block; width: 100%; }

        .field {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .label-text {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          font-family: var(--font-family);
        }

        textarea {
          font-family: var(--font-family);
          font-size: var(--textarea-font-size, var(--font-size-md));
          line-height: var(--textarea-line-height, 1.5);
          color: var(--color-text-primary);
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--textarea-border-radius, var(--radius-md));
          padding: var(--textarea-padding-block, var(--spacing-sm)) var(
              --textarea-padding-inline,
              var(--spacing-md)
            );
          outline: none;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          width: 100%;
          resize: vertical;
          min-height: 60px;
        }

        textarea::placeholder {
          color: var(--textarea-placeholder-color, var(--color-text-tertiary));
        }
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
          font-family: var(--font-family);
        }

        :host([appearance="minimal"]) textarea {
          border: none;
          background: transparent;
          padding: 0;
          min-height: 48px;
          resize: none;
        }

        :host([appearance="minimal"]) textarea:focus {
          box-shadow: none;
          border: none;
        }

        :host([appearance="minimal"]) .field {
          gap: 0;
        }

        :host([appearance="minimal"]) .label-text {
          display: none;
        }
      </style>
      <div class="field ${appearance}">
        ${
          labelText
            ? `<span class="label-text" id="${labelId}" part="label">${labelText}</span>`
            : ""
        }
        <textarea
          id="${this.textareaId}"
          placeholder="${placeholder}"
          ${disabled ? "disabled" : ""}
          ${required ? "required" : ""}
          aria-required="${required ? "true" : "false"}"
          aria-invalid="${ariaInvalid}"
          ${resolvedAriaLabel ? `aria-label="${resolvedAriaLabel}"` : ""}
          ${computedLabelledBy ? `aria-labelledby="${computedLabelledBy}"` : ""}
          ${describedBy}
          rows="${rows}"
          class="${error ? "error" : ""}"
        >${value}</textarea>
        ${
          error
            ? `<div class="error-message" id="${this.errorMessageId}" role="alert">${error}</div>`
            : ""
        }
      </div>
    `;
    this.setupEventListeners();
    const textarea = this.shadowRoot.querySelector("textarea");
    textarea.value = value;
    this.applyLocalizationAttributes(textarea);
    const labelEl = this.shadowRoot.querySelector(".label-text");
    if (labelEl) this.applyLocalizationAttributes(labelEl);
  }

  get value() {
    return this.getAttribute("value") || "";
  }
  set value(val) {
    this.setAttribute("value", val);
  }
}

customElements.define("ollama-textarea", OllamaTextarea);
