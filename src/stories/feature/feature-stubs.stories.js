import { html, unsafeStatic } from "lit/static-html.js";
import "../../frontend/components/features/ollama-chat-container.js";
import "../../frontend/components/features/ollama-conversation-list.js";
import "../../frontend/components/features/ollama-conversation-item.js";
import "../../frontend/components/features/ollama-chat-input.js";
import "../../frontend/components/features/ollama-chat-message.js";
import "../../frontend/components/features/ollama-user-message.js";
import "../../frontend/components/features/ollama-ai-response.js";
import "../../frontend/components/features/ollama-model-selector.js";
import "../../frontend/components/features/ollama-message-actions.js";
import "../../frontend/components/features/ollama-settings-panel.js";

export default {
  title: "Feature/Stub Gallery",
  tags: ["skip-tests"],
};

const createStubStory = (tag) => {
  const safeTag = unsafeStatic(tag);
  const Story = () => html`<${safeTag}></${safeTag}>`;
  Story.storyName = `<${tag}>`;
  Story.parameters = {
    layout: "centered",
    controls: { disable: true },
  };
  return Story;
};

export const ChatContainer = createStubStory("ollama-chat-container");
export const ConversationList = createStubStory("ollama-conversation-list");
export const ConversationItem = createStubStory("ollama-conversation-item");
export const ChatInput = createStubStory("ollama-chat-input");
export const ChatMessage = createStubStory("ollama-chat-message");
export const UserMessage = createStubStory("ollama-user-message");
export const AiResponse = createStubStory("ollama-ai-response");
export const ModelSelector = createStubStory("ollama-model-selector");
export const MessageActions = createStubStory("ollama-message-actions");
export const SettingsPanel = createStubStory("ollama-settings-panel");
