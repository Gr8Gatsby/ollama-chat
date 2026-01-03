import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";

let createSvgSpy;
let createFallbackSpy;
let OriginalDOMParser;

beforeAll(async () => {
  OriginalDOMParser = global.DOMParser;
  global.DOMParser = class {
    parseFromString(svgText) {
      const template = document.createElement("template");
      template.innerHTML = svgText;
      return template.content;
    }
  };
  const module =
    await import("../../src/frontend/components/base/ollama-icon.js");
  const { OllamaIcon } = module;
  createSvgSpy = vi.spyOn(OllamaIcon.prototype, "createSvgElement");
  createFallbackSpy = vi.spyOn(OllamaIcon.prototype, "createFallbackSvg");
  await customElements.whenDefined("ollama-icon");
});

afterAll(() => {
  createSvgSpy?.mockRestore();
  createFallbackSpy?.mockRestore();
  global.DOMParser = OriginalDOMParser;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const svgResponse = `<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>`;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// TODO: Re-enable once jsdom reliably supports cloning complex SVG nodes without DOMException: Unexpected attributes.
describe.skip("ollama-icon", () => {
  it("renders fetched svg content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => svgResponse,
    });

    const icon = document.createElement("ollama-icon");
    icon.setAttribute("name", "send");
    document.body.appendChild(icon);

    await flush();
    await flush();

    expect(createSvgSpy).toHaveBeenCalled();
    const args = createSvgSpy.mock.calls.at(-1)[0];
    expect(args.viewBox).toBe("0 0 24 24");
  });

  it("falls back when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false });

    const icon = document.createElement("ollama-icon");
    icon.setAttribute("name", "unknown");
    document.body.appendChild(icon);

    await flush();
    await flush();

    expect(createFallbackSpy).toHaveBeenCalled();
  });
});
