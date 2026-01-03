import { html } from "lit";
import "../../frontend/components/features/ollama-file-tree.js";

const sampleTree = {
  name: "my-project",
  type: "directory",
  children: [
    { name: "index.html", type: "file", path: "index.html" },
    { name: "styles", type: "directory", children: [
      { name: "main.css", type: "file", path: "styles/main.css" }
    ] },
    { name: "src", type: "directory", children: [
      { name: "app.js", type: "file", path: "src/app.js" },
      { name: "data.json", type: "file", path: "src/data.json" }
    ] }
  ]
};

export default {
  title: "Feature/Ollama File Tree",
  component: "ollama-file-tree",
  args: {
    selected: "src/app.js",
  },
  argTypes: {
    selected: { control: "text" },
  },
};

const Template = ({ selected }) => html`
  <div style="max-width: 320px; border: 1px solid var(--color-border); padding: 8px;">
    <ollama-file-tree
      tree='${JSON.stringify(sampleTree)}'
      selected=${selected}
      expanded='["my-project","my-project/src","my-project/styles"]'
    ></ollama-file-tree>
  </div>
`;

export const Default = Template.bind({});
