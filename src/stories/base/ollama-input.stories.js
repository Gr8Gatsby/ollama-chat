import { html } from "lit";
import "../../frontend/components/base/ollama-input.js";

export default {
  title: "Base/Ollama Input",
  component: "ollama-input",
  args: {
    label: "Message title",
    placeholder: "Enter message title",
    value: "",
    error: "",
    required: false,
    disabled: false,
    size: "md",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    required: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
  },
};

const Template = ({
  label,
  placeholder,
  value,
  error,
  required,
  disabled,
  size,
}) => html`
  <ollama-input
    label=${label}
    placeholder=${placeholder}
    value=${value}
    size=${size}
    ?required=${required}
    ?disabled=${disabled}
    error=${error}
  ></ollama-input>
`;

export const Default = Template.bind({});

export const WithError = Template.bind({});
WithError.args = {
  label: "Message title",
  value: "Incomplete value",
  error: "This field is required",
  required: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: "Disabled input",
  value: "Disabled value",
  disabled: true,
};
