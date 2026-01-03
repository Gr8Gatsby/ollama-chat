import { html } from 'lit';
import '../../frontend/components/base/ollama-spinner.js';

export default {
  title: 'Base/Ollama Spinner',
  component: 'ollama-spinner'
};

export const Sizes = () => html`
  <div style="display:flex; gap: var(--spacing-xl); align-items:center;">
    ${['xs', 'sm', 'md', 'lg', 'xl'].map(
      (size) => html`
        <div style="display:flex; flex-direction:column; gap: var(--spacing-sm); align-items:center;">
          <ollama-spinner size=${size}></ollama-spinner>
          <span style="font-size: var(--font-size-xs); font-family: var(--font-family);">${size}</span>
        </div>
      `
    )}
  </div>
`;
