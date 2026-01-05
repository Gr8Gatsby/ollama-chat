import { WebSocketServer } from "ws";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { initDatabase, closeDatabase } from "./db/init.js";

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || "/data/ollama-chat.db";

// Initialize database
let db;
try {
  db = initDatabase(DB_PATH);
} catch (err) {
  console.error("[ERROR] Failed to initialize database:", err);
  process.exit(1);
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

const PREVIEW_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function sendJson(res, status, payload) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

function contentTypeForPath(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "text/plain; charset=utf-8";
}

function sanitizePreviewPath(path) {
  const cleaned = path.replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..")) return "";
  return cleaned;
}

function getPreviewEntry(projectId) {
  const manifest = getProjectFile(projectId, "project.manifest.json");
  if (!manifest?.content) return "index.html";
  try {
    const parsed = JSON.parse(manifest.content);
    return parsed?.preview?.entry || "index.html";
  } catch (error) {
    return "index.html";
  }
}

function normalizePreviewHtml(projectId, html, filePaths = []) {
  if (!html) return "";
  const baseTag = `<base href="/api/projects/${projectId}/preview/">`;
  const proxyScript = `<script>
(() => {
  const originalFetch = window.fetch;
  const isAbsolute = (url) => /^https?:\\/\\//i.test(url);
  const shouldProxy = (url) => {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.origin !== window.location.origin;
    } catch {
      return false;
    }
  };
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    if (url && isAbsolute(url) && shouldProxy(url)) {
      const proxied = \`/api/proxy?url=\${encodeURIComponent(url)}\`;
      return originalFetch(proxied, init);
    }
    return originalFetch(input, init);
  };
})();
</script>`;
  const errorScript = `<script>
(() => {
  const postError = (payload) => {
    try {
      window.parent?.postMessage({ type: "ollama.preview.error", payload }, "*");
    } catch {}
  };
  window.addEventListener("error", (event) => {
    const target = event.target;
    if (target?.tagName === "SCRIPT" || target?.tagName === "LINK") {
      const url = target.src || target.href || "unknown";
      postError({ kind: "resource", message: "Failed to load resource", url });
      return;
    }
    postError({
      kind: "error",
      message: event.message || "Script error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    postError({
      kind: "promise",
      message: event.reason?.message || String(event.reason || "Unhandled rejection"),
    });
  });
})();
</script>`;
  let output = html;
  const hasFetchWrapper = output.includes("window.fetch =");
  if (!/<base\s/i.test(output)) {
    output = output.replace(
      /<head([^>]*)>/i,
      (match) =>
        `${match}\n    ${baseTag}\n    ${proxyScript}\n    ${errorScript}`,
    );
  } else {
    if (!hasFetchWrapper) {
      output = output.replace(
        /<head([^>]*)>/i,
        (match) => `${match}\n    ${proxyScript}`,
      );
    }
    output = output.replace(
      /<head([^>]*)>/i,
      (match) => `${match}\n    ${errorScript}`,
    );
  }
  const fileSet = new Set(filePaths);
  const fallbackMap = {
    "main.js": "src/main.js",
    "app.js": "src/main.js",
    "style.css": "styles.css",
  };
  output = output.replace(
    /(src|href)=["']([^"']+)["']/gi,
    (match, attr, rawPath) => {
      if (!rawPath || /^(https?:|data:|mailto:|tel:|#)/i.test(rawPath)) {
        return match;
      }
      if (rawPath.startsWith("/api/")) {
        return match;
      }
      let normalized = rawPath.replace(/^\/+/, "");
      if (fileSet.size) {
        if (!fileSet.has(normalized)) {
          if (fallbackMap[normalized] && fileSet.has(fallbackMap[normalized])) {
            normalized = fallbackMap[normalized];
          } else if (!normalized.includes("/")) {
            const candidates = filePaths.filter((p) =>
              p.endsWith(`/${normalized}`),
            );
            if (candidates.length === 1) {
              normalized = candidates[0];
            }
          }
        }
      }
      return `${attr}="${normalized}"`;
    },
  );
  return output;
}

async function proxyRequest(res, targetUrl) {
  let url;
  try {
    url = new URL(targetUrl);
  } catch {
    res.writeHead(400, PREVIEW_HEADERS);
    res.end("Invalid URL");
    return;
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    res.writeHead(400, PREVIEW_HEADERS);
    res.end("Unsupported protocol");
    return;
  }
  try {
    const response = await fetch(url.toString(), { method: "GET" });
    const contentType = response.headers.get("content-type") || "text/plain";
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, {
      ...PREVIEW_HEADERS,
      "Content-Type": contentType,
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, PREVIEW_HEADERS);
    res.end("Proxy request failed");
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function formatConversationRow(row) {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preview: row.preview || "",
    messageCount: row.message_count || 0,
    tokenCount: row.token_count || 0,
  };
}

function listConversations(limit = 50, offset = 0) {
  const stmt = db.prepare(`
    SELECT
      c.id,
      c.title,
      c.model,
      c.created_at,
      c.updated_at,
      (
        SELECT content
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) AS preview,
      (
        SELECT COUNT(1)
        FROM messages
        WHERE conversation_id = c.id
      ) AS message_count,
      (
        SELECT COALESCE(SUM(total_tokens), 0)
        FROM token_usage
        WHERE conversation_id = c.id
      ) AS token_count
    FROM conversations c
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(limit, offset).map(formatConversationRow);
}

function listMessages(conversationId) {
  const stmt = db.prepare(`
    SELECT
      id,
      role,
      content,
      model,
      created_at,
      (
        SELECT COALESCE(SUM(total_tokens), 0)
        FROM token_usage
        WHERE message_id = messages.id
      ) AS token_count
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `);
  return stmt.all(conversationId).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    model: row.model,
    createdAt: row.created_at,
    tokens: row.token_count || 0,
  }));
}

function ensureConversation({ id, title, model }) {
  const now = Date.now();
  const conversationId = id || randomUUID();
  const stmt = db.prepare(`
    INSERT INTO conversations (id, title, model, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(conversationId, title || "New chat", model || "llama3", now, now);
  return conversationId;
}

function touchConversation(conversationId) {
  const stmt = db.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `);
  stmt.run(Date.now(), conversationId);
}

function createMessage({ conversationId, role, content, model }) {
  const messageId = randomUUID();
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(messageId, conversationId, role, content, model || null, Date.now());
  touchConversation(conversationId);
  return messageId;
}

function updateConversationTitle(conversationId, title) {
  const stmt = db.prepare(`
    UPDATE conversations
    SET title = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(title, Date.now(), conversationId);
}

function deleteConversation(conversationId) {
  const stmt = db.prepare(`
    DELETE FROM conversations
    WHERE id = ?
  `);
  return stmt.run(conversationId);
}

function getConversation(conversationId) {
  const stmt = db.prepare(`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `);
  return stmt.get(conversationId);
}

function getProjectByConversation(conversationId) {
  const stmt = db.prepare(`
    SELECT id, conversation_id, name, description, created_at, updated_at
    FROM projects
    WHERE conversation_id = ?
    LIMIT 1
  `);
  return stmt.get(conversationId);
}

function createProject({ conversationId, name, description }) {
  const projectId = randomUUID();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO projects (id, conversation_id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    projectId,
    conversationId,
    name || "Project",
    description || "",
    now,
    now,
  );
  return projectId;
}

function ensureProject(conversationId) {
  const existing = getProjectByConversation(conversationId);
  if (existing) return existing;
  const convo = getConversation(conversationId);
  const name = convo?.title || "Project";
  const projectId = createProject({
    conversationId,
    name,
    description: "Generated by Ollama Chat",
  });
  return (
    getProjectByConversation(conversationId) || {
      id: projectId,
      conversation_id: conversationId,
      name,
      description: "Generated by Ollama Chat",
      created_at: Date.now(),
      updated_at: Date.now(),
    }
  );
}

function countProjectFiles(projectId) {
  const stmt = db.prepare(`
    SELECT COUNT(1) AS count
    FROM project_files
    WHERE project_id = ?
  `);
  return stmt.get(projectId)?.count || 0;
}

function listProjectFiles(projectId) {
  const stmt = db.prepare(`
    SELECT id, path, language, size, created_at, updated_at
    FROM project_files
    WHERE project_id = ?
    ORDER BY path ASC
  `);
  return stmt.all(projectId).map((row) => ({
    id: row.id,
    path: row.path,
    language: row.language,
    size: row.size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function getProjectFile(projectId, path) {
  const stmt = db.prepare(`
    SELECT id, path, content, language, size, created_at, updated_at
    FROM project_files
    WHERE project_id = ? AND path = ?
    LIMIT 1
  `);
  const row = stmt.get(projectId, path);
  if (!row) return null;
  return {
    id: row.id,
    path: row.path,
    content: row.content,
    language: row.language,
    size: row.size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function upsertProjectFile({ projectId, path, content, language }) {
  const now = Date.now();
  const size = Buffer.byteLength(content || "", "utf8");
  const stmt = db.prepare(`
    INSERT INTO project_files (id, project_id, path, content, language, size, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, path) DO UPDATE SET
      content = excluded.content,
      language = excluded.language,
      size = excluded.size,
      updated_at = excluded.updated_at
  `);
  const fileId = randomUUID();
  stmt.run(
    fileId,
    projectId,
    path,
    content || "",
    language || "text",
    size,
    now,
    now,
  );
  return getProjectFile(projectId, path);
}

function updateProject(projectId, { name, description }) {
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE projects
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        updated_at = ?
    WHERE id = ?
  `);
  stmt.run(name || null, description || null, now, projectId);
}

function addTokenUsage({
  messageId,
  conversationId,
  model,
  promptTokens,
  completionTokens,
  totalTokens,
}) {
  const stmt = db.prepare(`
    INSERT INTO token_usage (
      message_id,
      conversation_id,
      model,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    messageId,
    conversationId,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    Date.now(),
  );
}

// Create HTTP server for health checks + API
const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    const requestedHeaders = req.headers["access-control-request-headers"];
    res.writeHead(204, {
      ...JSON_HEADERS,
      "Access-Control-Allow-Headers":
        requestedHeaders || JSON_HEADERS["Access-Control-Allow-Headers"],
    });
    res.end();
    return;
  }

  if (req.url === "/health") {
    return sendJson(res, 200, { status: "ok", timestamp: Date.now() });
  }

  if (req.url?.startsWith("/api/conversations")) {
    const [path, query] = req.url.split("?");
    const parts = path.split("/").filter(Boolean);

    if (req.method === "GET" && parts.length === 2) {
      const params = new URLSearchParams(query || "");
      const limit = Number(params.get("limit") || 50);
      const offset = Number(params.get("offset") || 0);
      return sendJson(res, 200, {
        conversations: listConversations(limit, offset),
      });
    }

    if (req.method === "POST" && parts.length === 2) {
      try {
        const body = await parseBody(req);
        const conversationId = ensureConversation({
          id: body.id,
          title: body.title,
          model: body.model,
        });
        return sendJson(res, 201, { id: conversationId });
      } catch (error) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
    }

    if (parts.length === 3 && parts[2] && req.method === "PATCH") {
      try {
        const body = await parseBody(req);
        if (!body.title) {
          return sendJson(res, 400, { error: "Missing title" });
        }
        updateConversationTitle(parts[2], body.title);
        return sendJson(res, 200, { ok: true });
      } catch (error) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
    }

    if (parts.length === 3 && parts[2] && req.method === "DELETE") {
      const result = deleteConversation(parts[2]);
      if (!result?.changes) {
        return sendJson(res, 404, { error: "Conversation not found" });
      }
      return sendJson(res, 200, { ok: true });
    }

    if (parts.length === 4 && parts[2] && parts[3] === "project") {
      const conversationId = parts[2];
      if (req.method === "GET") {
        const project = ensureProject(conversationId);
        const fileCount = project?.id ? countProjectFiles(project.id) : 0;
        return sendJson(res, 200, {
          project: project
            ? {
                id: project.id,
                conversationId: project.conversation_id,
                name: project.name,
                description: project.description,
                createdAt: project.created_at,
                updatedAt: project.updated_at,
                fileCount,
              }
            : null,
        });
      }
    }

    if (parts.length === 4 && parts[2] && parts[3] === "messages") {
      const conversationId = parts[2];
      if (req.method === "GET") {
        return sendJson(res, 200, { messages: listMessages(conversationId) });
      }
      if (req.method === "POST") {
        try {
          const body = await parseBody(req);
          const messageId = createMessage({
            conversationId,
            role: body.role,
            content: body.content,
            model: body.model,
          });
          return sendJson(res, 201, { id: messageId });
        } catch (error) {
          return sendJson(res, 400, { error: "Invalid JSON" });
        }
      }
    }
  }

  if (req.url?.startsWith("/api/proxy")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const target = url.searchParams.get("url");
    if (!target) {
      res.writeHead(400, PREVIEW_HEADERS);
      res.end("Missing url parameter");
      return;
    }
    return proxyRequest(res, target);
  }

  if (req.url === "/api/token-usage" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      addTokenUsage({
        messageId: body.messageId,
        conversationId: body.conversationId,
        model: body.model,
        promptTokens: body.promptTokens || 0,
        completionTokens: body.completionTokens || 0,
        totalTokens: body.totalTokens || 0,
      });
      return sendJson(res, 201, { ok: true });
    } catch (error) {
      return sendJson(res, 400, { error: "Invalid JSON" });
    }
  }

  if (req.url?.startsWith("/api/projects")) {
    const [path, query] = req.url.split("?");
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 4 && parts[2] && parts[3] === "preview") {
      const projectId = parts[2];
      const rawPath = parts.slice(4).join("/");
      const entryPath = getPreviewEntry(projectId);
      const requestedPath = sanitizePreviewPath(rawPath || entryPath);
      if (!requestedPath) {
        res.writeHead(400, PREVIEW_HEADERS);
        res.end("Invalid path");
        return;
      }
      const file = getProjectFile(projectId, requestedPath);
      if (!file?.content) {
        res.writeHead(404, PREVIEW_HEADERS);
        res.end("File not found");
        return;
      }
      const fileList = listProjectFiles(projectId);
      const paths = Array.isArray(fileList)
        ? fileList.map((item) => item.path).filter(Boolean)
        : [];
      const body = requestedPath.endsWith(".html")
        ? normalizePreviewHtml(projectId, file.content, paths)
        : file.content;
      res.writeHead(200, {
        ...PREVIEW_HEADERS,
        "Content-Type": contentTypeForPath(requestedPath),
      });
      res.end(body);
      return;
    }
    if (parts.length === 3 && parts[2]) {
      const projectId = parts[2];
      if (req.method === "GET") {
        const files = listProjectFiles(projectId);
        return sendJson(res, 200, { files });
      }
      if (req.method === "PATCH") {
        try {
          const body = await parseBody(req);
          if (!body.name && !body.description) {
            return sendJson(res, 400, { error: "Missing update fields" });
          }
          updateProject(projectId, {
            name: body.name,
            description: body.description,
          });
          return sendJson(res, 200, { ok: true });
        } catch (error) {
          return sendJson(res, 400, { error: "Invalid JSON" });
        }
      }
    }

    if (parts.length === 4 && parts[2] && parts[3] === "files") {
      const projectId = parts[2];
      if (req.method === "GET") {
        const params = new URLSearchParams(query || "");
        const pathParam = params.get("path");
        if (pathParam) {
          const file = getProjectFile(projectId, pathParam);
          if (!file) {
            return sendJson(res, 404, { error: "File not found" });
          }
          return sendJson(res, 200, { file });
        }
        const files = listProjectFiles(projectId);
        return sendJson(res, 200, { files });
      }

      if (req.method === "POST") {
        try {
          const body = await parseBody(req);
          if (!body.path || body.content === undefined) {
            return sendJson(res, 400, { error: "Missing path or content" });
          }
          const file = upsertProjectFile({
            projectId,
            path: body.path,
            content: body.content,
            language: body.language || "text",
          });
          return sendJson(res, 200, { file });
        } catch (error) {
          return sendJson(res, 400, { error: "Invalid JSON" });
        }
      }
    }
  }

  res.writeHead(404);
  res.end();
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(
    `[WS] Client connected: ${clientId} from ${req.socket.remoteAddress}`,
  );

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "system.connected",
      data: {
        sessionId: clientId,
        serverVersion: "1.0.0",
      },
    }),
  );

  // Message handler
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[WS] Received message from ${clientId}:`, message.type);

      // Echo back for now (basic functionality)
      ws.send(
        JSON.stringify({
          type: "echo",
          data: {
            original: message,
            timestamp: Date.now(),
          },
        }),
      );
    } catch (err) {
      console.error(`[WS] Error processing message from ${clientId}:`, err);
      ws.send(
        JSON.stringify({
          type: "error",
          data: {
            code: "INVALID_MESSAGE",
            message: "Failed to parse message",
            retryable: false,
          },
        }),
      );
    }
  });

  // Ping/pong for keepalive
  ws.on("pong", () => {
    console.log(`[WS] Pong from ${clientId}`);
  });

  // Disconnection handler
  ws.on("close", () => {
    console.log(`[WS] Client disconnected: ${clientId}`);
  });

  // Error handler
  ws.on("error", (err) => {
    console.error(`[WS] Error for client ${clientId}:`, err);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`[SERVER] WebSocket server listening on port ${PORT}`);
  console.log(
    `[SERVER] Health check available at http://localhost:${PORT}/health`,
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[SERVER] SIGTERM received, shutting down gracefully");
  wss.close(() => {
    console.log("[SERVER] WebSocket server closed");
    closeDatabase(db);
    server.close(() => {
      console.log("[SERVER] HTTP server closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("[SERVER] SIGINT received, shutting down gracefully");
  wss.close(() => {
    console.log("[SERVER] WebSocket server closed");
    closeDatabase(db);
    server.close(() => {
      console.log("[SERVER] HTTP server closed");
      process.exit(0);
    });
  });
});
