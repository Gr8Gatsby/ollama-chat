import { BaseComponent } from "./base-component.js";

class OllamaAvatar extends BaseComponent {
  static get observedAttributes() {
    return ["name", "src", "size"];
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

  getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map((part) => part[0].toUpperCase());
    return initials.join("");
  }

  render() {
    const name = this.getAttribute("name") || "User";
    const src = this.getAttribute("src");
    const size = this.getAttribute("size") || "md";
    const sizeMap = { sm: 28, md: 36, lg: 48 };
    const dimension = sizeMap[size] || sizeMap.md;
    const initials = this.getInitials(name);

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: inline-flex;
          width: ${dimension}px;
          height: ${dimension}px;
        }

        .avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-family);
          font-size: ${dimension < 32 ? "0.65rem" : "0.75rem"};
          font-weight: 600;
          overflow: hidden;
          border: 1px solid var(--color-border);
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      </style>
      <div class="avatar" part="avatar" role="img" aria-label="${name}">
        ${src ? `<img src="${src}" alt="${name}">` : initials}
      </div>
    `;
  }
}

if (!customElements.get("ollama-avatar")) {
  customElements.define("ollama-avatar", OllamaAvatar);
}

export { OllamaAvatar };
