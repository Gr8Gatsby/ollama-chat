import { html } from "lit";
import "../../frontend/components/base/ollama-dialog.js";
import "../../frontend/components/base/ollama-button.js";
import "../../frontend/components/base/ollama-text.js";

export default {
  title: "Base/Ollama Dialog",
  component: "ollama-dialog",
  args: {
    open: true,
    title: "Dialog title",
  },
  argTypes: {
    open: { control: "boolean" },
    title: { control: "text" },
  },
};

const Template = ({ open, title }) => html`
  <ollama-dialog ?open=${open} title=${title} dismissible>
    <ollama-text>Dialog content goes here.</ollama-text>
    <div slot="footer">
      <ollama-button variant="secondary">Cancel</ollama-button>
      <ollama-button variant="primary">Confirm</ollama-button>
    </div>
  </ollama-dialog>
`;

export const Default = Template.bind({});
