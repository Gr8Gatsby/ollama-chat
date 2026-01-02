import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaModelSelector extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-model-selector>',
      description: 'Dropdown for switching between available LLM models with capability indicators.',
      dependencies: ['<ollama-select>', '<ollama-badge>', '<ollama-tooltip>'],
      responsibilities: [
        'List models fetched from backend (FR-5) with size + capability metadata.',
        'Emit `model-change` events when selection updates, persisting per conversation.',
        'Indicate vision/file support to toggle upload options in `<ollama-chat-input>`. ',
        'Reflect localization + RTL layout for label/option text.'
      ]
    });
    logStubWarning('ollama-model-selector');
  }
}

if (!customElements.get('ollama-model-selector')) {
  customElements.define('ollama-model-selector', OllamaModelSelector);
}

export { OllamaModelSelector };
