import { html } from "lit";
import "../../frontend/components/features/ollama-conversation-item.js";

export default {
  title: "Feature/Ollama Conversation Item",
  component: "ollama-conversation-item",
  args: {
    title: "Project kickoff",
    preview: "Outline milestones and action items",
    model: "llama3",
    timestamp: "2h ago",
    unreadCount: 2,
    selected: false,
  },
  argTypes: {
    title: { control: "text" },
    preview: { control: "text" },
    model: { control: "text" },
    timestamp: { control: "text" },
    unreadCount: { control: "number" },
    selected: { control: "boolean" },
  },
};

const Template = ({
  title,
  preview,
  model,
  timestamp,
  unreadCount,
  selected,
}) => html`
  <ollama-conversation-item
    conversation-id="conv-1"
    conversation-title=${title}
    preview=${preview}
    model=${model}
    timestamp=${timestamp}
    unread-count=${unreadCount}
    ?selected=${selected}
  ></ollama-conversation-item>
`;

export const Default = Template.bind({});

export const Selected = Template.bind({});
Selected.args = {
  selected: true,
  unreadCount: 0,
};
