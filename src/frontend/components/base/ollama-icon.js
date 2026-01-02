import { BaseComponent } from './base-component.js';

/**
 * <ollama-icon> - Lucide icon wrapper
 *
 * Attributes:
 *   name: Icon name from Lucide (required)
 *   size: Icon size - xs, sm, md, lg, xl (default: md)
 *
 * Example:
 *   <ollama-icon name="send" size="md"></ollama-icon>
 */
export class OllamaIcon extends BaseComponent {
  static get observedAttributes() {
    return ['name', 'size'];
  }

  constructor() {
    super();
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  getSizeValue() {
    const sizeMap = {
      'xs': '12',
      'sm': '16',
      'md': '20',
      'lg': '24',
      'xl': '32'
    };
    const size = this.getAttribute('size') || 'md';
    return sizeMap[size] || sizeMap.md;
  }

  render() {
    const iconName = this.getAttribute('name') || 'help-circle';
    const size = this.getSizeValue();

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        svg {
          width: ${size}px;
          height: ${size}px;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }
      </style>
      <svg>
        <use href="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${iconName}.svg#${iconName}"></use>
      </svg>
    `;
  }
}

customElements.define('ollama-icon', OllamaIcon);
