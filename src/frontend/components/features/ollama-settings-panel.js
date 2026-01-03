import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-dialog.js";
import "../base/ollama-select.js";
import "../base/ollama-text.js";
import "../base/ollama-button.js";

class OllamaSettingsPanel extends BaseComponent {
  static get observedAttributes() {
    return ["open", "theme", "language", "model", "themes", "languages", "models"];
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

  getOptionList(attr, fallback) {
    const raw = this.getAttribute(attr);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : fallback;
    } catch (error) {
      console.warn(`<ollama-settings-panel> invalid ${attr}`, error);
      return fallback;
    }
  }

  attachEventListeners() {
    const themeSelect = this.shadowRoot?.querySelector(".theme-select");
    const languageSelect = this.shadowRoot?.querySelector(".language-select");
    const modelSelect = this.shadowRoot?.querySelector(".model-select");
    const dialog = this.shadowRoot?.querySelector("ollama-dialog");

    const emitChange = () => {
      this.emit("settings-change", {
        theme: this.getAttribute("theme") || "",
        language: this.getAttribute("language") || "",
        model: this.getAttribute("model") || "",
      });
    };

    if (themeSelect) {
      themeSelect.addEventListener("change", (event) => {
        const value = event.detail?.value ?? "";
        this.setAttribute("theme", value);
        emitChange();
      });
    }

    if (languageSelect) {
      languageSelect.addEventListener("change", (event) => {
        const value = event.detail?.value ?? "";
        this.setAttribute("language", value);
        emitChange();
      });
    }

    if (modelSelect) {
      modelSelect.addEventListener("change", (event) => {
        const value = event.detail?.value ?? "";
        this.setAttribute("model", value);
        emitChange();
      });
    }

    if (dialog) {
      dialog.addEventListener("close", () => {
        this.removeAttribute("open");
      });
    }
  }

  render() {
    const open = this.hasAttribute("open");
    const theme = this.getAttribute("theme") || "light";
    const language = this.getAttribute("language") || "en";
    const model = this.getAttribute("model") || "llama3";

    const themes = this.getOptionList("themes", [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
      { value: "ocean", label: "Ocean" },
    ]);

    const languages = this.getOptionList("languages", [
      { value: "en", label: "English" },
      { value: "es", label: "Spanish" },
      { value: "ar", label: "Arabic" },
    ]);

    const models = this.getOptionList("models", [
      { value: "llama3", label: "llama3" },
      { value: "mistral", label: "mistral" },
    ]);

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
      </style>
      <ollama-dialog
        ${open ? "open" : ""}
        title="Settings"
        aria-label="Settings"
        dismissible
      >
        <div class="section">
          <ollama-text variant="label">Theme</ollama-text>
          <ollama-select
            class="theme-select"
            value="${theme}"
            aria-label="Theme"
          >
            ${themes
              .map(
                (option) =>
                  `<option value="${option.value}">${option.label}</option>`,
              )
              .join("")}
          </ollama-select>
        </div>
        <div class="section">
          <ollama-text variant="label">Language</ollama-text>
          <ollama-select
            class="language-select"
            value="${language}"
            aria-label="Language"
          >
            ${languages
              .map(
                (option) =>
                  `<option value="${option.value}">${option.label}</option>`,
              )
              .join("")}
          </ollama-select>
        </div>
        <div class="section">
          <ollama-text variant="label">Default Model</ollama-text>
          <ollama-select
            class="model-select"
            value="${model}"
            aria-label="Default model"
          >
            ${models
              .map(
                (option) =>
                  `<option value="${option.value}">${option.label}</option>`,
              )
              .join("")}
          </ollama-select>
        </div>
        <div slot="footer">
          <ollama-button variant="secondary">Close</ollama-button>
          <ollama-button variant="primary">Save</ollama-button>
        </div>
      </ollama-dialog>
    `;

    this.attachEventListeners();
  }
}

if (!customElements.get("ollama-settings-panel")) {
  customElements.define("ollama-settings-panel", OllamaSettingsPanel);
}

export { OllamaSettingsPanel };
