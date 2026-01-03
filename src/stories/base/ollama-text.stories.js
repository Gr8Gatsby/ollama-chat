import { html } from 'lit';
import '../../frontend/components/base/ollama-text.js';

export default {
  title: 'Base/Ollama Text',
  component: 'ollama-text',
  args: {
    variant: 'body',
    size: 'md',
    weight: 'regular',
    color: 'primary',
    text: 'Quick brown fox'
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['body', 'label', 'caption', 'title']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    weight: {
      control: 'select',
      options: ['regular', 'medium', 'semibold', 'bold']
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'muted']
    },
    text: {
      control: 'text'
    }
  }
};

const Template = ({ variant, size, weight, color, text }) => html`
  <ollama-text variant=${variant} size=${size} weight=${weight} color=${color}>
    ${text}
  </ollama-text>
`;

export const Playground = Template.bind({});

export const Variants = () => html`
  <div style="display: grid; gap: 8px;">
    <ollama-text variant="title">Section Title</ollama-text>
    <ollama-text variant="label">Field Label</ollama-text>
    <ollama-text variant="body">Body copy for longer text blocks.</ollama-text>
    <ollama-text variant="caption" color="muted">Caption or helper text.</ollama-text>
  </div>
`;
