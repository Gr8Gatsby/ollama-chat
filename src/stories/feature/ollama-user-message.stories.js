import { html } from "lit";
import "../../frontend/components/features/ollama-user-message.js";
import "../../frontend/components/features/ollama-message-actions.js";

export default {
  title: "Feature/Ollama User Message",
  component: "ollama-user-message",
  args: {
    content: "Summarize the main goals for the release notes.",
    timestamp: "2m ago",
    tokens: "128",
    model: "llama3",
  },
  argTypes: {
    content: { control: "text" },
    timestamp: { control: "text" },
    tokens: { control: "text" },
    model: { control: "text" },
  },
};

const Template = ({ content, timestamp, tokens, model }) => html`
  <ollama-user-message
    content=${content}
    timestamp=${timestamp}
    tokens=${tokens}
    model=${model}
  ></ollama-user-message>
`;

export const Default = Template.bind({});
