import { html } from "lit";
import "../../frontend/components/features/ollama-message-actions.js";

export default {
  title: "Feature/Ollama Message Actions",
  component: "ollama-message-actions",
  args: {
    disabled: false,
    busy: false,
  },
  argTypes: {
    disabled: { control: "boolean" },
    busy: { control: "boolean" },
  },
};

const Template = ({ disabled, busy }) => html`
  <ollama-message-actions
    ?disabled=${disabled}
    ?busy=${busy}
  ></ollama-message-actions>
`;

export const Default = Template.bind({});
