import { BaseComponent } from "./base-component.js";

/**
 * <ollama-select> - Dropdown select component
 *
 * Attributes:
 *   value: Selected value
 *   disabled: Boolean attribute
 *   size: sm | md | lg (default: md)
 *   variant: default | textlike (default: default)
 *
 * Usage: Add <option> elements as children
 * Example:
 *   <ollama-select value="opt1">
 *     <option value="opt1">Option 1</option>
 *     <option value="opt2">Option 2</option>
 *   </ollama-select>
 *
 * Textlike variant: Appears as bold text until hovered/clicked
 *   <ollama-select value="opt1" variant="textlike">
 *     ...
 *   </ollama-select>
 */
let selectIdCounter = 0;

export class OllamaSelect extends BaseComponent {
  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "size",
      "variant",
      "label",
      "aria-label",
      "aria-labelledby",
    ];
  }

  constructor() {
    super();
    this.inputId = `ollama-select-${++selectIdCounter}`;
    this.optionObserver = new MutationObserver(() => this.syncOptions());
    this.optionObserver.observe(this, { childList: true, subtree: true });
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === "value") {
        const select = this.shadowRoot.querySelector("select");
        if (select) select.value = newValue || "";
      } else {
        this.render();
      }
    }
  }

  setupEventListeners() {
    const select = this.shadowRoot.querySelector("select");
    select.addEventListener("change", (e) => {
      this.setAttribute("value", e.target.value);
      this.emit("change", { value: e.target.value });
    });
  }

  render() {
    const value = this.getAttribute("value") || "";
    const disabled = this.getBooleanAttribute("disabled");
    const size = this.getAttribute("size") || "md";
    const variant = this.getAttribute("variant") || "default";
    const labelText = this.getAttribute("label");
    const ariaLabel = this.getAttribute("aria-label");
    const ariaLabelledBy = this.getAttribute("aria-labelledby");
    const labelId = labelText ? `${this.inputId}-label` : null;
    const computedLabelledBy = [ariaLabelledBy, labelId]
      .filter(Boolean)
      .join(" ");

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host { display: inline-block; }

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

        select {
          font-family: var(--font-family);
          font-size: var(--font-size-md);
          color: var(--color-text-primary);
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--select-padding-block, var(--spacing-sm))
            var(--select-padding-inline, var(--spacing-md));
          padding-right: var(--select-padding-right, var(--spacing-xl));
          outline: none;
          cursor: pointer;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right var(--select-chevron-offset, var(--spacing-sm))
            center;
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
          --select-padding-block: var(--spacing-xs);
          --select-padding-inline: var(--spacing-sm);
          --select-padding-right: calc(var(--spacing-lg) + var(--spacing-xs));
        }

        select.lg {
          font-size: var(--font-size-lg);
          --select-padding-block: var(--spacing-md);
          --select-padding-inline: var(--spacing-lg);
          --select-padding-right: calc(var(--spacing-xl) + var(--spacing-md));
        }

        /* Textlike variant - appears as bold text until interacted with */
        select.textlike {
          border: none;
          background: transparent;
          font-weight: 600;
          padding: var(--spacing-xs) calc(var(--spacing-lg) + var(--spacing-xs)) var(--spacing-xs) var(--spacing-xs);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-position: right var(--spacing-xs) center;
          border-radius: var(--radius-sm);
        }

        select.textlike:hover:not(:disabled) {
          background: var(--color-bg-secondary);
        }

        select.textlike:focus {
          background: var(--color-bg-secondary);
          box-shadow: none;
        }

        :host([data-theme="dark"]) select.textlike:hover:not(:disabled),
        :host([data-theme="dark"]) select.textlike:focus {
          background: rgba(255, 255, 255, 0.08);
        }
      </style>
      <div class="field" part="group">
        ${labelText ? `<span class="label-text" id="${labelId}" part="label">${labelText}</span>` : ""}
        <select
          id="${this.inputId}"
          class="${size} ${variant}"
          ${disabled ? "disabled" : ""}
          aria-disabled="${disabled ? "true" : "false"}"
          ${ariaLabel ? `aria-label="${ariaLabel}"` : ""}
          ${computedLabelledBy ? `aria-labelledby="${computedLabelledBy}"` : ""}
        >
        </select>
      </div>
    `;
    this.setupEventListeners();
    this.syncOptions();

    // Set initial value
    const select = this.shadowRoot.querySelector("select");
    if (value) select.value = value;
    this.applyLocalizationAttributes(select);
    const labelEl = this.shadowRoot.querySelector(".label-text");
    if (labelEl) this.applyLocalizationAttributes(labelEl);
  }

  syncOptions() {
    const select = this.shadowRoot?.querySelector("select");
    if (!select) return;
    const lightOptions = Array.from(this.querySelectorAll("option"));
    if (!lightOptions.length) {
      select.innerHTML = "";
      return;
    }
    const clones = lightOptions.map((option) => option.cloneNode(true));
    select.replaceChildren(...clones);
    const currentValue = this.getAttribute("value");
    if (currentValue) select.value = currentValue;
  }

  disconnectedCallback() {
    this.optionObserver?.disconnect();
    super.disconnectedCallback();
  }

  get value() {
    return this.getAttribute("value") || "";
  }
  set value(val) {
    this.setAttribute("value", val);
  }
}

customElements.define("ollama-select", OllamaSelect);
