import { html } from "lit";
import "../../frontend/components/base/ollama-select.js";

const options = html`
  <option value="turbo">gpt-4o-mini</option>
  <option value="vision">vision-pro</option>
  <option value="code">code-engine</option>
`;

export default {
  title: "Base/Ollama Select",
  component: "ollama-select",
  args: {
    value: "turbo",
    disabled: false,
    size: "md",
    label: "Model",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

const Template = ({ value, disabled, size, label }) => html`
  <ollama-select
    value=${value}
    size=${size}
    ?disabled=${disabled}
    label=${label}
  >
    ${options}
  </ollama-select>
`;

export const Default = Template.bind({});

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
};

export const Large = Template.bind({});
Large.args = {
  size: "lg",
};
