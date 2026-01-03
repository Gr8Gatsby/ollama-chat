import { html } from "lit";
import "../../frontend/components/features/ollama-file-display.js";

export default {
  title: "Feature/Ollama File Display",
  component: "ollama-file-display",
  args: {
    path: "src/app.js",
    language: "js",
    size: "1.2 KB",
    lines: "24",
    content: "const greeting = 'Hello';\nconsole.log(greeting);\n",
    loading: false,
  },
  argTypes: {
    path: { control: "text" },
    language: { control: "text" },
    size: { control: "text" },
    lines: { control: "text" },
    content: { control: "text" },
    loading: { control: "boolean" },
  },
};

const Template = ({ path, language, size, lines, content, loading }) => html`
  <div style="height: 320px;">
    <ollama-file-display
      path=${path}
      language=${language}
      size=${size}
      lines=${lines}
      content=${content}
      ?loading=${loading}
    ></ollama-file-display>
  </div>
`;

export const Default = Template.bind({});
