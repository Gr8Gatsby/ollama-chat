import { html } from "lit";
import "../../frontend/components/features/ollama-chat-container.js";
import "../../frontend/components/features/ollama-conversation-list.js";
import "../../frontend/components/features/ollama-conversation-item.js";
import "../../frontend/components/features/ollama-chat-input.js";
import "../../frontend/components/features/ollama-message-list.js";
import "../../frontend/components/features/ollama-user-message.js";
import "../../frontend/components/features/ollama-ai-response.js";
import "../../frontend/components/features/ollama-live-preview.js";
import "../../frontend/components/base/ollama-button.js";
import "../../frontend/components/base/ollama-icon.js";
import "../../frontend/components/base/ollama-text.js";
import "../../frontend/components/base/ollama-tooltip.js";

class AppShellPreviewDemo extends HTMLElement {
  constructor() {
    super();
    this.previewOpen = false;
  }

  connectedCallback() {
    this.render();
  }

  togglePreview(forceState) {
    this.previewOpen =
      typeof forceState === "boolean" ? forceState : !this.previewOpen;
    this.render();
  }

  attachListeners() {
    const openButton = this.querySelector(".preview-open");
    if (openButton) {
      openButton.onclick = () => this.togglePreview(true);
    }

    const closeButton = this.querySelector(".preview-close");
    if (closeButton) {
      closeButton.onclick = () => this.togglePreview(false);
    }
  }

  render() {
    this.innerHTML = `
      <ollama-chat-container sidebar-open>
        <nav slot="sidebar" aria-label="Conversations" style="padding: 16px;">
          <ollama-text variant="title" size="md" weight="semibold">
            Sidebar
          </ollama-text>
          <div style="margin: 12px 0;">
            <ollama-button variant="secondary">New Chat</ollama-button>
          </div>
          <ollama-conversation-list>
            <ollama-conversation-item
              conversation-id="conv-1"
              conversation-title="Project kickoff"
              preview="Outline milestones and action items"
              model="llama3"
              timestamp="2h ago"
              unread-count="2"
              selected
            ></ollama-conversation-item>
            <ollama-conversation-item
              conversation-id="conv-2"
              conversation-title="Design review"
              preview="Summarize visual polish requests"
              model="mistral"
              timestamp="Yesterday"
            ></ollama-conversation-item>
          </ollama-conversation-list>
        </nav>
        <header slot="header" aria-label="Chat header">
          <ollama-text variant="title" size="md" weight="semibold">
            Chat Header
          </ollama-text>
        </header>
        <div slot="header-controls" aria-label="Header controls">
          <ollama-button variant="icon" aria-label="Search">
            <ollama-icon name="search"></ollama-icon>
            <ollama-tooltip>Search</ollama-tooltip>
          </ollama-button>
          <ollama-button variant="icon" aria-label="Settings">
            <ollama-icon name="settings"></ollama-icon>
            <ollama-tooltip>Settings</ollama-tooltip>
          </ollama-button>
        </div>
        <main slot="main" aria-label="Chat messages" style="height: 100%;">
          ${
            this.previewOpen
              ? `
              <div style="position: relative; height: 100%;">
                <ollama-live-preview
                  title="Preview"
                  srcdoc='<!doctype html><html><body style="font-family: system-ui; padding: 24px;"><h2>Live preview</h2><p>Full preview replaces chat content.</p></body></html>'
                ></ollama-live-preview>
                <div style="position: absolute; top: 12px; right: 12px;">
                  <ollama-button class="preview-close" variant="icon" aria-label="Close preview">
                    <ollama-icon name="x" size="xs"></ollama-icon>
                    <ollama-tooltip>Close preview</ollama-tooltip>
                  </ollama-button>
                </div>
              </div>
              `
              : `
              <div style="padding: 12px 16px 0;">
                <ollama-button class="preview-open" variant="secondary">Preview</ollama-button>
              </div>
              <ollama-message-list auto-scroll>
                <ollama-user-message
                  content="Can you draft the first milestone summary? Make it short and clear."
                  timestamp="2m ago"
                  model="llama3"
                  tokens="128"
                ></ollama-user-message>
                <ollama-ai-response
                  content="Sure. Milestone 1 focuses on stable chat UI, core component coverage, and accessibility cleanup."
                  timestamp="Just now"
                  model="llama3"
                  tokens="512"
                  streaming
                ></ollama-ai-response>
              </ollama-message-list>
              `
          }
        </main>
        ${
          this.previewOpen
            ? ""
            : `
          <footer
            slot="footer"
            aria-label="Chat composer"
            style="padding: 12px 16px;"
          >
            <ollama-chat-input></ollama-chat-input>
          </footer>
        `
        }
      </ollama-chat-container>
    `;
    this.attachListeners();
  }
}

if (!customElements.get("ollama-app-shell-demo")) {
  customElements.define("ollama-app-shell-demo", AppShellPreviewDemo);
}

export default {
  title: "Feature/Application Layout",
  parameters: {
    layout: "fullscreen",
  },
};

export const AppShell = () =>
  html`<ollama-app-shell-demo></ollama-app-shell-demo>`;
