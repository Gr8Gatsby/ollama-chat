// Simple WebSocket test utility for infrastructure validation

const wsUrl = 'ws://localhost:8080';
let ws = null;
let messageLog = [];

// DOM elements
const wsStatus = document.getElementById('ws-status');
const testBtn = document.getElementById('test-btn');
const testOutput = document.getElementById('test-output');

// Update status display
function updateStatus(connected) {
  if (connected) {
    wsStatus.textContent = '✓ Connected';
    wsStatus.className = 'status-ok';
    testBtn.disabled = false;
  } else {
    wsStatus.textContent = '✗ Disconnected';
    wsStatus.className = 'status-error';
    testBtn.disabled = true;
  }
}

// Log message to output
function logMessage(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${JSON.stringify(message, null, 2)}`;
  messageLog.push(logEntry);
  testOutput.textContent = messageLog.join('\n\n');
  testOutput.scrollTop = testOutput.scrollHeight;
}

// Connect to WebSocket
function connect() {
  console.log('[WS] Connecting to', wsUrl);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[WS] Connected');
    updateStatus(true);
    logMessage({ event: 'connected' }, 'success');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[WS] Message received:', data);
      logMessage(data, 'receive');

      // Update DB status if we got a system.connected message
      if (data.type === 'system.connected') {
        const dbStatus = document.getElementById('db-status');
        dbStatus.textContent = '✓ Initialized';
        dbStatus.className = 'status-ok';
      }
    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
      logMessage({ error: err.message }, 'error');
    }
  };

  ws.onerror = (err) => {
    console.error('[WS] Error:', err);
    logMessage({ event: 'error', error: err.message }, 'error');
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected');
    updateStatus(false);
    logMessage({ event: 'disconnected' }, 'warn');

    // Attempt reconnect after 3 seconds
    setTimeout(() => {
      console.log('[WS] Attempting to reconnect...');
      connect();
    }, 3000);
  };
}

// Send test message
function sendTestMessage() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('WebSocket not connected');
    return;
  }

  const testMessage = {
    type: 'test',
    data: {
      message: 'Hello from frontend!',
      timestamp: Date.now()
    }
  };

  console.log('[WS] Sending test message:', testMessage);
  ws.send(JSON.stringify(testMessage));
  logMessage(testMessage, 'send');
}

// Initialize
testBtn.addEventListener('click', sendTestMessage);
connect();
