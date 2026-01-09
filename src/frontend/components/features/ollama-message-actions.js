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
    this.copySuccess = false;
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.attachEventListeners();
  }

  get actions() {
    const raw = this.getAttribute("actions");
    if (!raw) {
      return [{ id: "copy", icon: "copy", label: "Copy" }];
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
      button.addEventListener("click", async () => {
        if (this.isDisabled) return;
        const action = button.getAttribute("data-action");
        if (!action) return;

        // Handle copy action directly
        if (action === "copy") {
          await this.handleCopy();
        }

        this.emit(`${action}-message`, { action });
        this.emit("action", { action });
      });
    });
  }

  async handleCopy() {
    // Get content from parent message component
    const messageContent = this.getMessageContent();
    if (!messageContent) return;

    try {
      await navigator.clipboard?.writeText(messageContent);
      this.copySuccess = true;
      this.updateCopyButton();

      // Reset after 2 seconds
      setTimeout(() => {
        this.copySuccess = false;
        this.updateCopyButton();
      }, 2000);
    } catch (error) {
      console.warn("Failed to copy message:", error);
    }
  }

  getMessageContent() {
    // Try to find content from parent user-message or ai-response component
    const host = this.getRootNode()?.host;
    if (!host) return "";

    // Check for content attribute
    const content = host.getAttribute?.("content");
    if (content) return content;

    // Try to find text content from content part
    const contentEl = host.shadowRoot?.querySelector('[part="content"]');
    if (contentEl) {
      return contentEl.textContent?.trim() || "";
    }

    return "";
  }

  updateCopyButton() {
    const copyButton = this.shadowRoot?.querySelector('[data-action="copy"]');
    if (!copyButton) return;

    const icon = copyButton.querySelector("ollama-icon");
    const tooltip = copyButton.querySelector("ollama-tooltip");

    if (icon && tooltip) {
      if (this.copySuccess) {
        icon.setAttribute("name", "check");
        tooltip.textContent = "Copied!";
      } else {
        icon.setAttribute("name", "copy");
        tooltip.textContent = "Copy";
      }
    }
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
