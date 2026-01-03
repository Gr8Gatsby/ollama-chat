import { html } from "lit";
import "../../frontend/components/features/ollama-chat-message.js";
import "../../frontend/components/features/ollama-message-actions.js";

export default {
  title: "Feature/Ollama Chat Message",
  component: "ollama-chat-message",
  args: {
    role: "user",
    content: "Can you list the top 3 milestones?",
    timestamp: "2m ago",
    tokens: "128",
    model: "llama3",
    streaming: false,
  },
  argTypes: {
    role: { control: "select", options: ["user", "assistant"] },
    content: { control: "text" },
    timestamp: { control: "text" },
    tokens: { control: "text" },
    model: { control: "text" },
    streaming: { control: "boolean" },
  },
};

const Template = ({
  role,
  content,
  timestamp,
  tokens,
  model,
  streaming,
}) => html`
  <ollama-chat-message
    role=${role}
    content=${content}
    timestamp=${timestamp}
    tokens=${tokens}
    model=${model}
    ?streaming=${streaming}
  ></ollama-chat-message>
`;

export const Default = Template.bind({});

export const Assistant = Template.bind({});
Assistant.args = {
  role: "assistant",
  content: "Sure! Here is a concise milestone breakdown.",
  streaming: true,
};
