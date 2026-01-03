import { html } from "lit";
import "../../frontend/components/base/ollama-dropdown.js";
import "../../frontend/components/base/ollama-button.js";

export default {
  title: "Base/Ollama Dropdown",
  component: "ollama-dropdown",
};

export const Default = () => html`
  <ollama-dropdown>
    <ollama-button slot="trigger" variant="secondary">Open menu</ollama-button>
    <div style="display: grid; gap: 8px;">
      <div>Menu item</div>
      <div>Another item</div>
    </div>
  </ollama-dropdown>
`;
