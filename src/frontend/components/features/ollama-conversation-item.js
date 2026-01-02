import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaConversationItem extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-conversation-item>',
      description: 'Represents a single conversation entry with title, model badge, and action menu.',
      dependencies: ['<ollama-button>', '<ollama-badge>', '<ollama-tooltip>'],
      responsibilities: [
        'Display conversation metadata (title, model, timestamp, token count).',
        'Expose actions (rename, duplicate, delete) via icon-first buttons (DR-1a).',
        'Announce selection state and unread status for assistive tech (DR-15).',
        'Emit semantic events (`conversation-selected`, `conversation-action`) to parent list.'
      ]
    });
    logStubWarning('ollama-conversation-item');
  }
}

if (!customElements.get('ollama-conversation-item')) {
  customElements.define('ollama-conversation-item', OllamaConversationItem);
}

export { OllamaConversationItem };
