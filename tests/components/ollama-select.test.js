import { describe, it, expect, beforeAll, vi } from "vitest";

beforeAll(async () => {
  await import("../../src/frontend/components/base/ollama-select.js");
  await customElements.whenDefined("ollama-select");
});

const createSelect = () => {
  const SelectElement = customElements.get("ollama-select");
  return new SelectElement();
};

describe("ollama-select", () => {
  it("inherits theme updates from global event", async () => {
    const select = createSelect();
    select.innerHTML = `<option value="test">Test</option>`;
    document.body.appendChild(select);

    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { theme: "dark" },
      }),
    );
    await Promise.resolve();

    expect(select.getAttribute("data-theme")).toBe("dark");
  });

  it("applies localization attributes to native select", async () => {
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ar");

    const select = createSelect();
    select.innerHTML = `<option value="1">١</option>`;
    document.body.appendChild(select);

    await Promise.resolve();

    const nativeSelect = select.shadowRoot.querySelector("select");
    expect(nativeSelect.getAttribute("dir")).toBe("rtl");
    expect(nativeSelect.getAttribute("lang")).toBe("ar");
  });

  it("sets value via attribute and emits change events", async () => {
    const select = createSelect();
    document.body.appendChild(select);
    await Promise.resolve();

    const nativeSelect = select.shadowRoot.querySelector("select");
    nativeSelect.innerHTML = `
      <option value="one">One</option>
      <option value="two">Two</option>
    `;

    select.value = "two";
    await Promise.resolve();
    expect(nativeSelect.value).toBe("two");

    const handler = vi.fn();
    select.addEventListener("change", handler);
    nativeSelect.value = "one";
    nativeSelect.dispatchEvent(new Event("change"));
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { value: "one" } }),
    );
  });

  it("reflects disabled state to aria-disabled", async () => {
    const select = createSelect();
    select.setAttribute("disabled", "");
    document.body.appendChild(select);
    await Promise.resolve();

    const nativeSelect = select.shadowRoot.querySelector("select");
    expect(nativeSelect.getAttribute("aria-disabled")).toBe("true");
  });
});
