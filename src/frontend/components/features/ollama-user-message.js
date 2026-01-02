import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaUserMessage extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-user-message>',
      description: 'Formats user-authored content using constrained bubble layout and optional attachments.',
      dependencies: ['<ollama-badge>', '<ollama-tooltip>', '<ollama-message-actions>'],
      responsibilities: [
        'Render compact bubble aligned per DR-1b, respecting RTL direction (DR-5).',
        'Display metadata (timestamp, token count) via badges + tooltips.',
        'Integrate `<ollama-message-actions>` for edit/delete/copy flows.',
        'Emit events when user edits or resends a message.'
      ]
    });
    logStubWarning('ollama-user-message');
  }
}

if (!customElements.get('ollama-user-message')) {
  customElements.define('ollama-user-message', OllamaUserMessage);
}

export { OllamaUserMessage };
