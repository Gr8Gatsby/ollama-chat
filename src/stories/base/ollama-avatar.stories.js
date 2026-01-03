import { html } from "lit";
import "../../frontend/components/base/ollama-avatar.js";

export default {
  title: "Base/Ollama Avatar",
  component: "ollama-avatar",
  args: {
    name: "Kevin Hill",
    size: "md",
    src: "",
  },
  argTypes: {
    name: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    src: { control: "text" },
  },
};

const Template = ({ name, size, src }) => html`
  <ollama-avatar name=${name} size=${size} src=${src}></ollama-avatar>
`;

export const Default = Template.bind({});
