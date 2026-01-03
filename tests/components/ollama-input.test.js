import { describe, it, expect, beforeAll, vi } from "vitest";

beforeAll(async () => {
  await import("../../src/frontend/components/base/ollama-input.js");
  await customElements.whenDefined("ollama-input");
});

const createInput = () => {
  const InputElement = customElements.get("ollama-input");
  return new InputElement();
};

describe("ollama-input", () => {
  it("binds localized placeholder text", async () => {
    const arabicPlaceholder = "أدخل رسالتك";
    const input = createInput();
    input.setAttribute("placeholder", arabicPlaceholder);
    document.body.appendChild(input);

    await Promise.resolve();
    const nativeInput = input.shadowRoot.querySelector("input");
    expect(nativeInput.placeholder).toBe(arabicPlaceholder);
  });

  it("applies lang/dir to internal input on locale change", async () => {
    const input = createInput();
    document.body.appendChild(input);

    window.dispatchEvent(
      new CustomEvent("localechange", {
        detail: { locale: "he", dir: "rtl" },
      }),
    );
    await Promise.resolve();

    const nativeInput = input.shadowRoot.querySelector("input");
    expect(nativeInput.getAttribute("dir")).toBe("rtl");
    expect(nativeInput.getAttribute("lang")).toBe("he");
  });

  it("ties error message to input via aria attributes", async () => {
    const input = createInput();
    input.setAttribute("error", "Required");
    input.setAttribute("required", "");
    document.body.appendChild(input);

    await Promise.resolve();

    const nativeInput = input.shadowRoot.querySelector("input");
    const errorMessage = input.shadowRoot.querySelector(".error-message");
    expect(nativeInput.getAttribute("aria-invalid")).toBe("true");
    expect(nativeInput.getAttribute("aria-describedby")).toBe(errorMessage.id);
    expect(errorMessage.getAttribute("role")).toBe("alert");
  });

  it("updates native value when attribute changes", async () => {
    const input = createInput();
    document.body.appendChild(input);

    input.setAttribute("value", "initial");
    await Promise.resolve();
    let nativeInput = input.shadowRoot.querySelector("input");
    expect(nativeInput.value).toBe("initial");

    input.setAttribute("value", "updated");
    await Promise.resolve();
    nativeInput = input.shadowRoot.querySelector("input");
    expect(nativeInput.value).toBe("updated");
  });

  it("emits input and change events with payloads", async () => {
    const input = createInput();
    document.body.appendChild(input);

    const inputHandler = vi.fn();
    const changeHandler = vi.fn();
    input.addEventListener("input", inputHandler);
    input.addEventListener("change", changeHandler);

    const nativeInput = input.shadowRoot.querySelector("input");
    nativeInput.value = "hello";
    nativeInput.dispatchEvent(new Event("input"));
    nativeInput.dispatchEvent(new Event("change"));

    expect(inputHandler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { value: "hello" } }),
    );
    expect(changeHandler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { value: "hello" } }),
    );
  });

  it("focus() and blur() proxy to native input", async () => {
    const input = createInput();
    document.body.appendChild(input);

    const nativeInput = input.shadowRoot.querySelector("input");
    const focusSpy = vi.spyOn(nativeInput, "focus");
    const blurSpy = vi.spyOn(nativeInput, "blur");

    input.focus();
    input.blur();

    expect(focusSpy).toHaveBeenCalled();
    expect(blurSpy).toHaveBeenCalled();
  });
});
