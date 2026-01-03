import { describe, it, expect, beforeAll, afterEach } from "vitest";

beforeAll(async () => {
  await import("../../src/frontend/components/features/ollama-chat-container.js");
  await customElements.whenDefined("ollama-chat-container");
});

afterEach(() => {
  document.body.innerHTML = "";
});

const createContainer = () => {
  const Container = customElements.get("ollama-chat-container");
  return new Container();
};

describe("ollama-chat-container", () => {
  it("toggles sidebar-open when clicking the toggle control", async () => {
    const container = createContainer();
    document.body.appendChild(container);
    await Promise.resolve();

    expect(container.hasAttribute("sidebar-open")).toBe(false);

    const toggle = container.shadowRoot.querySelector(".sidebar-toggle");
    toggle.dispatchEvent(new Event("click", { bubbles: true, composed: true }));

    expect(container.hasAttribute("sidebar-open")).toBe(true);

    toggle.dispatchEvent(new Event("click", { bubbles: true, composed: true }));

    expect(container.hasAttribute("sidebar-open")).toBe(false);
  });

  it("closes sidebar when clicking the overlay", async () => {
    const container = createContainer();
    container.setAttribute("sidebar-open", "");
    document.body.appendChild(container);
    await Promise.resolve();

    const overlay = container.shadowRoot.querySelector(".sidebar-overlay");
    overlay.dispatchEvent(new Event("click", { bubbles: true, composed: true }));

    expect(container.hasAttribute("sidebar-open")).toBe(false);
  });
});
