/**
 * AI Agent Fleet - Command & Control Dashboard Server
 * 
 * This is your mission control center for monitoring and controlling
 * your 24/7 AI agent workforce.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

// Import proxy manager
const proxyManager = require('../proxy-manager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.DASHBOARD_PORT || 4000;

// Agent Fleet Configuration
const AGENTS = [
  {
    id: 'ripi-1',
    name: 'Raspberry Pi #1 - Lead Scraper',
    type: 'worker',
    url: process.env.RIPI_1_URL || 'http://localhost:8001',
    healthEndpoint: '/health',
    icon: '🕷️',
    color: '#3b82f6'
  },
  {
    id: 'ripi-2',
    name: 'Raspberry Pi #2 - Lead Scraper',
    type: 'worker',
    url: process.env.RIPI_2_URL || 'http://localhost:8002',
    healthEndpoint: '/health',
    icon: '🕷️',
    color: '#10b981'
  },
  {
    id: 'm73-brain',
    name: 'M73 - Email System (Ollama)',
    type: 'emailer',
    url: process.env.M73_BRAIN_URL || 'http://localhost:6001',
    healthEndpoint: '/health',
    icon: '📧',
    color: '#f59e0b'
  },
  {
    id: 'm715q-brain',
    name: 'M715Q - Scores Leads (Ollama)',
    type: 'scorer',
    url: process.env.M715Q_BRAIN_URL || 'http://localhost:6002',
    healthEndpoint: '/health',
    icon: '🎯',
    color: '#8b5cf6'
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator - Coordinator',
    type: 'orchestrator',
    url: process.env.ORCHESTRATOR_URL || 'http://localhost:5000',
    healthEndpoint: '/health',
    icon: '👑',
    color: '#ec4899'
  }
];

// Agent Status Storage
let agentStatus = {};
let metrics = {
  totalLeadsProcessed: 0,
  totalEmailsSent: 0,
  totalSocialPosts: 0,
  uptime: Date.now(),
  lastUpdate: Date.now()
};

// Initialize agent status
AGENTS.forEach(agent => {
  agentStatus[agent.id] = {
    status: 'unknown',
    lastCheck: null,
    lastSuccess: null,
    consecutiveFailures: 0,
    responseTime: 0,
    details: {}
  };
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount proxy management routes
app.use(proxyManager);

// ========================================
// API ENDPOINTS
// ========================================

// Dashboard home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all agent statuses
app.get('/api/status', (req, res) => {
  const status = AGENTS.map(agent => ({
    ...agent,
    ...agentStatus[agent.id]
  }));
  
  res.json({
    agents: status,
    metrics: metrics,
    timestamp: Date.now()
  });
});

// Control individual agent
app.post('/api/agent/:agentId/:action', async (req, res) => {
  const { agentId, action } = req.params;
  const agent = AGENTS.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  try {
    let result;
    
    switch (action) {
      case 'restart':
        result = await restartAgent(agent);
        break;
      case 'stop':
        result = await stopAgent(agent);
        break;
      case 'start':
        result = await startAgent(agent);
        break;
      case 'check':
        result = await checkAgent(agent);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      agentId: agentId
    });
  }
});

// Get metrics history
app.get('/api/metrics/history', (req, res) => {
  // TODO: Implement metrics history from database
  res.json({
    message: 'Metrics history endpoint',
    current: metrics
  });
});

// Get agent logs
app.get('/api/agent/:agentId/logs', async (req, res) => {
  const { agentId } = req.params;
  const agent = AGENTS.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  try {
    // Try to fetch logs from agent
    const response = await axios.get(`${agent.url}/logs`, {
      timeout: 3000
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Could not fetch logs',
      message: error.message,
      logs: ['Agent not responding or logs endpoint not available']
    });
  }
});

// LinkedIn enrichment toggle
// Configuration endpoints
app.post('/api/config/linkedin', express.json(), (req, res) => {
  const { enabled } = req.body;
  global.linkedInEnabled = enabled === true;
  console.log(`💼 LinkedIn enrichment: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  res.json({ success: true, linkedInEnabled: global.linkedInEnabled });
});

app.post('/api/config/email', express.json(), async (req, res) => {
  const { enabled } = req.body;
  global.emailSendingEnabled = enabled === true;
  console.log(`📧 Email sending: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  
  // Send toggle command to M73 Brain
  try {
    await axios.post(`${process.env.M73_BRAIN_URL || 'http://localhost:6001'}/toggle`, {}, { timeout: 3000 });
    res.json({ success: true, emailSendingEnabled: global.emailSendingEnabled });
  } catch (error) {
    console.error('⚠️  Could not reach M73 Brain:', error.message);
    res.json({ 
      success: false, 
      error: 'M73 Brain not responding',
      emailSendingEnabled: global.emailSendingEnabled 
    });
  }
});

app.post('/api/config/proxy', express.json(), async (req, res) => {
  const { enabled } = req.body;
  global.proxyEnabled = enabled === true;
  console.log(`🔒 Proxy rotation: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  
  // Send proxy config to all RiPis
  const scrapers = [
    process.env.RIPI_1_URL || 'http://localhost:8001',
    process.env.RIPI_2_URL || 'http://localhost:8002'
  ];
  
  for (const scraperUrl of scrapers) {
    try {
      await axios.post(`${scraperUrl}/config/proxy`, { enabled }, { timeout: 3000 });
      console.log(`  ✅ Updated proxy config for ${scraperUrl}`);
    } catch (error) {
      console.error(`  ⚠️  Could not reach ${scraperUrl}:`, error.message);
    }
  }
  
  res.json({ success: true, proxyEnabled: global.proxyEnabled });
});

// Agent logs endpoint
app.get('/api/agent/:agentId/logs', async (req, res) => {
  const { agentId } = req.params;
  const agent = AGENTS.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  try {
    const response = await axios.get(`${agent.url}/logs`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Could not fetch logs',
      message: error.message,
      logs: [
        `❌ Error fetching logs from ${agent.name}`,
        `URL: ${agent.url}/logs`,
        `Error: ${error.message}`,
        '',
        '💡 Make sure the agent has a /logs endpoint implemented.'
      ]
    });
  }
});

// ========================================
// AGENT CONTROL FUNCTIONS
// ========================================

async function checkAgent(agent) {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(
      `${agent.url}${agent.healthEndpoint}`,
      { 
        timeout: 5000,
        validateStatus: () => true // Accept any status for now
      }
    );
    
    const responseTime = Date.now() - startTime;
    const isHealthy = response.status >= 200 && response.status < 300;
    
    agentStatus[agent.id] = {
      status: isHealthy ? 'online' : 'degraded',
      lastCheck: Date.now(),
      lastSuccess: isHealthy ? Date.now() : agentStatus[agent.id].lastSuccess,
      consecutiveFailures: isHealthy ? 0 : agentStatus[agent.id].consecutiveFailures + 1,
      responseTime: responseTime,
      details: response.data || {}
    };
    
    // Auto-restart if too many failures
    if (agentStatus[agent.id].consecutiveFailures >= 3 && process.env.AUTO_RESTART === 'true') {
      console.log(`⚠️  Agent ${agent.name} has failed ${agentStatus[agent.id].consecutiveFailures} times. Auto-restarting...`);
      await restartAgent(agent);
    }
    
    return { success: true, agent: agent.id, status: agentStatus[agent.id] };
    
  } catch (error) {
    agentStatus[agent.id] = {
      status: 'offline',
      lastCheck: Date.now(),
      lastSuccess: agentStatus[agent.id].lastSuccess,
      consecutiveFailures: agentStatus[agent.id].consecutiveFailures + 1,
      responseTime: Date.now() - startTime,
      details: { error: error.message }
    };
    
    return { success: false, agent: agent.id, error: error.message };
  }
}

async function restartAgent(agent) {
  console.log(`🔄 Restarting agent: ${agent.name}`);
  
  // Note: Actual restart requires SSH or systemd integration
  // For now, we'll just mark it and send restart command if endpoint exists
  
  try {
    await axios.post(`${agent.url}/restart`, {}, { timeout: 3000 });
    return { success: true, message: `Restart command sent to ${agent.name}` };
  } catch (error) {
    return { 
      success: false, 
      message: `Could not send restart command: ${error.message}`,
      hint: 'You may need to restart manually or configure systemd integration'
    };
  }
}

async function stopAgent(agent) {
  console.log(`⏹️  Stopping agent: ${agent.name}`);
  
  try {
    await axios.post(`${agent.url}/shutdown`, {}, { timeout: 3000 });
    agentStatus[agent.id].status = 'stopped';
    return { success: true, message: `Stop command sent to ${agent.name}` };
  } catch (error) {
    return { 
      success: false, 
      message: `Could not send stop command: ${error.message}` 
    };
  }
}

async function startAgent(agent) {
  console.log(`▶️  Starting agent: ${agent.name}`);
  
  try {
    await axios.post(`${agent.url}/start`, {}, { timeout: 3000 });
    await checkAgent(agent); // Verify it started
    return { success: true, message: `Start command sent to ${agent.name}` };
  } catch (error) {
    return { 
      success: false, 
      message: `Could not send start command: ${error.message}` 
    };
  }
}

// ========================================
// MONITORING & HEALTH CHECKS
// ========================================

// Check all agents every 5 minutes (reduced from 30 seconds to prevent console spam)
cron.schedule('*/5 * * * *', async () => {
  // Only log to console if there are status changes
  const hasChanges = AGENTS.some(agent => {
    const currentStatus = agentStatus[agent.id]?.status;
    return currentStatus === 'offline' || currentStatus === 'unknown';
  });
  
  if (hasChanges) {
    console.log('🔍 Running health checks...');
  }
  
  for (const agent of AGENTS) {
    await checkAgent(agent);
  }
  
  // Broadcast status to all connected WebSocket clients
  broadcastStatus();
  
  metrics.lastUpdate = Date.now();
});

// Collect metrics every 5 minutes (reduced from 1 minute to prevent console spam)
cron.schedule('*/5 * * * *', async () => {
  // Silent metrics collection - only broadcast, don't log to console
  // TODO: Fetch actual metrics from Airtable/databases
  // If you want to update metrics, do it here with real data
  broadcastMetrics();
});

// ========================================
// WEBSOCKET - REAL-TIME UPDATES
// ========================================

function broadcastStatus() {
  const status = AGENTS.map(agent => ({
    ...agent,
    ...agentStatus[agent.id]
  }));
  
  broadcast({
    type: 'status_update',
    data: {
      agents: status,
      timestamp: Date.now()
    }
  });
}

function broadcastMetrics() {
  broadcast({
    type: 'metrics_update',
    data: metrics
  });
}

function broadcastAlert(alert) {
  broadcast({
    type: 'alert',
    data: alert
  });
}

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Connect to orchestrator for live activity feed
let orchestratorWs;
function connectToOrchestrator() {
  // Close existing connection if any
  if (orchestratorWs && orchestratorWs.readyState === WebSocket.OPEN) {
    orchestratorWs.close();
  }
  
  try {
    const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:5000';
    const wsUrl = orchestratorUrl.replace('http', 'ws');
    
    orchestratorWs = new WebSocket(wsUrl);
    
    orchestratorWs.on('open', () => {
      console.log('✅ Connected to Autonomous Orchestrator for live feed');
    });
    
    orchestratorWs.on('message', (data) => {
      // Relay orchestrator activity to dashboard clients
      const message = JSON.parse(data);
      broadcast({
        type: 'orchestrator_activity',
        data: message
      });
    });
    
    orchestratorWs.on('error', (error) => {
      console.log('⚠️ Orchestrator websocket error (it may not be running yet)');
    });
    
    orchestratorWs.on('close', () => {
      console.log('📡 Orchestrator disconnected, will retry in 10s...');
      orchestratorWs = null; // Clear old connection to prevent leak
      setTimeout(connectToOrchestrator, 10000);
    });
  } catch (error) {
    console.log('⚠️ Could not connect to orchestrator, will retry...');
    setTimeout(connectToOrchestrator, 10000);
  }
}

// Start orchestrator connection after dashboard starts
setTimeout(connectToOrchestrator, 5000);

wss.on('connection', (ws) => {
  console.log('📡 Dashboard client connected');
  
  // Send current status immediately
  ws.send(JSON.stringify({
    type: 'initial_state',
    data: {
      agents: AGENTS.map(agent => ({
        ...agent,
        ...agentStatus[agent.id]
      })),
      metrics: metrics
    }
  }));
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'control') {
        // Handle control commands from dashboard
        const result = await handleControlCommand(data);
        ws.send(JSON.stringify({
          type: 'control_response',
          data: result
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('📡 Dashboard client disconnected');
  });
});

async function handleControlCommand(data) {
  const { agentId, action } = data;
  const agent = AGENTS.find(a => a.id === agentId);
  
  if (!agent) {
    return { success: false, error: 'Agent not found' };
  }
  
  switch (action) {
    case 'restart':
      return await restartAgent(agent);
    case 'stop':
      return await stopAgent(agent);
    case 'start':
      return await startAgent(agent);
    default:
      return { success: false, error: 'Unknown action' };
  }
}

// ========================================
// START SERVER
// ========================================

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                                                ║
║     ██████╗  █████╗ ███████╗██╗  ██╗██████╗  ██████╗  █████╗ ██████╗ ██████╗                                                 ║
║     ██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗██╔═══██╗██╔══██╗██╔══██╗██╔══██╗                                                ║
║     ██║  ██║███████║███████╗███████║██████╔╝██║   ██║███████║██████╔╝██║  ██║                                                ║
║     ██║  ██║██╔══██║╚════██║██╔══██║██╔══██╗██║   ██║██╔══██║██╔══██╗██║  ██║                                                ║
║     ██████╔╝██║  ██║███████║██║  ██║██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝                                                ║
║     ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝                                                 ║
║                                                                                                                                ║
║                                            BLACK NEON // 2026 EDITION                                                          ║
║                                           [Dashboard Command Center]                                                           ║
║                                                                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝

    📊 Dashboard URL: http://localhost:${PORT}
    🔌 WebSocket: ws://localhost:${PORT}
    ⏰ Started: ${new Date().toLocaleString()}

    Monitoring ${AGENTS.length} agents:
${AGENTS.map(a => `      ${a.icon} ${a.name}`).join('\n')}

    Health checks: Every 5 minutes
    Press Ctrl+C to stop
  `);
  
  // Run initial health check
  setTimeout(async () => {
    console.log('\n    🔍 Running initial health checks...');
    for (const agent of AGENTS) {
      await checkAgent(agent);
    }
    
    // Show agent status summary
    const online = Object.values(agentStatus).filter(s => s.status === 'online').length;
    const offline = Object.values(agentStatus).filter(s => s.status === 'offline' || s.status === 'unknown').length;
    
    console.log(`\n    📊 Agent Status: ${online} online, ${offline} offline`);
    console.log('\n    ✅ Dashboard ready! Open http://localhost:4000 in your browser');
    console.log('    💡 Waiting for you to initialize the fleet from the dashboard...\n');
    
    broadcastStatus();
  }, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⏹️  Shutting down dashboard...');
  server.close(() => {
    console.log('✅ Dashboard stopped');
    process.exit(0);
  });
});
