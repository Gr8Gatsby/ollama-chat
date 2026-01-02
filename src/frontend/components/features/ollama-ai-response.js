import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaAiResponse extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-ai-response>',
      description: 'Handles streaming AI output, markdown rendering, and code blocks for assistant messages.',
      dependencies: ['<ollama-icon>', '<ollama-spinner>', '<ollama-badge>', '<ollama-tooltip>'],
      responsibilities: [
        'Render markdown progressively and delegate code blocks to `<ollama-code-block>` once available (DR-1b).',
        'Show model badges + token usage, respecting icon-first patterns (DR-3).',
        'Display streaming indicator + error recovery states tied to WebSocket events (DR-11/DR-12).',
        'Surface `<ollama-message-actions>` for copy/regenerate/delete operations.'
      ]
    });
    logStubWarning('ollama-ai-response');
  }
}

if (!customElements.get('ollama-ai-response')) {
  customElements.define('ollama-ai-response', OllamaAiResponse);
}

export { OllamaAiResponse };
