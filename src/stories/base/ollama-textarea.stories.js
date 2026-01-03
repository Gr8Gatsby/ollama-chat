import { html } from "lit";
import "../../frontend/components/base/ollama-textarea.js";

export default {
  title: "Base/Ollama Textarea",
  component: "ollama-textarea",
  args: {
    label: "Task description",
    placeholder: "Share more details about your task",
    value: "",
    rows: 4,
    required: false,
    disabled: false,
    error: "",
  },
};

const Template = ({
  label,
  placeholder,
  value,
  rows,
  required,
  disabled,
  error,
}) => html`
  <ollama-textarea
    label=${label}
    placeholder=${placeholder}
    rows=${rows}
    value=${value}
    ?required=${required}
    ?disabled=${disabled}
    error=${error}
  ></ollama-textarea>
`;

export const Default = Template.bind({});

export const WithValue = Template.bind({});
WithValue.args = {
  label: "Task description",
  value: "Line one\nLine two",
  rows: 6,
};

export const ErrorState = Template.bind({});
ErrorState.args = {
  label: "Task description",
  required: true,
  error: "Description is required",
};
