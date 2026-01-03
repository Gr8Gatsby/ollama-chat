import '../src/frontend/components/base/ollama-button.js';
import '../src/frontend/components/base/ollama-icon.js';
import '../src/frontend/components/base/ollama-input.js';
import '../src/frontend/components/base/ollama-select.js';
import '../src/frontend/components/base/ollama-textarea.js';
import '../src/frontend/components/base/ollama-tooltip.js';
import '../src/frontend/components/base/ollama-spinner.js';
import '../src/frontend/components/base/ollama-badge.js';

const applyGlobals = ({ theme, direction, locale }) => {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', locale);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  window.dispatchEvent(
    new CustomEvent('localechange', { detail: { dir: direction, locale } })
  );
};

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'mirror',
      items: [
        { value: 'light', title: 'Light' },
        { value: 'dark', title: 'Dark' }
      ]
    }
  },
  direction: {
    name: 'Direction',
    description: 'Layout direction',
    defaultValue: 'ltr',
    toolbar: {
      icon: 'transfer',
      items: [
        { value: 'ltr', title: 'LTR' },
        { value: 'rtl', title: 'RTL' }
      ]
    }
  },
  locale: {
    name: 'Locale',
    description: 'Sets document lang attribute',
    defaultValue: 'en',
    toolbar: {
      icon: 'globe',
      items: [
        { value: 'en', title: 'English' },
        { value: 'ar', title: 'Arabic' },
        { value: 'he', title: 'Hebrew' }
      ]
    }
  }
};

/** @type { import('@storybook/web-components-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      options: {
        "app-light": { name: 'app-light', value: '#f5f5f5' },
        "app-dark": { name: 'app-dark', value: '#0f172a' }
      }
    },
    layout: 'centered',
    a11y: {
      test: 'todo'
    }
  },

  decorators: [
    (Story, context) => {
      applyGlobals(context.globals);
      return Story();
    }
  ],

  initialGlobals: {
    backgrounds: {
      value: 'app-light'
    }
  }
};

export default preview;
