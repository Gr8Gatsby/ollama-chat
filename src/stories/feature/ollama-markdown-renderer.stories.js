import { html } from "lit";
import "../../frontend/components/features/ollama-markdown-renderer.js";

export default {
  title: "Feature/Ollama Markdown Renderer",
  component: "ollama-markdown-renderer",
  args: {
    content:
      "# Release notes\n\nHere is a quick summary with **bold** text, *italic* emphasis, and `inline code`.\n\n- First milestone\n- Second milestone\n\n> This is a blockquote explaining the risks.\n\n[View details](https://example.com)\n\n```js\nconst answer = 42;\nconsole.log(answer);\n```\n\nAnd a follow-up paragraph.",
  },
  argTypes: {
    content: { control: "text" },
  },
};

const Template = ({ content }) => html`
  <ollama-markdown-renderer content=${content}></ollama-markdown-renderer>
`;

export const Default = Template.bind({});
