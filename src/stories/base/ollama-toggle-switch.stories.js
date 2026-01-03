import { html } from "lit";
import "../../frontend/components/base/ollama-toggle-switch.js";

export default {
  title: "Base/Ollama Toggle Switch",
  component: "ollama-toggle-switch",
  args: {
    value: "left",
    leftLabel: "Chat",
    rightLabel: "Project",
  },
  argTypes: {
    value: { control: "select", options: ["left", "right"] },
    leftLabel: { control: "text" },
    rightLabel: { control: "text" },
  },
};

const Template = ({ value, leftLabel, rightLabel }) => html`
  <ollama-toggle-switch
    value=${value}
    left-label=${leftLabel}
    right-label=${rightLabel}
  ></ollama-toggle-switch>
`;

export const Default = Template.bind({});
