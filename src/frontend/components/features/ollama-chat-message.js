import { BaseComponent } from "../base/base-component.js";
import "./ollama-user-message.js";
import "./ollama-ai-response.js";

class OllamaChatMessage extends BaseComponent {
  static get observedAttributes() {
    return ["role", "content", "timestamp", "model", "tokens", "streaming"];
  }

  constructor() {
    super();
    this.render();
  }

  connectedCallback() {
    super.connectedCallback();
    this.forwardSlots();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      this.forwardSlots();
    }
  }

  forwardSlots() {
    const actionsSlot = this.querySelector('[slot="actions"]');
    if (!actionsSlot) return;
    actionsSlot.setAttribute("slot", "actions");
    const target = this.shadowRoot?.querySelector(`${this.getTargetTag()}`);
    if (target && actionsSlot.parentElement !== target) {
      target.appendChild(actionsSlot);
    }
  }

  getTargetTag() {
    const role = this.getAttribute("role") || "assistant";
    return role === "user" ? "ollama-user-message" : "ollama-ai-response";
  }

  render() {
    const role = this.getAttribute("role") || "assistant";
    const content = this.getAttribute("content") || "";
    const timestamp = this.getAttribute("timestamp") || "";
    const model = this.getAttribute("model") || "";
    const tokens = this.getAttribute("tokens") || "";
    const streaming = this.hasAttribute("streaming");

    const component = this.getTargetTag();

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
        }
      </style>
      <${component}
        content="${this.escapeAttribute(content)}"
        ${timestamp ? `timestamp="${this.escapeAttribute(timestamp)}"` : ""}
        ${model ? `model="${this.escapeAttribute(model)}"` : ""}
        ${tokens ? `tokens="${this.escapeAttribute(tokens)}"` : ""}
        ${streaming ? "streaming" : ""}
      >
        <slot name="actions" slot="actions"></slot>
      </${component}>
    `;
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }
}

if (!customElements.get("ollama-chat-message")) {
  customElements.define("ollama-chat-message", OllamaChatMessage);
}

export { OllamaChatMessage };
