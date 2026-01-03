import { html } from "lit";
import "../../frontend/components/features/ollama-chat-container.js";
import "../../frontend/components/base/ollama-button.js";
import "../../frontend/components/base/ollama-text.js";
import "../../frontend/components/base/ollama-icon.js";
import "../../frontend/components/base/ollama-tooltip.js";

export default {
  title: "Feature/Ollama Chat Container",
  args: {
    sidebarOpen: true,
  },
  argTypes: {
    sidebarOpen: { control: "boolean" },
  },
  parameters: {
    layout: "fullscreen",
  },
};

const Template = ({ sidebarOpen }) => html`
  <ollama-chat-container ?sidebar-open=${sidebarOpen}>
    <div slot="sidebar" style="padding: 16px;">
      <ollama-text
        variant="title"
        size="md"
        weight="semibold"
        style="margin-bottom: 12px;"
      >
        Sidebar
      </ollama-text>
      <ollama-button variant="secondary">New Chat</ollama-button>
    </div>
    <div slot="header">
      <ollama-text variant="title" size="md" weight="semibold">
        Chat Header
      </ollama-text>
    </div>
    <div slot="header-controls" style="display: inline-flex; gap: 8px;">
      <ollama-button variant="icon" aria-label="Search">
        <ollama-icon name="search"></ollama-icon>
        <ollama-tooltip>Search</ollama-tooltip>
      </ollama-button>
      <ollama-button variant="icon" aria-label="Settings">
        <ollama-icon name="settings"></ollama-icon>
        <ollama-tooltip>Settings</ollama-tooltip>
      </ollama-button>
    </div>
    <div slot="main" style="padding: 16px;">
      <ollama-text>Main chat area</ollama-text>
    </div>
    <div slot="footer" style="padding: 12px 16px;">
      <ollama-text variant="caption" color="muted">Footer slot</ollama-text>
    </div>
  </ollama-chat-container>
`;

export const Default = Template.bind({});
