import { html } from 'lit';
import '../../frontend/components/base/ollama-icon.js';

const icons = ['send', 'trash-2', 'copy', 'settings', 'image'];

export default {
  title: 'Base/Ollama Icon',
  component: 'ollama-icon'
};

export const Gallery = () => html`
  <div style="display:flex; gap: var(--spacing-lg); flex-wrap: wrap;">
    ${icons.map(
      (name) => html`
        <div style="display:flex; flex-direction:column; align-items:center; gap: var(--spacing-sm);">
          <ollama-icon name=${name} size="lg"></ollama-icon>
          <span style="font-family: var(--font-family); font-size: var(--font-size-xs);">${name}</span>
        </div>
      `
    )}
  </div>
`;

export const Sizes = () => html`
  <div style="display:flex; gap: var(--spacing-lg); align-items:center;">
    ${['xs', 'sm', 'md', 'lg', 'xl'].map(
      (size) => html`
        <div style="text-align:center;">
          <ollama-icon name="send" size=${size}></ollama-icon>
          <div style="font-size: var(--font-size-xs);">${size}</div>
        </div>
      `
    )}
  </div>
`;
