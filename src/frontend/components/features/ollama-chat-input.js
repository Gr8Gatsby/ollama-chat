import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-textarea.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-tooltip.js";
import "../base/ollama-select.js";
import "../base/ollama-dropdown.js";

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
    this.attachedFiles = [];
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
    const stopButton = this.shadowRoot?.querySelector(".stop-button");
    stopButton?.addEventListener("click", () => {
      this.emit("stop");
    });

    const menuItems = this.shadowRoot?.querySelectorAll(".menu-item");
    menuItems?.forEach((item) => {
      item.addEventListener("click", () => {
        const actionId = item.getAttribute("data-action");
        if (!actionId || this.isInputDisabled()) return;

        // Close the dropdown
        const dropdown = this.shadowRoot?.querySelector("ollama-dropdown");
        if (dropdown) dropdown.removeAttribute("open");

        if (actionId === "file") {
          this.triggerFileInput();
        } else {
          this.emit("action", { id: actionId });
        }
      });
    });

    const fileInput = this.shadowRoot?.querySelector(".file-input");
    if (fileInput) {
      fileInput.addEventListener("change", (event) => {
        this.handleFileSelection(event);
      });
    }

    const removeButtons =
      this.shadowRoot?.querySelectorAll(".file-pill-remove");
    removeButtons?.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const fileId = button.getAttribute("data-file-id");
        if (fileId) {
          this.removeAttachedFile(fileId);
        }
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
      attachedFiles: this.attachedFiles,
    });

    this.value = "";
    if (this.textarea) this.textarea.value = "";
    this.attachedFiles = [];
    this.updateTokenCount();
    this.updateSendState();
    this.render();
  }

  triggerFileInput() {
    const fileInput = this.shadowRoot?.querySelector(".file-input");
    if (fileInput) {
      fileInput.click();
    }
  }

  async handleFileSelection(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const fileData = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      };

      // For images, create a preview URL
      if (file.type.startsWith("image/")) {
        fileData.previewUrl = URL.createObjectURL(file);
      }

      this.attachedFiles.push(fileData);
    }

    // Clear the input so the same file can be selected again
    event.target.value = "";

    this.render();
    this.emit("files-attached", { files: this.attachedFiles });
  }

  removeAttachedFile(fileId) {
    const index = this.attachedFiles.findIndex((f) => f.id === fileId);
    if (index !== -1) {
      const file = this.attachedFiles[index];
      // Revoke preview URL if it exists
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      this.attachedFiles.splice(index, 1);
      this.render();
      this.emit("file-removed", { fileId });
    }
  }

  formatFileSize(bytes) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  isInputDisabled() {
    return (
      this.getBooleanAttribute("disabled") || this.getBooleanAttribute("busy")
    );
  }

  isSendDisabled() {
    return this.isInputDisabled() || !this.value?.trim();
  }

  isBusy() {
    return this.getBooleanAttribute("busy");
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
          padding-bottom: calc(var(--spacing-lg) / 2);
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

        .file-input {
          display: none;
        }

        .attached-files {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          padding-top: var(--spacing-xs);
        }

        .file-pill {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: 6px 10px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          color: var(--color-text-primary);
          position: relative;
          height: 28px;
          box-sizing: border-box;
        }

        .file-pill:hover {
          background: var(--color-border-hover);
        }

        .file-pill-icon {
          display: inline-flex;
          flex-shrink: 0;
        }

        .file-pill-info {
          display: inline-flex;
          align-items: center;
          min-width: 0;
        }

        .file-pill-name {
          font-weight: 500;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-pill-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--color-text-secondary);
          padding: 0;
        }

        .file-pill-remove:hover {
          background: rgba(0, 0, 0, 0.1);
          color: var(--color-text-primary);
        }

        :host([data-theme="dark"]) .file-pill-remove:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .file-preview {
          position: absolute;
          bottom: calc(100% + var(--spacing-sm));
          left: 0;
          max-width: 300px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
          display: none;
          z-index: 1000;
          background: var(--color-bg-primary);
        }

        .file-pill:hover .file-preview {
          display: block;
        }

        .file-preview img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 300px;
          object-fit: contain;
        }

        .file-preview-info {
          padding: var(--spacing-sm);
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
        }

        .file-preview-name {
          font-size: var(--font-size-xs);
          font-weight: 500;
          color: var(--color-text-primary);
          word-break: break-word;
          margin-bottom: 2px;
        }

        .file-preview-size {
          font-size: 10px;
          color: var(--color-text-tertiary);
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

        .attach-dropdown {
          display: inline-block;
        }

        .plus-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          border-radius: var(--radius-md);
          border: none;
          background: transparent;
          color: var(--color-text-primary);
          cursor: pointer;
          position: relative;
        }

        .plus-button::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.08);
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .plus-button:hover:not(:disabled)::before {
          opacity: 1;
        }

        :host([data-theme="dark"]) .plus-button::before {
          background: rgba(255, 255, 255, 0.12);
        }

        .plus-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: var(--font-size-sm);
          color: var(--color-text-primary);
          background: transparent;
          transition: background 0.15s ease;
        }

        .menu-item:hover {
          background: var(--color-bg-secondary);
        }

        :host([data-theme="dark"]) .menu-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .menu-item-icon {
          display: inline-flex;
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

        .send-button,
        .stop-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          border-radius: var(--radius-md);
          border: none;
          background: transparent;
          color: var(--color-text-primary);
          cursor: pointer;
          position: relative;
        }

        .send-button::before,
        .stop-button::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.08);
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .send-button:hover:not(:disabled)::before,
        .stop-button:hover:not(:disabled)::before {
          opacity: 1;
        }

        :host([data-theme="dark"]) .send-button::before,
        :host([data-theme="dark"]) .stop-button::before {
          background: rgba(255, 255, 255, 0.12);
        }

        .send-button:disabled,
        .stop-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      </style>
      <div class="composer" part="composer">
        <div class="input-shell" aria-busy="${busy}">
          ${
            this.attachedFiles.length > 0
              ? `
            <div class="attached-files">
              ${this.renderAttachedFiles()}
            </div>
          `
              : ""
          }
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
          <input
            type="file"
            class="file-input"
            multiple
            accept="image/*,application/pdf,.txt,.md,.json,.js,.ts,.jsx,.tsx,.css,.html,.xml,.csv"
          />
          <div class="composer-footer">
            <div class="action-cluster">
              <ollama-dropdown class="attach-dropdown" position="top">
                <button
                  slot="trigger"
                  type="button"
                  class="plus-button"
                  ${disabled || busy ? "disabled" : ""}
                  aria-label="Add attachment"
                >
                  <ollama-icon name="plus" size="sm" style="stroke-width: 2.5;"></ollama-icon>
                </button>
                ${this.renderAttachMenu()}
              </ollama-dropdown>
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
              ${
                busy
                  ? `
                  <button
                    type="button"
                    class="stop-button"
                    aria-label="Stop generating"
                  >
                    <ollama-icon name="square" size="sm" style="stroke-width: 2.5;"></ollama-icon>
                  </button>
                `
                  : `
                  <button
                    type="button"
                    class="send-button"
                    ${this.isSendDisabled() ? "disabled" : ""}
                    aria-label="Send message"
                  >
                    <slot name="send-icon">
                      <ollama-icon name="send-horizontal" size="sm" style="stroke-width: 2.5;"></ollama-icon>
                    </slot>
                  </button>
                `
              }
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.updateTokenCount();
    this.autoResizeTextarea();
  }

  renderAttachMenu() {
    return `
      <div class="menu-item" data-action="file" role="menuitem">
        <span class="menu-item-icon">
          <ollama-icon name="paperclip" size="sm"></ollama-icon>
        </span>
        <span>Add files or photos</span>
      </div>
    `;
  }

  renderAttachedFiles() {
    return this.attachedFiles
      .map((file) => {
        const isImage = file.type.startsWith("image/");
        return `
          <div class="file-pill" data-file-id="${file.id}">
            <span class="file-pill-icon">
              <ollama-icon name="${isImage ? "image" : "file"}" size="xs"></ollama-icon>
            </span>
            <div class="file-pill-info">
              <span class="file-pill-name">${file.name}</span>
            </div>
            <button
              type="button"
              class="file-pill-remove"
              data-file-id="${file.id}"
              aria-label="Remove ${file.name}"
            >
              <ollama-icon name="x" size="xs"></ollama-icon>
            </button>
            <div class="file-preview">
              ${
                isImage && file.previewUrl
                  ? `
                <img
                  src="${file.previewUrl}"
                  alt="${file.name}"
                  onerror="this.style.display='none';this.closest('.file-pill').querySelector('.file-pill-icon ollama-icon').setAttribute('name','file');"
                />
              `
                  : ""
              }
              <div class="file-preview-info">
                <div class="file-preview-name">${file.name}</div>
                <div class="file-preview-size">${this.formatFileSize(file.size)}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }
}

if (!customElements.get("ollama-chat-input")) {
  customElements.define("ollama-chat-input", OllamaChatInput);
}
