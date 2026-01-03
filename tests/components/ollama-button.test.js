import { describe, it, expect, beforeAll, vi } from "vitest";
import { axe } from "jest-axe";

beforeAll(async () => {
  await import("../../src/frontend/components/base/ollama-button.js");
  await customElements.whenDefined("ollama-button");
});

const createButton = () => {
  const ButtonElement = customElements.get("ollama-button");
  return new ButtonElement();
};

describe("ollama-button", () => {
  it("syncs theme with document root", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    const button = createButton();
    button.textContent = "Send";
    document.body.appendChild(button);

    await Promise.resolve();

    expect(button.getAttribute("data-theme")).toBe("dark");
  });

  it("applies localization when localechange fires", async () => {
    const button = createButton();
    button.textContent = "إرسال";
    document.body.appendChild(button);

    window.dispatchEvent(
      new CustomEvent("localechange", {
        detail: { locale: "ar", dir: "rtl" },
      }),
    );
    await Promise.resolve();

    const nativeButton = button.shadowRoot.querySelector("button");
    expect(button.getAttribute("lang")).toBe("ar");
    expect(nativeButton.getAttribute("dir")).toBe("rtl");
  });

  it("has no basic accessibility violations", async () => {
    const button = createButton();
    button.textContent = "Send";
    document.body.appendChild(button);

    await Promise.resolve();
    const results = await axe(button);
    expect(results.violations).toHaveLength(0);
  });

  it("emits click event when enabled", async () => {
    const button = createButton();
    button.textContent = "Send";
    document.body.appendChild(button);

    const handler = vi.fn();
    button.addEventListener("click", handler, { once: true });
    button.shadowRoot.querySelector("button").click();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual(
      expect.objectContaining({ originalEvent: expect.any(MouseEvent) }),
    );
  });

  it("does not emit click event when disabled", async () => {
    const button = createButton();
    button.setAttribute("disabled", "");
    document.body.appendChild(button);

    const handler = vi.fn();
    button.addEventListener("click", handler);
    button.shadowRoot.querySelector("button").click();

    expect(handler).not.toHaveBeenCalled();
  });
});
