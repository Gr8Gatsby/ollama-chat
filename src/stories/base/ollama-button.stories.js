import { html } from 'lit';
import '../../frontend/components/base/ollama-button.js';
import '../../frontend/components/base/ollama-icon.js';
import '../../frontend/components/base/ollama-tooltip.js';

export default {
  title: 'Base/Ollama Button',
  component: 'ollama-button',
  args: {
    label: 'Send',
    variant: 'primary',
    size: 'md',
    disabled: false,
    ariaLabel: 'Send message'
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'icon']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    disabled: {
      control: 'boolean'
    },
    ariaLabel: {
      control: 'text'
    }
  }
};

const Template = ({ label, variant, size, disabled, ariaLabel }) => html`
  <ollama-button
    variant=${variant}
    size=${size}
    ?disabled=${disabled}
    aria-label=${ariaLabel}
  >
    ${variant === 'icon'
      ? html`
          <ollama-icon name="send"></ollama-icon>
          <ollama-tooltip>${ariaLabel}</ollama-tooltip>
        `
      : label}
  </ollama-button>
`;

export const Primary = Template.bind({});

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary',
  label: 'Cancel',
  ariaLabel: 'Cancel'
};

export const IconOnly = Template.bind({});
IconOnly.args = {
  variant: 'icon',
  ariaLabel: 'Delete message'
};

export const WithIcon = () => html`
  <ollama-button variant="primary" aria-label="Upload">
    <ollama-icon name="upload"></ollama-icon>
    Upload
  </ollama-button>
`;
