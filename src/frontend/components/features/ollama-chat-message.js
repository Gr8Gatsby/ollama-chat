import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaChatMessage extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-chat-message>',
      description: 'Wrapper component responsible for rendering message metadata and delegating to user/AI variants.',
      dependencies: ['<ollama-icon>', '<ollama-badge>', '<ollama-tooltip>', '<ollama-spinner>'],
      responsibilities: [
        'Coordinate `<ollama-user-message>` vs `<ollama-ai-response>` rendering per DR-1b.',
        'Expose streaming + token usage indicators (DR-11, FR-1).',
        'Surface `<ollama-message-actions>` controls for copy/regenerate/delete.',
        'Emit message-level events (select, focus, action) for state management (DR-13).'
      ]
    });
    logStubWarning('ollama-chat-message');
  }
}

if (!customElements.get('ollama-chat-message')) {
  customElements.define('ollama-chat-message', OllamaChatMessage);
}

export { OllamaChatMessage };
