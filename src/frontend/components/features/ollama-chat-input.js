import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-textarea.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-tooltip.js";
import "../base/ollama-select.js";

const KEY_CODES = {
  ENTER: "Enter",
};

const DEFAULT_UPLOAD_ACTIONS = [
  {
    id: "image",
    icon: "image",
    label: "Media",
    tooltip: "Upload image",
    i18nKey: "chat.input.imageUpload",
  },
  {
    id: "file",
    icon: "paperclip",
    label: "Files",
    tooltip: "Attach file",
    i18nKey: "chat.input.fileUpload",
  },
];

export class OllamaChatInput extends BaseComponent {
  static get observedAttributes() {
    return [
      "placeholder",
      "value",
      "disabled",
      "maxlength",
      "token-limit",
      "upload-actions",
      "label",
      "aria-label",
      "aria-labelledby",
      "busy",
      "model",
      "model-options",
    ];
  }

  constructor() {
    super();
    this.value = this.getAttribute("value") || "";
    this.render();
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateTokenCount();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "value") {
      this.value = newValue || "";
      const textarea = this.shadowRoot?.querySelector("ollama-textarea");
      if (textarea && textarea.value !== this.value) {
        textarea.value = this.value;
      }
      this.updateTokenCount();
      this.updateSendState();
      return;
    }

    // Don't re-render on model change to preserve input value
    if (name === "model" || name === "model-options") {
      // Just update the select without re-rendering
      const modelSelect = this.shadowRoot?.querySelector(".model-select");
      if (modelSelect && name === "model") {
        modelSelect.setAttribute("value", newValue);
      }
      return;
    }

    this.render();
  }

  get textarea() {
    return this.shadowRoot?.querySelector("ollama-textarea");
  }

  get sendButton() {
    return this.shadowRoot?.querySelector(".send-button");
  }

  get uploadActions() {
    const attr = this.getAttribute("upload-actions");
    if (!attr) return DEFAULT_UPLOAD_ACTIONS;
    try {
      const parsed = JSON.parse(attr);
      return Array.isArray(parsed) ? parsed : DEFAULT_UPLOAD_ACTIONS;
    } catch (error) {
      console.warn("<ollama-chat-input> invalid upload-actions", error);
      return DEFAULT_UPLOAD_ACTIONS;
    }
  }

  get modelOptions() {
    const raw = this.getAttribute("model-options");
    if (!raw) {
      return [{ label: "llama3", value: "llama3" }];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length
        ? parsed
        : [{ label: "llama3", value: "llama3" }];
    } catch (error) {
      console.warn("<ollama-chat-input> invalid model-options", error);
      return [{ label: "llama3", value: "llama3" }];
    }
  }

  attachEventListeners() {
    const textarea = this.textarea;
    if (!textarea) return;

    textarea.addEventListener("input", (event) => {
      this.value = event.detail?.value ?? textarea.value;
      this.emit("input", { value: this.value });
      this.updateTokenCount();
      this.updateSendState();
      this.autoResizeTextarea();
    });

    textarea.addEventListener("keydown", (event) => {
      if (event.key === KEY_CODES.ENTER && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        this.handleSend("keyboard");
      }
    });

    this.sendButton?.addEventListener("click", () => this.handleSend("button"));

    const actionButtons = this.shadowRoot?.querySelectorAll(".action-button");
    actionButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        const actionId = button.getAttribute("data-action");
        if (!actionId || this.isInputDisabled()) return;
        this.emit("action", { id: actionId });
      });
    });

    const modelSelect = this.shadowRoot?.querySelector(".model-select");
    modelSelect?.addEventListener("change", (event) => {
      const nextValue = event.detail?.value ?? event.target?.value;
      this.setAttribute("model", nextValue);
      this.emit("model-change", { value: nextValue });
    });
  }

  autoResizeTextarea() {
    const textarea = this.textarea;
    const native = textarea?.shadowRoot?.querySelector("textarea");
    if (!native) return;
    native.style.height = "auto";
    native.style.height = `${Math.max(native.scrollHeight, 48)}px`;
  }

  handleSend(source) {
    if (this.isSendDisabled()) return;
    const trimmed = this.value?.trim();
    if (!trimmed) return;

    this.emit("send", {
      value: trimmed,
      tokens: this.tokenCount,
      source,
    });

    this.value = "";
    if (this.textarea) this.textarea.value = "";
    this.updateTokenCount();
    this.updateSendState();
  }

  isInputDisabled() {
    return (
      this.getBooleanAttribute("disabled") || this.getBooleanAttribute("busy")
    );
  }

  isSendDisabled() {
    return this.isInputDisabled() || !this.value?.trim();
  }

  updateSendState() {
    const button = this.sendButton;
    if (!button) return;
    if (this.isSendDisabled()) {
      button.setAttribute("disabled", "");
    } else {
      button.removeAttribute("disabled");
    }
  }

  calculateTokens(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  updateTokenCount() {
    this.tokenCount = this.calculateTokens(this.value);
    const display = this.shadowRoot?.querySelector(".token-count");
    if (!display) return;

    const tokenLimit = this.getAttribute("token-limit");
    const max = tokenLimit ? Number(tokenLimit) : null;
    const text = max ? `${this.tokenCount}/${max}` : `${this.tokenCount}`;
    display.textContent = text;
    if (max && this.tokenCount > max) {
      display.classList.add("over-limit");
    } else {
      display.classList.remove("over-limit");
    }
  }

  resolveLabelText() {
    return (
      this.getAttribute("label") ||
      this.getAttribute("aria-label") ||
      this.getAttribute("placeholder") ||
      "Message"
    );
  }

  render() {
    const placeholder = this.getAttribute("placeholder") || "Ask anything";
    const busy = this.getBooleanAttribute("busy");
    const disabled = this.getBooleanAttribute("disabled");
    const ariaLabelledBy = this.getAttribute("aria-labelledby") || "";
    const labelText = this.resolveLabelText();
    const modelOptions = this.modelOptions;
    const selectedModel =
      this.getAttribute("model") || modelOptions[0]?.value || "";
    this.tokenCount = this.calculateTokens(this.value);

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          background: var(--color-bg-primary);
          padding: var(--spacing-lg) var(--spacing-xl);
        }

        .composer {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .input-shell {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          padding: var(--spacing-lg);
          background: var(--color-bg-secondary);
          border-radius: 20px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: var(--shadow-sm);
        }

        :host([data-theme="dark"]) .input-shell {
          border-color: rgba(255, 255, 255, 0.08);
          background: #1f1f1f;
        }

        .input-shell[aria-busy="true"] {
          opacity: 0.6;
        }

        .textarea-wrapper {
          flex: 1;
        }

        .composer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding-top: var(--spacing-xs);
        }

        .action-cluster {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .action-buttons {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 14px;
          border: none;
          background: rgba(0, 0, 0, 0.08);
          color: var(--color-text-secondary);
          cursor: pointer;
        }

        .action-button .label {
          display: none;
        }

        .action-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .action-button:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.08);
        }

        :host([data-theme="dark"]) .action-button {
          background: rgba(255, 255, 255, 0.08);
        }

        .model-select {
          height: 32px;
          display: inline-flex;
          align-items: center;
        }

        .status-stack {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .status-line {
          display: none;
        }

        .send-button {
          width: 32px;
          height: 32px;
          border-radius: 16px;
          border: none;
          background: var(--color-accent-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-on-accent, #fff);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
        }

        .send-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .send-button:hover:not(:disabled) {
          background: var(--color-accent-primary-hover);
        }
      </style>
      <div class="composer" part="composer">
        <div class="input-shell" aria-busy="${busy}">
          <div class="textarea-wrapper">
            <ollama-textarea
              placeholder="${placeholder}"
              value="${this.value || ""}"
              rows="2"
              appearance="minimal"
              aria-label="${labelText}"
              aria-labelledby="${ariaLabelledBy}"
              style="
                --textarea-font-size: var(--font-size-md);
                --textarea-line-height: 1.4;
                --textarea-padding-block: var(--spacing-xs);
                --textarea-padding-inline: 0;
                --textarea-border-radius: 0;
                --textarea-placeholder-color: #4b5563;
              "
              ${disabled ? "disabled" : ""}
              ${busy ? 'aria-busy="true"' : ""}
            ></ollama-textarea>
          </div>
          <div class="composer-footer">
            <div class="action-cluster">
              <div class="action-buttons" role="group" aria-label="Composer attachments">
                ${this.renderActionButtons(disabled || busy)}
              </div>
              <ollama-select
                class="model-select"
                size="sm"
                variant="textlike"
                value="${selectedModel}"
                aria-label="Model"
                ${disabled ? "disabled" : ""}
              >
                ${modelOptions
                  .map(
                    (opt) =>
                      `<option value="${opt.value}">${opt.label}</option>`,
                  )
                  .join("")}
              </ollama-select>
            </div>
            <div class="status-stack">
              <div class="status-line"></div>
              <button
                type="button"
                class="send-button"
                ${this.isSendDisabled() ? "disabled" : ""}
                aria-label="Send message"
              >
                <slot name="send-icon">
                  <ollama-icon name="send" size="sm"></ollama-icon>
                </slot>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.updateTokenCount();
    this.autoResizeTextarea();
  }

  renderActionButtons(disabled) {
    return this.uploadActions
      .map((action) => {
        const tooltipText = action.tooltip || action.label || action.id;
        return `
          <button
            type="button"
            class="action-button"
            data-action="${action.id}"
            ${disabled ? "disabled" : ""}
            aria-label="${tooltipText}"
          >
            <ollama-icon name="${action.icon}" size="sm"></ollama-icon>
            ${action.label ? `<span class="label">${action.label}</span>` : ""}
            ${
              tooltipText
                ? `<ollama-tooltip position="top-right">${tooltipText}</ollama-tooltip>`
                : ""
            }
          </button>
        `;
      })
      .join("");
  }
}

if (!customElements.get("ollama-chat-input")) {
  customElements.define("ollama-chat-input", OllamaChatInput);
}
