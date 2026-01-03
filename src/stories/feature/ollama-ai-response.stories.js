import { html } from "lit";
import "../../frontend/components/features/ollama-ai-response.js";
import "../../frontend/components/features/ollama-message-actions.js";

export default {
  title: "Feature/Ollama AI Response",
  component: "ollama-ai-response",
  args: {
    content:
      "Here is a structured summary of the milestones and risks.\n\n```js\nconst milestones = ['UI polish', 'A11y fixes'];\n```\n\nLet me know if you want more detail.",
    timestamp: "Just now",
    tokens: "512",
    model: "llama3",
    streaming: false,
  },
  argTypes: {
    content: { control: "text" },
    timestamp: { control: "text" },
    tokens: { control: "text" },
    model: { control: "text" },
    streaming: { control: "boolean" },
  },
};

const Template = ({ content, timestamp, tokens, model, streaming }) => html`
  <ollama-ai-response
    content=${content}
    timestamp=${timestamp}
    tokens=${tokens}
    model=${model}
    ?streaming=${streaming}
  ></ollama-ai-response>
`;

export const Default = Template.bind({});

export const Streaming = Template.bind({});
Streaming.args = {
  streaming: true,
};
