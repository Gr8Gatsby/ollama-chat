import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-tooltip.js";

class OllamaChatContainer extends BaseComponent {
  static get observedAttributes() {
    return ["sidebar-open", "mode"];
  }

  constructor() {
    super();
    this.sidebarOpen = this.hasAttribute("sidebar-open");
    this.handleShadowClick = (event) => {
      const path = event.composedPath();
      const hitToggle = path.some((node) =>
        node?.classList?.contains("sidebar-toggle"),
      );
      if (hitToggle) {
        event.stopPropagation();
        this.toggleSidebar();
      }
    };
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === "sidebar-open") {
        this.sidebarOpen = this.hasAttribute("sidebar-open");
      }
      this.render();
    }
  }

  toggleSidebar(forceState) {
    const nextState =
      typeof forceState === "boolean" ? forceState : !this.sidebarOpen;
    this.sidebarOpen = nextState;
    if (nextState) {
      this.setAttribute("sidebar-open", "");
    } else {
      this.removeAttribute("sidebar-open");
    }
    this.emit("sidebar-toggle", { open: nextState });
  }

  attachEventListeners() {
    if (!this.shadowRoot) return;
    this.shadowRoot.removeEventListener("click", this.handleShadowClick, true);
    this.shadowRoot.addEventListener("click", this.handleShadowClick, true);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          height: 100%;
          background: var(--color-bg-primary);
        }

        .layout {
          display: grid;
          grid-template-columns: 0px 1fr;
          grid-template-rows: auto 1fr auto;
          height: 100%;
          min-height: 100vh;
          transition: grid-template-columns var(--transition-normal);
        }

        .sidebar-overlay {
          display: none;
        }

        .sidebar {
          grid-row: 1 / span 3;
          background: var(--color-bg-secondary);
          border-right: 1px solid var(--color-border);
          overflow: hidden;
        }

        :host([sidebar-open]) .layout {
          grid-template-columns: var(--sidebar-width, 280px) 1fr;
        }

        .header {
          grid-column: 2;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-primary);
        }

        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding: var(--spacing-sm) var(--spacing-md);
        }

        .header-left {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          min-width: 0;
        }

        .header-actions {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .header-title {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .header-controls {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          min-width: 0;
        }

        .sidebar-toggle {
          width: 32px;
          height: 32px;
          border-radius: 16px;
        }

        .main {
          grid-column: 2;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: var(--color-bg-primary);
        }

        .footer {
          grid-column: 2;
          background: var(--color-bg-primary);
          border-top: 1px solid var(--color-border);
        }

        @media (max-width: 960px) {
          .layout {
            grid-template-columns: 0px 1fr;
          }

          .sidebar {
            display: block;
            position: relative;
            inset: auto;
            width: auto;
            z-index: auto;
            box-shadow: none;
          }

          .sidebar-overlay {
            display: none;
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 9;
          }

          :host([sidebar-open]) .sidebar {
            display: block;
          }

          :host([sidebar-open]) .sidebar-overlay {
            display: none;
          }

          .header,
          .main,
          .footer {
            grid-column: 2;
          }
        }
      </style>
      <div class="layout" part="layout" role="application">
        <div class="sidebar-overlay" part="sidebar-overlay" aria-hidden="true"></div>
        <aside
          class="sidebar"
          part="sidebar"
          id="ollama-sidebar-panel"
        >
          <slot name="sidebar"></slot>
        </aside>
        <header class="header" part="header">
          <div class="header-inner">
            <div class="header-left">
              <div class="header-actions">
                <slot name="header-actions"></slot>
              </div>
            </div>
            <div class="header-title">
              <slot name="header"></slot>
            </div>
            <div class="header-controls">
              <slot name="header-controls"></slot>
            </div>
          </div>
        </header>
        <main class="main" part="main">
          <slot name="main"></slot>
        </main>
        <footer class="footer" part="footer">
          <slot name="footer"></slot>
        </footer>
      </div>
    `;
    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-chat-container")) {
  customElements.define("ollama-chat-container", OllamaChatContainer);
}

export { OllamaChatContainer };
