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
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res, status, payload) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(payload));
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
    res.writeHead(204, JSON_HEADERS);
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
