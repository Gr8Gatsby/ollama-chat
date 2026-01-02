import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaConversationList extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-conversation-list>',
      description: 'Sidebar list that displays and manages all user conversations with search/filter support.',
      dependencies: ['<ollama-button>', '<ollama-badge>', '<ollama-tooltip>'],
      responsibilities: [
        'Render conversation entries with unread counts + active state.',
        'Emit selection, creation, and context-menu events for parent container.',
        'Support keyboard navigation + virtualization for long lists (DR-15/DR-16).',
        'Integrate localization + RTL mirroring for metadata labels (DR-5).'
      ]
    });
    logStubWarning('ollama-conversation-list');
  }
}

if (!customElements.get('ollama-conversation-list')) {
  customElements.define('ollama-conversation-list', OllamaConversationList);
}

export { OllamaConversationList };
