import { BaseComponent } from "./base-component.js";

const ICON_CDN = "https://cdn.jsdelivr.net/npm/lucide-static@latest/icons";
const iconCache = new Map();
const iconRequests = new Map();

async function fetchIcon(name) {
  if (iconCache.has(name)) {
    return iconCache.get(name);
  }
  if (!iconRequests.has(name)) {
    iconRequests.set(
      name,
      fetch(`${ICON_CDN}/${name}.svg`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load icon ${name}`);
          }
          return res.text();
        })
        .then((svgText) => {
          iconCache.set(name, svgText);
          return svgText;
        })
        .catch((err) => {
          console.warn(`[ollama-icon] ${err.message}`);
          return null;
        })
        .finally(() => {
          iconRequests.delete(name);
        }),
    );
  }
  return iconRequests.get(name);
}

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
    return ["name", "size"];
  }

  constructor() {
    super();
    this.render();
    this.updateIcon();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      this.updateIcon();
    }
  }

  getSizeValue() {
    const sizeMap = {
      xs: "12",
      sm: "16",
      md: "20",
      lg: "24",
      xl: "32",
    };
    const size = this.getAttribute("size") || "md";
    return sizeMap[size] || sizeMap.md;
  }

  render() {
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

        .icon-wrapper svg {
          display: block;
        }
      </style>
      <div class="icon-wrapper" part="icon" aria-hidden="true">
      </div>
    `;

    const iconWrapper = this.shadowRoot.querySelector(".icon-wrapper");
    iconWrapper?.replaceChildren(this.createFallbackSvg(size));
  }

  createFallbackSvg(size) {
    const svg = this.createSvgElement({
      viewBox: `0 0 ${size} ${size}`,
      size,
    });
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    const radius = Number(size) / 2 - 2;
    circle.setAttribute("cx", `${size / 2}`);
    circle.setAttribute("cy", `${size / 2}`);
    circle.setAttribute("r", `${radius}`);
    circle.setAttribute("stroke-width", "2");
    circle.setAttribute("opacity", "0.3");
    svg.appendChild(circle);
    return svg;
  }

  createSvgElement({ viewBox, size }) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", `${size}px`);
    svg.setAttribute("height", `${size}px`);
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("fill", "none");
    return svg;
  }

  async updateIcon() {
    const iconName = this.getAttribute("name") || "help-circle";
    const iconWrapper = this.shadowRoot?.querySelector(".icon-wrapper");
    if (!iconWrapper) return;

    const svgText = await fetchIcon(iconName);
    if (!svgText) {
      iconWrapper.replaceChildren(this.createFallbackSvg(this.getSizeValue()));
      return;
    }

    let parsedSvg;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      parsedSvg = doc.querySelector("svg");
    } catch (error) {
      console.warn(`[ollama-icon] ${error.message}`);
    }

    if (!parsedSvg) {
      iconWrapper.replaceChildren(this.createFallbackSvg(this.getSizeValue()));
      return;
    }

    const size = this.getSizeValue();
    const svgEl = this.createSvgElement({
      viewBox: parsedSvg.getAttribute("viewBox") || "0 0 24 24",
      size,
    });
    Array.from(parsedSvg.childNodes).forEach((node) => {
      svgEl.appendChild(node.cloneNode(true));
    });
    iconWrapper.replaceChildren(svgEl);
  }
}

customElements.define("ollama-icon", OllamaIcon);
