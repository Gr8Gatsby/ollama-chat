import { html } from "lit";
import "../../frontend/components/features/ollama-settings-panel.js";

export default {
  title: "Feature/Ollama Settings Panel",
  component: "ollama-settings-panel",
  args: {
    open: true,
    theme: "light",
    language: "en",
    model: "llama3",
  },
  argTypes: {
    open: { control: "boolean" },
    theme: { control: "text" },
    language: { control: "text" },
    model: { control: "text" },
  },
};

const Template = ({ open, theme, language, model }) => html`
  <ollama-settings-panel
    ?open=${open}
    theme=${theme}
    language=${language}
    model=${model}
  ></ollama-settings-panel>
`;

export const Default = Template.bind({});
