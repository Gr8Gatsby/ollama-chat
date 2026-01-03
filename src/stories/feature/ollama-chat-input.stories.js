import { html } from "lit";
import "../../frontend/components/features/ollama-chat-input.js";
import "../../frontend/components/base/ollama-badge.js";

export default {
  title: "Feature/Ollama Chat Input",
  args: {
    placeholder: "Send a message…",
    label: "",
    value: "",
    disabled: false,
    busy: false,
    tokenLimit: 120,
    modelLabel: "Model: llama3",
    uploadActions: [
      { id: "image", icon: "image", label: "Media", tooltip: "Upload image" },
      { id: "file", icon: "paperclip", label: "Files", tooltip: "Attach file" },
    ],
  },
  argTypes: {
    tokenLimit: { control: { type: "number", min: 0, step: 10 } },
    disabled: { control: "boolean" },
    busy: { control: "boolean" },
  },
  parameters: {
    layout: "fullscreen",
  },
};

const Template = ({
  placeholder,
  value,
  tokenLimit,
  disabled,
  busy,
  modelLabel,
  uploadActions,
}) => html`
  <ollama-chat-input
    placeholder=${placeholder}
    value=${value}
    token-limit=${tokenLimit}
    ?disabled=${disabled}
    ?busy=${busy}
    upload-actions=${JSON.stringify(uploadActions)}
  >
    <span slot="model-info">${modelLabel}</span>
  </ollama-chat-input>
`;

export const Default = Template.bind({});

export const Busy = Template.bind({});
Busy.args = {
  busy: true,
  value: "Generating response for the current prompt…",
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
  value: "Connection lost",
  modelLabel: "Offline",
};

export const CustomActions = Template.bind({});
CustomActions.args = {
  uploadActions: [
    {
      id: "camera",
      icon: "camera",
      label: "Screenshot",
      tooltip: "Capture screenshot",
    },
    { id: "code", icon: "code", label: "Logs", tooltip: "Attach log" },
  ],
};
