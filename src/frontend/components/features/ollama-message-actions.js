import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaMessageActions extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-message-actions>',
      description: 'Icon-first action bar for each message (copy, regenerate, delete, pin).',
      dependencies: ['<ollama-button>', '<ollama-icon>', '<ollama-tooltip>'],
      responsibilities: [
        'Implement DR-1a icon-first buttons with mandatory tooltips for discoverability.',
        'Emit semantic events (`copy-message`, `regenerate-message`, `delete-message`).',
        'Reflect message state (disabled while streaming, error states).',
        'Support keyboard access and announce actions to assistive tech (DR-15).'
      ]
    });
    logStubWarning('ollama-message-actions');
  }
}

if (!customElements.get('ollama-message-actions')) {
  customElements.define('ollama-message-actions', OllamaMessageActions);
}

export { OllamaMessageActions };
