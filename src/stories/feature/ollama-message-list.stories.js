import { html } from "lit";
import "../../frontend/components/features/ollama-message-list.js";
import "../../frontend/components/features/ollama-chat-message.js";

export default {
  title: "Feature/Ollama Message List",
  component: "ollama-message-list",
  args: {
    autoScroll: true,
  },
  argTypes: {
    autoScroll: { control: "boolean" },
  },
};

const Template = ({ autoScroll }) => html`
  <div style="height: 360px; border: 1px solid var(--color-border);">
    <ollama-message-list ?auto-scroll=${autoScroll}>
      <ollama-chat-message
        role="user"
        content="Can you summarize the release notes?"
        timestamp="2m ago"
        model="llama3"
        tokens="128"
      ></ollama-chat-message>
      <ollama-chat-message
        role="assistant"
        content="Sure. Here is a concise summary for the milestones."
        timestamp="Just now"
        model="llama3"
        tokens="512"
        streaming
      ></ollama-chat-message>
    </ollama-message-list>
  </div>
`;

export const Default = Template.bind({});

export const Empty = () => html`
  <div style="height: 240px; border: 1px solid var(--color-border);">
    <ollama-message-list></ollama-message-list>
  </div>
`;
