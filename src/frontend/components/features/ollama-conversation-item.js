import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-badge.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-input.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";

class OllamaConversationItem extends BaseComponent {
  static get observedAttributes() {
    return [
      "conversation-id",
      "title",
      "conversation-title",
      "message-count",
      "token-count",
      "unread-count",
      "selected",
      "editing",
      "draft-title",
    ];
  }

  constructor() {
    super();
    this.suppressTitleRemove = false;
    this.wasEditing = false;
    this.shouldFocusRename = false;
    this.handleDocumentClick = (event) => this.onDocumentClick(event);
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener("mousedown", this.handleDocumentClick);
    super.disconnectedCallback();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === "draft-title" && this.hasAttribute("editing")) {
        const renameInput = this.shadowRoot?.querySelector(".rename-input");
        if (renameInput) {
          renameInput.value = newValue || "";
          return;
        }
      }
      if (name === "title" && newValue && !this.suppressTitleRemove) {
        this._title = newValue;
        this.suppressTitleRemove = true;
        this.removeAttribute("title");
        this.suppressTitleRemove = false;
      }
      this.render();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.attachEventListeners();
  }

  attachEventListeners() {
    const mainButton = this.shadowRoot?.querySelector(".item-main");
    if (mainButton && !this.hasAttribute("editing")) {
      mainButton.addEventListener("click", () => this.emitSelection());
      mainButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.emitSelection();
        }
      });
    }

    const actionButtons = this.shadowRoot?.querySelectorAll(
      ".action-button[data-action]",
    );
    actionButtons?.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const action = button.getAttribute("data-action");
        if (action) {
          this.emitAction(action);
        }
      });
    });

    const renameInput = this.shadowRoot?.querySelector(".rename-input");
    if (renameInput) {
      renameInput.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });
      renameInput.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      renameInput.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      renameInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.emitRenameCommit(renameInput.value);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          this.emitRenameCancel();
        }
      });
      renameInput.addEventListener("input", (event) => {
        this.emitRenameDraft(event.detail?.value ?? renameInput.value);
      });
      this.applyLocalizationAttributes(renameInput);
      if (this.shouldFocusRename) {
        requestAnimationFrame(() => {
          renameInput.focus();
          const value = renameInput.value || "";
          if (renameInput.setSelectionRange) {
            renameInput.setSelectionRange(value.length, value.length);
          }
        });
      }
    }
  }

  emitSelection() {
    const id = this.getAttribute("conversation-id") || "";
    this.emit("conversation-selected", { id });
  }

  emitAction(action) {
    const id = this.getAttribute("conversation-id") || "";
    if (action === "rename") {
      this.emit("conversation-rename", { id });
      return;
    }
    this.emit("conversation-action", { id, action });
  }

  emitRenameCommit(title) {
    const id = this.getAttribute("conversation-id") || "";
    this.emit("conversation-rename-commit", { id, title });
  }

  emitRenameDraft(title) {
    const id = this.getAttribute("conversation-id") || "";
    this.emit("conversation-rename-draft", { id, title });
  }

  emitRenameCancel() {
    const id = this.getAttribute("conversation-id") || "";
    this.emit("conversation-rename-cancel", { id });
  }

  onDocumentClick(event) {
    if (!this.hasAttribute("editing")) return;
    const path = event.composedPath ? event.composedPath() : [];
    if (path.includes(this) || path.includes(this.shadowRoot)) return;
    this.emitRenameCancel();
  }

  updateDocumentListener(editing) {
    if (editing) {
      document.addEventListener("mousedown", this.handleDocumentClick);
    } else {
      document.removeEventListener("mousedown", this.handleDocumentClick);
    }
  }

  render() {
    const title =
      this.getAttribute("conversation-title") || this._title || "Untitled chat";
    const messageCount = Number(this.getAttribute("message-count") || 0);
    const tokenCount = Number(this.getAttribute("token-count") || 0);
    const unread = Number(this.getAttribute("unread-count") || 0);
    const selected = this.hasAttribute("selected");
    const editing = this.hasAttribute("editing");
    const draftTitle = this.getAttribute("draft-title") || title;

    this.shouldFocusRename = editing && !this.wasEditing;
    this.updateDocumentListener(editing);

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
        }

        .item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--spacing-sm);
          align-items: center;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          background: ${selected ? "var(--color-bg-secondary)" : "transparent"};
        }

        .item-main {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          align-items: flex-start;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          width: 100%;
        }

        .title-row {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          width: 100%;
        }

        .title-text {
          position: relative;
        }

        .meta-row {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          color: var(--color-text-secondary);
        }

        .action-slot {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--transition-fast);
        }

        .action-button {
          width: 24px;
          height: 24px;
          border-radius: 12px;
        }

        :host(:focus-within) .item {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }

        .item:hover .action-slot,
        :host(:focus-within) .action-slot {
          opacity: 1;
          pointer-events: auto;
        }
      </style>
      <div class="item" part="item" role="listitem">
        ${
          editing
            ? `<div class="item-main" role="presentation">
                <div class="title-row">
                  <ollama-input
                    class="rename-input"
                    value="${draftTitle}"
                    aria-label="Rename conversation"
                  ></ollama-input>
                  ${unread > 0 ? `<ollama-badge size="sm">${unread}</ollama-badge>` : ""}
                </div>
                <div class="meta-row">
                  <ollama-badge size="sm">${messageCount}</ollama-badge>
                  <ollama-text variant="caption" color="muted">messages</ollama-text>
                  <ollama-badge size="sm">${tokenCount}</ollama-badge>
                  <ollama-text variant="caption" color="muted">tokens</ollama-text>
                </div>
              </div>`
            : `<button
                class="item-main"
                type="button"
                aria-pressed="${selected ? "true" : "false"}"
              >
                <div class="title-row">
                  <span class="title-text">
                    <ollama-text variant="label">${title}</ollama-text>
                    <ollama-tooltip position="bottom-right">${title}</ollama-tooltip>
                  </span>
                  ${unread > 0 ? `<ollama-badge size="sm">${unread}</ollama-badge>` : ""}
                </div>
                <div class="meta-row">
                  <ollama-badge size="sm">${messageCount}</ollama-badge>
                  <ollama-text variant="caption" color="muted">messages</ollama-text>
                  <ollama-badge size="sm">${tokenCount}</ollama-badge>
                  <ollama-text variant="caption" color="muted">tokens</ollama-text>
                </div>
              </button>`
        }
        <div class="action-slot" part="actions">
          <slot name="actions">
            <ollama-button
              class="action-button"
              variant="icon"
              aria-label="Rename conversation"
              data-action="rename"
            >
              <ollama-icon name="pencil" size="xs"></ollama-icon>
              <ollama-tooltip>Rename</ollama-tooltip>
            </ollama-button>
            <ollama-button
              class="action-button"
              variant="icon"
              aria-label="Delete conversation"
              data-action="delete"
            >
              <ollama-icon name="trash-2" size="xs"></ollama-icon>
              <ollama-tooltip>Delete</ollama-tooltip>
            </ollama-button>
          </slot>
        </div>
      </div>
    `;

    this.wasEditing = editing;
    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-conversation-item")) {
  customElements.define("ollama-conversation-item", OllamaConversationItem);
}

export { OllamaConversationItem };
