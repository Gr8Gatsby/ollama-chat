import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-button.js";
import "../base/ollama-icon.js";
import "../base/ollama-text.js";
import "../base/ollama-tooltip.js";

class OllamaLivePreview extends BaseComponent {
  static get observedAttributes() {
    return ["src", "srcdoc", "title", "error", "chromeless"];
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

  connectedCallback() {
    super.connectedCallback();
    this.attachEventListeners();
  }

  attachEventListeners() {
    const reloadButton = this.shadowRoot?.querySelector(".reload-button");
    if (reloadButton && !this._reloadHandler) {
      this._reloadHandler = () => this.reload();
      reloadButton.addEventListener("click", this._reloadHandler);
    }
  }

  reload() {
    const iframe = this.shadowRoot?.querySelector("iframe");
    if (!iframe) return;

    const src = this.getAttribute("src");
    const srcdoc = this.getAttribute("srcdoc");

    if (src) {
      // For src, we reload by appending a timestamp
      const url = new URL(src, window.location.origin);
      url.searchParams.set("t", Date.now().toString());
      iframe.src = url.toString();
    } else if (srcdoc) {
      iframe.srcdoc = srcdoc;
    }

    this.emit("preview-reload");
  }

  captureScreenshot() {
    const iframe = this.shadowRoot?.querySelector("iframe");
    if (!iframe)
      return Promise.resolve({
        dataUrl: null,
        error: "Preview iframe not found.",
      });
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) {
      return this.captureViaSrcdoc(iframe);
    }

    return this.loadHtml2Canvas().then((html2canvas) => {
      if (!html2canvas) {
        return {
          dataUrl: null,
          error: "html2canvas failed to load.",
        };
      }
      return html2canvas(doc.body, {
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: doc.documentElement?.scrollWidth || iframe.clientWidth,
        windowHeight: doc.documentElement?.scrollHeight || iframe.clientHeight,
      })
        .then((canvas) => ({
          dataUrl: canvas.toDataURL("image/png"),
          error: "",
        }))
        .catch((error) => ({
          dataUrl: null,
          error: error?.message || "html2canvas failed to render.",
        }));
    });
  }

  loadHtml2Canvas() {
    if (window.html2canvas) {
      return Promise.resolve(window.html2canvas);
    }
    if (this._html2canvasPromise) {
      return this._html2canvasPromise;
    }
    this._html2canvasPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.onload = () => resolve(window.html2canvas || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
    return this._html2canvasPromise;
  }

  async captureViaSrcdoc(iframe) {
    const src = iframe.getAttribute("src");
    if (!src) {
      return { dataUrl: null, error: "Preview document not accessible." };
    }
    try {
      const response = await fetch(src);
      if (!response.ok) {
        return {
          dataUrl: null,
          error: `Failed to load preview HTML (${response.status}).`,
        };
      }
      const html = await response.text();
      const originalSrc = src;
      iframe.removeAttribute("src");
      iframe.setAttribute("srcdoc", html);
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 1500);
        iframe.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
      const doc = iframe.contentDocument;
      if (!doc || !doc.body) {
        iframe.setAttribute("src", originalSrc);
        iframe.removeAttribute("srcdoc");
        return { dataUrl: null, error: "Preview document not accessible." };
      }
      await this.waitForPreviewReady(doc);
      const html2canvas = await this.loadHtml2Canvas();
      if (!html2canvas) {
        iframe.setAttribute("src", originalSrc);
        iframe.removeAttribute("srcdoc");
        return { dataUrl: null, error: "html2canvas failed to load." };
      }
      const canvas = await html2canvas(doc.body, {
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: doc.documentElement?.scrollWidth || iframe.clientWidth,
        windowHeight: doc.documentElement?.scrollHeight || iframe.clientHeight,
      });
      const dataUrl = canvas.toDataURL("image/png");
      iframe.setAttribute("src", originalSrc);
      iframe.removeAttribute("srcdoc");
      return { dataUrl, error: "" };
    } catch (error) {
      return {
        dataUrl: null,
        error: error?.message || "Preview document not accessible.",
      };
    }
  }

  async waitForPreviewReady(doc) {
    try {
      if (doc.fonts?.ready) {
        await doc.fonts.ready;
      }
    } catch {}

    const images = Array.from(doc.images || []);
    if (images.length) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
        ),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  render() {
    const title = this.getAttribute("title") || "Live preview";
    const src = this.getAttribute("src") || "";
    const srcdoc = this.getAttribute("srcdoc") || "";
    const error = this.getAttribute("error") || "";
    const chromeless = this.hasAttribute("chromeless");

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          height: 100%;
          background: var(--color-bg-primary);
        }

        :host(:not([chromeless])) {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-bottom: 1px solid var(--color-border);
        }

        :host([chromeless]) .header {
          display: none;
        }

        .frame {
          position: relative;
          height: ${chromeless ? "100%" : "calc(100% - 40px)"};
        }

        iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: white;
        }

        .error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          background: rgba(255, 255, 255, 0.9);
          text-align: center;
          padding: var(--spacing-lg);
        }

        .reload-button {
          width: 28px;
          height: 28px;
          border-radius: 14px;
        }
      </style>
      <div class="header">
        <ollama-text variant="label">${title}</ollama-text>
        <ollama-button class="reload-button" variant="icon" aria-label="Reload preview">
          <ollama-icon name="refresh-cw" size="xs"></ollama-icon>
          <ollama-tooltip>Reload</ollama-tooltip>
        </ollama-button>
      </div>
      <div class="frame">
        <iframe
          title="${this.escapeAttribute(title)}"
          sandbox="allow-scripts allow-same-origin"
          ${src ? `src="${this.escapeAttribute(src)}"` : `srcdoc="${this.escapeAttribute(srcdoc)}"`}
        ></iframe>
        ${
          error
            ? `<div class="error" role="alert">
                 <ollama-text variant="label">Preview error</ollama-text>
                 <ollama-text variant="caption" color="muted">${error}</ollama-text>
               </div>`
            : ""
        }
      </div>
    `;

    this.attachEventListeners();
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }
}

if (!customElements.get("ollama-live-preview")) {
  customElements.define("ollama-live-preview", OllamaLivePreview);
}

export { OllamaLivePreview };
