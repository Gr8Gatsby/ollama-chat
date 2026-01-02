import { FeatureStubComponent, renderStubPlaceholder, logStubWarning } from './feature-stub-helpers.js';

class OllamaSettingsPanel extends FeatureStubComponent {
  constructor() {
    super();
    renderStubPlaceholder(this, {
      title: '<ollama-settings-panel>',
      description: 'Modal dialog that surfaces theme, language, and model preferences plus accessibility toggles.',
      dependencies: ['<ollama-dialog>', '<ollama-input>', '<ollama-select>', '<ollama-button>', '<ollama-tooltip>'],
      responsibilities: [
        'Wrap content inside accessible dialog with focus trapping + Escape handling (DR-15).',
        'Expose controls for theme (DR-4), language (DR-5), and model defaults (FR-5).',
        'Persist updates to shared state/localStorage and emit `settings-change` events.',
        'Provide contextual help/tooltips for advanced options.'
      ]
    });
    logStubWarning('ollama-settings-panel');
  }
}

if (!customElements.get('ollama-settings-panel')) {
  customElements.define('ollama-settings-panel', OllamaSettingsPanel);
}

export { OllamaSettingsPanel };
