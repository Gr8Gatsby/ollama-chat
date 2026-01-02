import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaChatContainer extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-chat-container>',
      description: 'Orchestrates the overall chat layout (sidebar, conversation feed, composer) and wires shared services.',
      dependencies: ['<ollama-button>', '<ollama-badge>', '<ollama-tooltip>', '<ollama-dialog>'],
      responsibilities: [
        'Provide responsive layout slots for sidebar, chat feed, and footer per DR-1.',
        'Coordinate global theme + locale switches (DR-4/DR-5).',
        'Own shell-level keyboard shortcuts and focus management.',
        'Bridge conversation + settings panels with WebSocket client state (DR-8/DR-13).'
      ]
    });
    logStubWarning('ollama-chat-container');
  }
}

if (!customElements.get('ollama-chat-container')) {
  customElements.define('ollama-chat-container', OllamaChatContainer);
}

export { OllamaChatContainer };
