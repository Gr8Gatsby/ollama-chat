import { html } from "lit";
import "../../frontend/components/features/ollama-model-selector.js";

export default {
  title: "Feature/Ollama Model Selector",
  component: "ollama-model-selector",
  args: {
    value: "llama3",
    label: "Model",
  },
  argTypes: {
    value: { control: "text" },
    label: { control: "text" },
  },
};

const Template = ({ value, label }) => html`
  <ollama-model-selector
    value=${value}
    label=${label}
    models='[
      {"value":"llama3","label":"llama3","size":"8B","capabilities":["chat"]},
      {"value":"mistral","label":"mistral","size":"7B","capabilities":["chat","code"]},
      {"value":"llava","label":"llava","size":"13B","capabilities":["vision"]}
    ]'
  ></ollama-model-selector>
`;

export const Default = Template.bind({});
