import "./components/features/ollama-chat-container.js";
import "./components/features/ollama-conversation-list.js";
import "./components/features/ollama-conversation-item.js";
import "./components/features/ollama-message-list.js";
import "./components/features/ollama-user-message.js";
import "./components/features/ollama-ai-response.js";
import "./components/features/ollama-chat-input.js";
import "./components/features/ollama-project-view.js";
import "./components/features/ollama-live-preview.js";
import "./components/features/ollama-sidebar-user.js";
import "./components/base/ollama-button.js";
import "./components/base/ollama-action-bar.js";
import "./components/base/ollama-confirm-dialog.js";
import "./components/base/ollama-icon.js";
import "./components/base/ollama-text.js";
import "./components/base/ollama-toggle-switch.js";
import { listModels, streamChat } from "./utils/ollama-client.js";
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  createMessage,
  deleteConversation,
  updateConversationTitle,
  logTokenUsage,
} from "./utils/backend-client.js";

const DEFAULT_MODELS = [{ label: "llama3", value: "llama3" }];
const DEFAULT_PREVIEW = `<!doctype html><html><body style="font-family: system-ui; padding: 24px;"><h2>Live preview</h2><p>Project preview area.</p></body></html>`;

class OllamaFrontendApp extends HTMLElement {
  constructor() {
    super();
    this.mode = "chat";
    this.sidebarOpen = true;
    this.models = DEFAULT_MODELS;
    this.activeModel = DEFAULT_MODELS[0].value;
    this.activeConversationId = "";
    this.conversations = [];
    this.messagesByConversation = {};
    this.editingConversationId = "";
    this.renameDrafts = {};
    this.projectExpanded =
      '["my-project","my-project/src","my-project/styles"]';
    this.projectSelected = "src/app.js";
    this.isStreaming = false;
    this.pendingDeleteConversation = null;
    this.renderQueued = false;
    this.abortController = null;
  }

  connectedCallback() {
    this.render();
    this.loadModels();
    this.loadConversations();
  }

  async loadModels() {
    try {
      const models = await listModels();
      if (models.length) {
        this.models = models.map((model) => ({
          label: model.label,
          value: model.value,
        }));
        this.activeModel = this.models[0].value;
        this.scheduleRender();
      }
    } catch (error) {
      console.warn("[frontend] Failed to load models:", error);
    }
  }

  scheduleRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.render();
    });
  }

  get activeMessages() {
    return this.messagesByConversation[this.activeConversationId] || [];
  }

  setMode(nextMode) {
    this.mode = nextMode;
    this.render();
  }

  async loadConversations() {
    try {
      const conversations = await fetchConversations();
      if (conversations.length) {
        this.conversations = conversations.map((item) => ({
          id: item.id,
          title: item.title || "New chat",
          model: item.model || this.activeModel,
          timestamp: item.updatedAt ? "Just now" : "",
          messageCount: item.messageCount || 0,
          tokenCount: item.tokenCount || 0,
          unread: 0,
        }));
        if (!this.activeConversationId && conversations[0]) {
          this.activeConversationId = conversations[0].id;
        }
        await this.loadMessages(this.activeConversationId);
        this.scheduleRender();
        return;
      }
    } catch (error) {
      console.warn("[frontend] Failed to load conversations:", error);
    }

    const fallbackId = await this.createConversationRecord({
      title: "New chat",
    });
    if (fallbackId) {
      this.conversations = [
        {
          id: fallbackId,
          title: "New chat",
          model: this.activeModel,
          timestamp: "Just now",
          messageCount: 0,
          tokenCount: 0,
          unread: 0,
        },
      ];
      this.messagesByConversation[fallbackId] = [];
      this.activeConversationId = fallbackId;
    }
    this.scheduleRender();
  }

  async createConversationRecord({ title } = {}) {
    try {
      return await createConversation({
        title: title || "New chat",
        model: this.activeModel,
      });
    } catch (error) {
      console.warn("[frontend] Failed to create conversation:", error);
      return null;
    }
  }

  async loadMessages(conversationId) {
    if (!conversationId) return;
    try {
      const messages = await fetchMessages(conversationId);
      this.messagesByConversation[conversationId] = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model || this.activeModel,
        timestamp: "Just now",
        tokens: msg.tokens && Number(msg.tokens) > 0 ? String(msg.tokens) : "",
      }));
    } catch (error) {
      console.warn("[frontend] Failed to load messages:", error);
    }
  }

  updateConversationMetrics(conversationId, tokenDelta = 0) {
    const conversation = this.conversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) return;
    conversation.timestamp = "Just now";
    conversation.messageCount = this.activeMessages.length;
    conversation.tokenCount =
      (conversation.tokenCount || 0) + (tokenDelta || 0);
  }

  appendMessage(conversationId, message) {
    if (!this.messagesByConversation[conversationId]) {
      this.messagesByConversation[conversationId] = [];
    }
    this.messagesByConversation[conversationId].push(message);
    this.scheduleRender();
  }

  updateLastAssistantMessage(conversationId, updater) {
    const messages = this.messagesByConversation[conversationId] || [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") {
        updater(messages[i]);
        break;
      }
    }
    this.scheduleRender();
  }

  async handleSend(message) {
    if (!message?.trim()) return;
    let conversationId = this.activeConversationId;
    if (!conversationId) {
      conversationId = await this.createConversationRecord({
        title: "New chat",
      });
      if (conversationId) {
        this.activeConversationId = conversationId;
      }
    }
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: "Just now",
      model: this.activeModel,
    };

    this.appendMessage(conversationId, userMessage);
    this.updateConversationMetrics(conversationId, 0);
    if (conversationId) {
      try {
        const messageId = await createMessage(conversationId, {
          role: "user",
          content: message,
          model: this.activeModel,
        });
        userMessage.id = messageId;
      } catch (error) {
        console.warn("[frontend] Failed to persist user message:", error);
      }
    }

    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: "Just now",
      model: this.activeModel,
      streaming: true,
    };

    this.appendMessage(conversationId, assistantMessage);
    this.isStreaming = true;
    this.scheduleRender();

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const payload = {
      model: this.activeModel,
      messages: this.activeMessages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
    };

    try {
      for await (const chunk of streamChat(payload, {
        signal: this.abortController.signal,
      })) {
        const content = chunk?.message?.content || "";
        if (content) {
          this.updateLastAssistantMessage(conversationId, (msg) => {
            msg.content += content;
          });
        }
        if (chunk?.done) {
          const totalTokens =
            (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0);
          this.updateLastAssistantMessage(conversationId, (msg) => {
            msg.streaming = false;
            msg.tokens = totalTokens ? String(totalTokens) : msg.tokens;
          });
          this.isStreaming = false;
          const assistantContent = this.activeMessages
            .filter((msg) => msg.role === "assistant")
            .slice(-1)[0]?.content;
          if (conversationId && assistantContent) {
            try {
              const messageId = await createMessage(conversationId, {
                role: "assistant",
                content: assistantContent,
                model: this.activeModel,
              });
              await logTokenUsage({
                messageId,
                conversationId,
                model: this.activeModel,
                promptTokens: chunk.prompt_eval_count || 0,
                completionTokens: chunk.eval_count || 0,
                totalTokens,
              });
              this.updateConversationMetrics(conversationId, totalTokens || 0);
            } catch (error) {
              console.warn(
                "[frontend] Failed to persist assistant message:",
                error,
              );
            }
          }
          this.scheduleRender();
        }
      }
    } catch (error) {
      console.error("[frontend] Chat stream failed:", error);
      this.updateLastAssistantMessage(conversationId, (msg) => {
        msg.streaming = false;
        msg.content = msg.content || "Unable to stream response.";
      });
      this.isStreaming = false;
      this.scheduleRender();
    }
  }

  attachListeners() {
    const chatInput = this.querySelector("ollama-chat-input");
    chatInput?.addEventListener("send", (event) => {
      this.handleSend(event.detail?.value);
    });
    chatInput?.addEventListener("model-change", (event) => {
      const value = event.detail?.value;
      if (value) {
        this.activeModel = value;
        this.scheduleRender();
      }
    });

    const toggle = this.querySelector("ollama-toggle-switch");
    toggle?.addEventListener("change", (event) => {
      const value = event.detail?.value;
      this.setMode(value === "right" ? "project" : "chat");
    });

    const container = this.querySelector("ollama-chat-container");
    container?.addEventListener("sidebar-toggle", (event) => {
      const open = event.detail?.open;
      this.sidebarOpen = Boolean(open);
      this.scheduleRender();
    });

    this.querySelectorAll("ollama-conversation-item").forEach((item) => {
      item.addEventListener("conversation-selected", (event) => {
        const id = event.detail?.id;
        if (!id) return;
        this.activeConversationId = id;
        this.loadMessages(id).then(() => this.scheduleRender());
      });
      item.addEventListener("conversation-rename", async (event) => {
        const id = event.detail?.id;
        if (!id) return;
        this.editingConversationId = id;
        this.scheduleRender();
      });
      item.addEventListener("conversation-rename-draft", (event) => {
        const id = event.detail?.id;
        if (!id) return;
        this.renameDrafts[id] = event.detail?.title ?? "";
      });
      item.addEventListener("conversation-rename-commit", async (event) => {
        const id = event.detail?.id;
        const nextTitle = event.detail?.title?.trim();
        if (!id) return;
        const conversation = this.conversations.find((item) => item.id === id);
        const currentTitle = conversation?.title || "New chat";
        if (!nextTitle || nextTitle === currentTitle) {
          this.editingConversationId = "";
          delete this.renameDrafts[id];
          this.scheduleRender();
          return;
        }
        conversation.title = nextTitle;
        this.editingConversationId = "";
        delete this.renameDrafts[id];
        this.scheduleRender();
        try {
          await updateConversationTitle(id, nextTitle);
        } catch (error) {
          console.warn("[frontend] Failed to rename conversation:", error);
          this.editingConversationId = id;
          this.renameDrafts[id] = nextTitle;
          this.scheduleRender();
        }
      });
      item.addEventListener("conversation-rename-cancel", () => {
        const id = this.editingConversationId;
        this.editingConversationId = "";
        if (id) {
          delete this.renameDrafts[id];
        }
        this.scheduleRender();
      });
      item.addEventListener("conversation-action", (event) => {
        const id = event.detail?.id;
        const action = event.detail?.action;
        if (!id || action !== "delete") return;
        this.pendingDeleteConversation = id;
        this.scheduleRender();
      });
    });

    const newChatButton = this.querySelector("[data-new-chat]");
    newChatButton?.addEventListener("click", async () => {
      const id = await this.createConversationRecord({ title: "New chat" });
      if (!id) return;
      this.conversations.unshift({
        id,
        title: "New chat",
        model: this.activeModel,
        timestamp: "Just now",
        messageCount: 0,
        tokenCount: 0,
        unread: 0,
      });
      this.activeConversationId = id;
      this.messagesByConversation[id] = [];
      this.scheduleRender();
    });

    const confirmDialog = this.querySelector("ollama-confirm-dialog");
    confirmDialog?.addEventListener("confirm", async () => {
      const id = this.pendingDeleteConversation;
      this.pendingDeleteConversation = null;
      if (!id) return;
      try {
        await deleteConversation(id);
        this.conversations = this.conversations.filter(
          (entry) => entry.id !== id,
        );
        delete this.messagesByConversation[id];
        if (this.activeConversationId === id) {
          const next = this.conversations[0];
          if (next) {
            this.activeConversationId = next.id;
            await this.loadMessages(next.id);
          } else {
            const newId = await this.createConversationRecord({
              title: "New chat",
            });
            if (newId) {
              this.conversations = [
                {
                  id: newId,
                  title: "New chat",
                  model: this.activeModel,
                  timestamp: "Just now",
                  messageCount: 0,
                  tokenCount: 0,
                  unread: 0,
                },
              ];
              this.activeConversationId = newId;
              this.messagesByConversation[newId] = [];
            }
          }
        }
        this.scheduleRender();
      } catch (error) {
        console.warn("[frontend] Failed to delete conversation:", error);
      }
    });
    confirmDialog?.addEventListener("cancel", () => {
      this.pendingDeleteConversation = null;
      this.scheduleRender();
    });

    const projectView = this.querySelector("ollama-project-view");
    if (projectView) {
      projectView.addEventListener("file-selected", (event) => {
        this.projectSelected = event.detail?.path || this.projectSelected;
        this.scheduleRender();
      });
      projectView.addEventListener("expanded-change", (event) => {
        const expanded = event.detail?.expanded || [];
        this.projectExpanded = JSON.stringify(expanded);
        this.scheduleRender();
      });
    }
  }

  renderMessages(messages) {
    if (!messages.length) {
      return "";
    }
    return messages
      .map((msg) => {
        if (msg.role === "user") {
          return `
            <ollama-user-message
              content="${this.escapeAttribute(msg.content)}"
              timestamp="${msg.timestamp || ""}"
              model="${msg.model || ""}"
              ${msg.tokens ? `tokens="${msg.tokens}"` : ""}
            ></ollama-user-message>
          `;
        }
        return `
          <ollama-ai-response
            content="${this.escapeAttribute(msg.content)}"
            timestamp="${msg.timestamp || ""}"
            model="${msg.model || ""}"
            ${msg.tokens ? `tokens="${msg.tokens}"` : ""}
            ${msg.streaming ? "streaming" : ""}
          ></ollama-ai-response>
        `;
      })
      .join("");
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }

  render() {
    const showProject = this.mode === "project";
    const modelOptions = JSON.stringify(this.models);
    const messages = this.activeMessages;
    const activeConversation =
      this.conversations.find(
        (entry) => entry.id === this.activeConversationId,
      ) || this.conversations[0];
    const chatLabel = activeConversation?.title || "Chat";
    const headerLabel = showProject ? `Project for ${chatLabel}` : chatLabel;
    const pendingConversation = this.pendingDeleteConversation
      ? this.conversations.find(
          (entry) => entry.id === this.pendingDeleteConversation,
        )
      : null;
    const deleteMessage = pendingConversation
      ? `Deleting the conversation '${pendingConversation.title || "Untitled chat"}' cannot be undone.`
      : "";

    this.innerHTML = `
      <ollama-chat-container ${
        !showProject && this.sidebarOpen ? "sidebar-open" : ""
      } ${showProject ? 'mode="project"' : 'mode="chat"'}>
        <nav
          slot="sidebar"
          aria-label="Conversations"
          style="display: flex; flex-direction: column; gap: 16px; height: 100%;"
        >
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <ollama-text variant="title" size="md" weight="semibold">
              Sidebar
            </ollama-text>
            <ollama-conversation-list>
              ${this.conversations
                .map(
                  (conversation) => `
                    <ollama-conversation-item
                      conversation-id="${conversation.id}"
                      conversation-title="${this.escapeAttribute(conversation.title)}"
                      message-count="${conversation.messageCount || 0}"
                      token-count="${conversation.tokenCount || 0}"
                      ${conversation.unread ? `unread-count="${conversation.unread}"` : ""}
                      ${
                        conversation.id === this.activeConversationId
                          ? "selected"
                          : ""
                      }
                      ${conversation.id === this.editingConversationId ? "editing" : ""}
                      ${
                        conversation.id === this.editingConversationId &&
                        this.renameDrafts[conversation.id]
                          ? `draft-title="${this.escapeAttribute(
                              this.renameDrafts[conversation.id],
                            )}"`
                          : ""
                      }
                    ></ollama-conversation-item>
                  `,
                )
                .join("")}
            </ollama-conversation-list>
          </div>
          <div style="margin-top: auto;">
            <ollama-sidebar-user name="Kevin Hill" logged-in></ollama-sidebar-user>
          </div>
        </nav>
        <header slot="header" aria-label="App bar">
          <ollama-text variant="label">${this.escapeAttribute(headerLabel)}</ollama-text>
        </header>
        ${
          showProject
            ? ""
            : `
              <div slot="header-actions" aria-label="Chat actions">
                <ollama-action-bar>
                  <ollama-button
                    class="sidebar-toggle"
                    variant="icon"
                    aria-label="Toggle sidebar"
                    aria-expanded="${this.sidebarOpen ? "true" : "false"}"
                    aria-controls="ollama-sidebar-panel"
                  >
                    <ollama-icon name="panel-left"></ollama-icon>
                    <ollama-tooltip>Toggle sidebar</ollama-tooltip>
                  </ollama-button>
                  <ollama-button
                    variant="icon"
                    aria-label="New chat"
                    data-new-chat
                  >
                    <ollama-icon name="message-square-plus"></ollama-icon>
                    <ollama-tooltip>New chat</ollama-tooltip>
                  </ollama-button>
                </ollama-action-bar>
              </div>
            `
        }
        <div slot="header-controls" aria-label="Header controls">
          <ollama-action-bar>
            <ollama-toggle-switch
              value="${showProject ? "right" : "left"}"
              left-label="Chat"
              right-label="Project"
            ></ollama-toggle-switch>
          </ollama-action-bar>
        </div>
        <main slot="main" aria-label="Workspace" style="height: 100%;">
          ${
            showProject
              ? `
                <div style="position: relative; height: 100%;">
                  <ollama-project-view
                    project-name="Demo Project"
                    description="Generated by Ollama Chat"
                    file-count="4"
                    selected-path="${this.projectSelected}"
                    file-language="js"
                    file-size="1.2 KB"
                    file-lines="24"
                    file-content="const greeting = 'Hello';\nconsole.log(greeting);\n"
                    expanded='${this.projectExpanded}'
                    tree='{"name":"my-project","type":"directory","children":[{"name":"index.html","type":"file","path":"index.html"},{"name":"styles","type":"directory","children":[{"name":"main.css","type":"file","path":"styles/main.css"}]},{"name":"src","type":"directory","children":[{"name":"app.js","type":"file","path":"src/app.js"},{"name":"data.json","type":"file","path":"src/data.json"}]}]}'
                  ></ollama-project-view>
                  <div style="margin-top: 12px; height: 240px;">
                    <ollama-live-preview
                      title="Preview"
                      srcdoc='${DEFAULT_PREVIEW}'
                    ></ollama-live-preview>
                  </div>
                </div>
              `
              : `
                <ollama-message-list auto-scroll>
                  ${this.renderMessages(messages)}
                </ollama-message-list>
              `
          }
        </main>
        ${
          showProject
            ? ""
            : `
              <footer slot="footer" aria-label="Chat composer" style="padding: 12px 16px;">
                <ollama-chat-input
                  placeholder="Send a message..."
                  model="${this.activeModel}"
                  model-options='${this.escapeAttribute(modelOptions)}'
                  ${this.isStreaming ? "busy" : ""}
                ></ollama-chat-input>
              </footer>
            `
        }
      </ollama-chat-container>
      <ollama-confirm-dialog
        ${this.pendingDeleteConversation ? "open" : ""}
        title="Delete conversation"
        message="${this.escapeAttribute(deleteMessage)}"
        confirm-label="Delete"
        cancel-label="Cancel"
      ></ollama-confirm-dialog>
    `;

    this.attachListeners();
  }
}

if (!customElements.get("ollama-frontend-app")) {
  customElements.define("ollama-frontend-app", OllamaFrontendApp);
}
