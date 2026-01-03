import { html } from "lit";
import "../../frontend/components/features/ollama-conversation-list.js";
import "../../frontend/components/features/ollama-conversation-item.js";

export default {
  title: "Feature/Ollama Conversation List",
  component: "ollama-conversation-list",
  args: {
    emptyTitle: "No conversations",
    emptyDescription: "Start a new chat to see it listed here.",
  },
  argTypes: {
    emptyTitle: { control: "text" },
    emptyDescription: { control: "text" },
  },
};

const Template = ({ emptyTitle, emptyDescription }) => html`
  <div style="max-width: 320px;">
    <ollama-conversation-list
      empty-title=${emptyTitle}
      empty-description=${emptyDescription}
    >
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
        unread-count="0"
      ></ollama-conversation-item>
      <ollama-conversation-item
        conversation-id="conv-3"
        conversation-title="Bug triage"
        preview="List crashes and next steps"
        model="llama3"
        timestamp="3d ago"
      ></ollama-conversation-item>
    </ollama-conversation-list>
  </div>
`;

export const Default = Template.bind({});

export const Empty = () => html`
  <div style="max-width: 320px;">
    <ollama-conversation-list></ollama-conversation-list>
  </div>
`;
