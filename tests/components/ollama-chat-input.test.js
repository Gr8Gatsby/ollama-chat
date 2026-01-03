import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

beforeAll(async () => {
  await import("../../src/frontend/components/features/ollama-chat-input.js");
  await customElements.whenDefined("ollama-chat-input");
});

afterEach(() => {
  document.body.innerHTML = "";
});

const createComposer = () => {
  const Composer = customElements.get("ollama-chat-input");
  return new Composer();
};

const clickSendButton = (composer) => {
  const button = composer.shadowRoot.querySelector(".send-button");
  button.click();
};

describe("ollama-chat-input", () => {
  it("emits send event with payload when clicking the send button", async () => {
    const composer = createComposer();
    document.body.appendChild(composer);
    composer.setAttribute("value", "Ship it");
    await Promise.resolve();

    const handler = vi.fn();
    composer.addEventListener("send", handler);

    clickSendButton(composer);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ value: "Ship it", source: "button" }),
      }),
    );
  });

  it("emits send via keyboard shortcut (Ctrl/Cmd + Enter)", async () => {
    const composer = createComposer();
    document.body.appendChild(composer);

    const textarea = composer.shadowRoot.querySelector("ollama-textarea");
    const nativeTextarea = textarea.shadowRoot.querySelector("textarea");
    const handler = vi.fn();
    composer.addEventListener("send", handler);

    nativeTextarea.value = "Hello world";
    nativeTextarea.dispatchEvent(
      new Event("input", { bubbles: true, composed: true }),
    );
    nativeTextarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
        composed: true,
      }),
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          value: "Hello world",
          source: "keyboard",
        }),
      }),
    );
  });

  it("omits token counter display in the composer footer", async () => {
    const composer = createComposer();
    composer.setAttribute("token-limit", "5");
    composer.setAttribute("value", "one two three four six");
    document.body.appendChild(composer);
    await Promise.resolve();

    const counter = composer.shadowRoot.querySelector(".token-count");
    expect(counter).toBeNull();
  });

  it("emits action events when clicking attachment buttons", async () => {
    const composer = createComposer();
    document.body.appendChild(composer);

    const handler = vi.fn();
    composer.addEventListener("action", handler);

    const actionButton = composer.shadowRoot.querySelector(".action-button");
    actionButton.dispatchEvent(
      new CustomEvent("click", { bubbles: true, composed: true }),
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ id: "image" }),
      }),
    );
  });

  it("disables tools and send button when busy", async () => {
    const composer = createComposer();
    composer.setAttribute("busy", "");
    composer.setAttribute("value", "processing");
    document.body.appendChild(composer);
    await Promise.resolve();

    const sendButton = composer.shadowRoot.querySelector(".send-button");
    expect(sendButton.hasAttribute("disabled")).toBe(true);

    const tool = composer.shadowRoot.querySelector(".action-button");
    expect(tool.hasAttribute("disabled")).toBe(true);
  });

  it("emits model-change when selecting a new model", async () => {
    const composer = createComposer();
    composer.setAttribute(
      "model-options",
      JSON.stringify([
        { label: "llama3", value: "llama3" },
        { label: "turbo", value: "turbo" },
      ]),
    );
    composer.setAttribute("model", "llama3");
    document.body.appendChild(composer);
    await Promise.resolve();

    const handler = vi.fn();
    composer.addEventListener("model-change", handler);

    const modelSelect = composer.shadowRoot.querySelector(".model-select");
    const nativeSelect = modelSelect.shadowRoot.querySelector("select");
    nativeSelect.value = "turbo";
    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ value: "turbo" }),
      }),
    );
  });
});
