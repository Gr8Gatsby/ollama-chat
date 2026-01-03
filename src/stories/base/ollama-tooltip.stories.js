import { html } from "lit";
import "../../frontend/components/base/ollama-button.js";
import "../../frontend/components/base/ollama-tooltip.js";
import "../../frontend/components/base/ollama-icon.js";

export default {
  title: "Base/Ollama Tooltip",
  component: "ollama-tooltip",
};

const buttonStyle =
  "display:inline-flex; gap: var(--spacing-md); align-items:center;";

export const Positions = () => html`
  <div style="display:flex; gap: var(--spacing-xl); align-items:center;">
    ${["top", "right", "bottom", "left"].map(
      (position) => html`
        <ollama-button variant="icon" label="Info" style=${buttonStyle}>
          <ollama-icon name="info"></ollama-icon>
          <ollama-tooltip position=${position}
            >Tooltip ${position}</ollama-tooltip
          >
        </ollama-button>
      `,
    )}
  </div>
`;
