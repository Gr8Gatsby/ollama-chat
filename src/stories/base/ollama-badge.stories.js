import { html } from 'lit';
import '../../frontend/components/base/ollama-badge.js';

export default {
  title: 'Base/Ollama Badge',
  component: 'ollama-badge'
};

const variants = ['default', 'success', 'warning', 'error', 'info'];

export const Variants = () => html`
  <div style="display:flex; gap: var(--spacing-md); flex-wrap: wrap;">
    ${variants.map(
      (variant) => html`
        <ollama-badge variant=${variant}>${variant}</ollama-badge>
      `
    )}
  </div>
`;

export const Sizes = () => html`
  <div style="display:flex; gap: var(--spacing-md);">
    <ollama-badge size="sm">sm</ollama-badge>
    <ollama-badge size="md">md</ollama-badge>
    <ollama-badge size="lg">lg</ollama-badge>
  </div>
`;
