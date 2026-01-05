export const BACKEND_BASE = window.BACKEND_API_BASE || "http://localhost:8082";

async function requestJson(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BACKEND_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchConversations() {
  const data = await requestJson("/api/conversations");
  return Array.isArray(data.conversations) ? data.conversations : [];
}

export async function createConversation({ title, model, id } = {}) {
  const data = await requestJson("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title, model, id }),
  });
  return data.id;
}

export async function fetchMessages(conversationId) {
  const data = await requestJson(
    `/api/conversations/${conversationId}/messages`,
  );
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function fetchConversationProject(conversationId) {
  const data = await requestJson(
    `/api/conversations/${conversationId}/project`,
  );
  return data.project || null;
}

export async function fetchProjectFiles(projectId) {
  const data = await requestJson(`/api/projects/${projectId}/files`);
  return Array.isArray(data.files) ? data.files : [];
}

export async function fetchProjectFile(projectId, path) {
  const data = await requestJson(
    `/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
  );
  return data.file || null;
}

export async function upsertProjectFile(projectId, payload) {
  const data = await requestJson(`/api/projects/${projectId}/files`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.file || null;
}

export async function updateProject(projectId, payload) {
  await requestJson(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createMessage(conversationId, message) {
  const data = await requestJson(
    `/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(message),
    },
  );
  return data.id;
}

export async function updateConversationTitle(conversationId, title) {
  await requestJson(`/api/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(conversationId) {
  await requestJson(`/api/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

export async function logTokenUsage(payload) {
  await requestJson("/api/token-usage", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
