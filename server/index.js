import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { initDatabase, closeDatabase } from './db/init.js';

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || '/data/ollama-chat.db';

// Initialize database
let db;
try {
  db = initDatabase(DB_PATH);
} catch (err) {
  console.error('[ERROR] Failed to initialize database:', err);
  process.exit(1);
}

// Create HTTP server for health checks
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(`[WS] Client connected: ${clientId} from ${req.socket.remoteAddress}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'system.connected',
    data: {
      sessionId: clientId,
      serverVersion: '1.0.0'
    }
  }));

  // Message handler
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[WS] Received message from ${clientId}:`, message.type);

      // Echo back for now (basic functionality)
      ws.send(JSON.stringify({
        type: 'echo',
        data: {
          original: message,
          timestamp: Date.now()
        }
      }));
    } catch (err) {
      console.error(`[WS] Error processing message from ${clientId}:`, err);
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          code: 'INVALID_MESSAGE',
          message: 'Failed to parse message',
          retryable: false
        }
      }));
    }
  });

  // Ping/pong for keepalive
  ws.on('pong', () => {
    console.log(`[WS] Pong from ${clientId}`);
  });

  // Disconnection handler
  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${clientId}`);
  });

  // Error handler
  ws.on('error', (err) => {
    console.error(`[WS] Error for client ${clientId}:`, err);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`[SERVER] WebSocket server listening on port ${PORT}`);
  console.log(`[SERVER] Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received, shutting down gracefully');
  wss.close(() => {
    console.log('[SERVER] WebSocket server closed');
    closeDatabase(db);
    server.close(() => {
      console.log('[SERVER] HTTP server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('[SERVER] SIGINT received, shutting down gracefully');
  wss.close(() => {
    console.log('[SERVER] WebSocket server closed');
    closeDatabase(db);
    server.close(() => {
      console.log('[SERVER] HTTP server closed');
      process.exit(0);
    });
  });
});
