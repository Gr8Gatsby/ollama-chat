import { html } from "lit";
import "../../frontend/components/base/ollama-code-block.js";

export default {
  title: "Base/Ollama Code Block",
  component: "ollama-code-block",
  args: {
    language: "js",
    code: "console.log('Hello from Ollama');",
  },
  argTypes: {
    language: { control: "text" },
    code: { control: "text" },
  },
};

const Template = ({ language, code }) => html`
  <ollama-code-block language=${language} code=${code}></ollama-code-block>
`;

export const Default = Template.bind({});
