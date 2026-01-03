import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-avatar.js";
import "../base/ollama-button.js";
import "../base/ollama-dropdown.js";
import "../base/ollama-icon.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";

class OllamaSidebarUser extends BaseComponent {
  static get observedAttributes() {
    return ["name", "email", "avatar", "logged-in"];
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

  get isLoggedIn() {
    return this.hasAttribute("logged-in");
  }

  attachEventListeners() {
    const settings = this.shadowRoot?.querySelector("[data-action='settings']");
    if (settings) {
      settings.addEventListener("click", () => {
        this.emit("settings");
      });
    }

    const auth = this.shadowRoot?.querySelector("[data-action='auth']");
    if (auth) {
      auth.addEventListener("click", () => {
        this.emit(this.isLoggedIn ? "logout" : "login");
      });
    }
  }

  render() {
    const name = this.getAttribute("name") || "User";
    const email = this.getAttribute("email") || "";
    const avatar = this.getAttribute("avatar");
    const authLabel = this.isLoggedIn ? "Log out" : "Log in";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          position: sticky;
          inset-block-end: 0;
          background: var(--color-bg-primary);
          padding-block-start: var(--spacing-sm);
          width: 100%;
        }

        .container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .trigger {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-lg);
          background: var(--color-bg-primary);
          cursor: pointer;
          width: 100%;
          border: none;
        }

        .name {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .menu-item {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .menu-item:hover {
          background: var(--color-bg-secondary);
        }
      </style>
      <div class="container">
        <ollama-dropdown position="top">
          <div slot="trigger" class="trigger">
            <ollama-avatar name="${name}" ${avatar ? `src="${avatar}"` : ""}></ollama-avatar>
            <div class="name">
              <ollama-text variant="label">${name}</ollama-text>
              ${email ? `<ollama-text variant="caption" color="muted">${email}</ollama-text>` : ""}
            </div>
          </div>
          <div class="menu">
            ${email ? `<ollama-text variant="caption" color="muted">${email}</ollama-text>` : ""}
            <div class="menu-item" data-action="upgrade">
              <ollama-text>Upgrade your plan</ollama-text>
              <ollama-icon name="sparkles" size="xs"></ollama-icon>
            </div>
            <div class="menu-item" data-action="settings">
              <ollama-text>Settings</ollama-text>
              <ollama-text variant="caption" color="muted">⌘,</ollama-text>
            </div>
            <div class="menu-item" data-action="auth">
              <ollama-text>${authLabel}</ollama-text>
            </div>
          </div>
        </ollama-dropdown>
      </div>
    `;

    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-sidebar-user")) {
  customElements.define("ollama-sidebar-user", OllamaSidebarUser);
}

export { OllamaSidebarUser };
