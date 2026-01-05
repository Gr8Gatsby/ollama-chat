const DEFAULT_OLLAMA_BASE = window.OLLAMA_API_BASE || "http://localhost:11434";

function isVisionModel(modelName) {
  const visionKeywords = [
    "vision",
    "llava",
    "bakllava",
    "llama3.2-vision",
    "minicpm-v",
  ];
  const nameLower = modelName.toLowerCase();
  return visionKeywords.some((keyword) => nameLower.includes(keyword));
}

export async function listModels(baseUrl = DEFAULT_OLLAMA_BASE) {
  const response = await fetch(`${baseUrl}/api/tags`);
  if (!response.ok) {
    throw new Error(`Failed to load models: ${response.status}`);
  }
  const data = await response.json();
  const models = Array.isArray(data.models) ? data.models : [];
  return models.map((model) => ({
    label: model.name,
    value: model.name,
    size: model.size,
    modifiedAt: model.modified_at,
    supportsVision: isVisionModel(model.name),
  }));
}

async function* readNdjsonStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      yield JSON.parse(trimmed);
    }
  }

  const remaining = buffer.trim();
  if (remaining) {
    yield JSON.parse(remaining);
  }
}

function buildPrompt(messages = []) {
  return messages
    .map((msg) => {
      const role =
        msg.role === "assistant"
          ? "Assistant"
          : msg.role === "system"
            ? "System"
            : "User";
      return `${role}: ${msg.content}`;
    })
    .join("\n");
}

async function* streamGenerate({ model, messages }, { baseUrl, signal } = {}) {
  const prompt = buildPrompt(messages);
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Generate request failed: ${response.status}`);
  }

  for await (const chunk of readNdjsonStream(response)) {
    yield {
      message: { content: chunk.response || "" },
      done: chunk.done,
      prompt_eval_count: chunk.prompt_eval_count,
      eval_count: chunk.eval_count,
    };
  }
}

export async function* streamChat(
  { model, messages },
  { baseUrl = DEFAULT_OLLAMA_BASE, signal } = {},
) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (response.status === 404) {
    yield* streamGenerate({ model, messages }, { baseUrl, signal });
    return;
  }

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  yield* readNdjsonStream(response);
}
