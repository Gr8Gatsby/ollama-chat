import { html } from "lit";
import "../../frontend/components/features/ollama-live-preview.js";

const sampleDoc = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { font-family: system-ui, sans-serif; padding: 16px; }
      .card { padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Hello preview</h2>
      <button>Click me</button>
    </div>
  </body>
</html>`;

export default {
  title: "Feature/Ollama Live Preview",
  component: "ollama-live-preview",
  args: {
    title: "Preview",
    srcdoc: sampleDoc,
    error: "",
  },
  argTypes: {
    title: { control: "text" },
    srcdoc: { control: "text" },
    error: { control: "text" },
  },
};

const Template = ({ title, srcdoc, error }) => html`
  <div style="height: 420px;">
    <ollama-live-preview title=${title} srcdoc=${srcdoc} error=${error}></ollama-live-preview>
  </div>
`;

export const Default = Template.bind({});

export const ErrorState = Template.bind({});
ErrorState.args = {
  error: "Failed to execute script: Unexpected token in main.js",
};
