import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaChatInput extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-chat-input>',
      description: 'Message composer with textarea, action buttons, and upload controls.',
      dependencies: ['<ollama-textarea>', '<ollama-button>', '<ollama-icon>', '<ollama-tooltip>'],
      responsibilities: [
        'Provide auto-resizing textarea with validation + hint text (DR-1/DR-15).',
        'Include icon-first action buttons for uploads + tools (DR-1a).',
        'Handle keyboard shortcuts (Ctrl/Cmd + Enter send, Escape blur) and emit `send-message` events.',
        'Display live token counts + selected model context.'
      ]
    });
    logStubWarning('ollama-chat-input');
  }
}

if (!customElements.get('ollama-chat-input')) {
  customElements.define('ollama-chat-input', OllamaChatInput);
}

export { OllamaChatInput };
