# 🎯 Command & Control Dashboard

## Your Mission Control Center for AI Agent Fleet

This dashboard gives you **complete oversight and control** of your 24/7 AI agent workforce - just like a command center for a BotNet, but for legitimate business automation!

---

## 🌟 Features

### Real-Time Monitoring
- ✅ Live status of all agents (online/offline/degraded)
- ✅ Response time tracking
- ✅ Health check every 30 seconds
- ✅ Auto-reconnecting WebSocket connection
- ✅ Visual status indicators with color coding

### Agent Control
- 🔄 **Restart** any agent with one click
- ⏹️ **Stop** agents when needed
- ▶️ **Start** agents remotely
- 📋 **View logs** from any agent
- ⚠️ **Auto-restart** agents after 3 consecutive failures

### Live Metrics
- 📊 Total leads processed
- ✉️ Total emails sent
- 📱 Total social media posts
- ⏰ System uptime tracking
- 🟢 Online agent count

### Activity Feed
- 📝 Real-time activity log
- 🚨 Alert notifications
- ⏱️ Timestamped events
- 📜 Scrollable history

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd dashboard
npm install
```

### 2. Configure Your Agents

Copy the example environment file:
```bash
copy .env.example .env
```

Edit `.env` and update with your actual IP addresses (or use localhost for single machine):
```env
# Worker Agent #1
SOCIAL_AGENT_URL=http://localhost:8001

# Worker Agent #2  
SALES_AGENT_URL=http://localhost:8002

# Brain #1 with Ollama
SOCIAL_BRAIN_URL=http://localhost:11434

# Brain #2 with Ollama
SALES_BRAIN_URL=http://localhost:11434

# Flowise (Main PC)
FLOWISE_URL=http://localhost:3000
```

**How to find your IPs:**
- Windows: `ipconfig` in Command Prompt
- Linux/Pi: `hostname -I` in Terminal

### 3. Start the Dashboard

```bash
npm start
```

### 4. Open Your Browser

Navigate to: **http://localhost:4000**

You should see your command center! 🎉

---

## 📊 Dashboard Screenshot

```
┌──────────────────────────────────────────────────────────────┐
│  🎯 AI AGENT FLEET - COMMAND CENTER                          │
│  24/7 Autonomous Workforce Monitoring & Control              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 247     │ │ 67      │ │ 89      │ │ 12:34:56│           │
│  │ Leads   │ │ Emails  │ │ Posts   │ │ Uptime  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                               │
│  ┌────────────────────┐  ┌────────────────────┐             │
│  │ 📱 Social Agent    │  │ 🤖 Sales Agent     │             │
│  │ Status: 🟢 ONLINE  │  │ Status: 🟢 ONLINE  │             │
│  │ Response: 45ms     │  │ Response: 38ms     │             │
│  │ [Restart] [Stop]   │  │ [Restart] [Stop]   │             │
│  └────────────────────┘  └────────────────────┘             │
│                                                               │
│  ┌────────────────────┐  ┌────────────────────┐             │
│  │ 🧠 Social Brain    │  │ 🧠 Sales Brain     │             │
│  │ Status: 🟢 ONLINE  │  │ Status: 🟢 ONLINE  │             │
│  │ Response: 52ms     │  │ Response: 48ms     │             │
│  │ [Restart] [Stop]   │  │ [Restart] [Stop]   │             │
│  └────────────────────┘  └────────────────────┘             │
│                                                               │
│  📊 Live Activity Feed                                       │
│  ──────────────────────────────────────────────              │
│  10:30:15 - Lead processed: Sarah Martinez                   │
│  10:30:12 - Email sent to John Smith                         │
│  10:30:08 - Social post published on Instagram               │
│  10:30:05 - Health check: All agents online                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 Architecture

### How It Works

```
YOUR MAIN PC (Dashboard Server)
        │
        ├── WebSocket Server (Real-time updates)
        ├── Express API (Control endpoints)
        ├── Health Monitor (Every 30s)
        └── Metrics Collector (Every 60s)
                │
                ▼
┌───────────────────────────────────────────────┐
│  Monitors & Controls:                         │
│  • Raspberry Pi #1 (Social Agent)            │
│  • Raspberry Pi #2 (Sales Agent)             │
│  • ThinkCentre M715Q (Social Brain)          │
│  • ThinkCentre M73 (Sales Brain)             │
│  • Flowise (Orchestrator)                    │
└───────────────────────────────────────────────┘
```

### Communication Flow

1. **Dashboard → Agent**: REST API calls for control
2. **Agent → Dashboard**: Health check responses
3. **Dashboard → Browser**: WebSocket for real-time updates
4. **Auto-Healing**: Restart agents after 3 failures

---

## 🎮 Control Features

### Agent Control Panel

Each agent card shows:
- **Status Badge**: 🟢 Online / 🔴 Offline / 🟡 Degraded
- **Response Time**: How fast the agent responds
- **Last Check**: When it was last pinged
- **Consecutive Failures**: Number of failed health checks
- **Control Buttons**: Restart, Stop, View Logs

### Control Buttons

#### 🔄 Restart
- Sends restart command to agent
- Useful when agent is stuck or slow
- **Note**: Requires agent to implement `/restart` endpoint

#### ⏹️ Stop
- Gracefully stops the agent
- **Note**: Requires agent to implement `/shutdown` endpoint

#### 📋 View Logs
- Fetches recent logs from agent
- **Note**: Requires agent to implement `/logs` endpoint

---

## 🚨 Auto-Healing System

The dashboard includes automatic recovery:

```javascript
// In .env file:
AUTO_RESTART=true
RESTART_DELAY_SECONDS=30
```

**How it works:**
1. Health check fails 3 times in a row
2. Dashboard waits 30 seconds
3. Sends restart command automatically
4. Logs the auto-healing action

This ensures your agents stay running 24/7!

---

## 📡 API Endpoints

### Dashboard API

#### `GET /api/status`
Get current status of all agents
```json
{
  "agents": [...],
  "metrics": {...},
  "timestamp": 1234567890
}
```

#### `POST /api/agent/:agentId/:action`
Control an agent
- Actions: `restart`, `stop`, `start`, `check`
- Example: `POST /api/agent/social-pi/restart`

#### `GET /api/agent/:agentId/logs`
Fetch agent logs

#### `GET /api/metrics/history`
Get historical metrics

### WebSocket Messages

#### From Dashboard
```json
{
  "type": "status_update",
  "data": { "agents": [...] }
}
```

#### To Dashboard
```json
{
  "type": "control",
  "agentId": "social-pi",
  "action": "restart"
}
```

---

## 🛠️ Integration with Your Agents

### Adding Health Check to Python Agents

Add this to your FastAPI agent (`ripi_scraper.py`):

```python
@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "uptime": time.time() - start_time
    }

@app.post("/restart")
async def restart_agent():
    # Implement restart logic
    os.execv(sys.executable, ['python'] + sys.argv)
    return {"message": "Restarting..."}

@app.post("/shutdown")
async def shutdown_agent():
    # Graceful shutdown
    asyncio.create_task(shutdown_after_delay())
    return {"message": "Shutting down..."}

@app.get("/logs")
async def get_logs():
    # Return recent logs
    with open("logs/agent.log", "r") as f:
        logs = f.readlines()[-100:]  # Last 100 lines
    return {"logs": logs}
```

### Adding to Ollama (ThinkCentres)

Ollama already has health endpoints:
- `GET /api/tags` - Lists models (used for health check)
- Built-in monitoring

No changes needed!

---

## 🔥 Advanced Features

### Custom Metrics

Add your own metrics by modifying `server.js`:

```javascript
metrics.customMetric = 0;

// Update in cron job
cron.schedule('* * * * *', async () => {
  metrics.customMetric = await fetchCustomData();
});
```

### Email Alerts

Install nodemailer:
```bash
npm install nodemailer
```

Add to `server.js`:
```javascript
async function sendAlert(message) {
  const transporter = nodemailer.createTransport({...});
  await transporter.sendMail({
    to: process.env.ALERT_EMAIL,
    subject: 'Agent Alert',
    text: message
  });
}

// Use in health check
if (consecutiveFailures >= 3) {
  await sendAlert(`Agent ${agent.name} is down!`);
}
```

### Database Logging

Install SQLite:
```bash
npm install sqlite3
```

Log all events to database for historical analysis.

---

## 🐛 Troubleshooting

### Dashboard Won't Start

**Issue**: `Error: Cannot find module 'express'`
**Solution**: Run `npm install` in dashboard folder

### Can't Connect to Agents

**Issue**: All agents show "offline"
**Solution**: 
1. Check `.env` file has correct IPs
2. Ping agents: `ping your-agent-ip` (check if reachable)
3. Check firewall settings
4. Verify agents are running

### WebSocket Disconnects

**Issue**: Dashboard loses connection
**Solution**: 
- Check if dashboard server is running
- Look for errors in browser console (F12)
- Dashboard auto-reconnects every 5 seconds

### Agent Shows "Degraded"

**Issue**: Agent responds but slowly
**Solution**:
- Check agent logs for errors
- Monitor CPU/memory on that device
- May need to restart agent

---

## 🎓 Understanding the Code

### Key Files

```
dashboard/
├── server.js           # Main server & monitoring logic
├── public/
│   └── index.html     # Dashboard UI (runs in browser)
├── package.json       # Dependencies
└── .env              # Configuration
```

### Health Check System

```javascript
// Runs every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  for (const agent of AGENTS) {
    await checkAgent(agent);  // Ping each agent
  }
  broadcastStatus();  // Update dashboard
});
```

### Real-Time Updates

```javascript
// WebSocket pushes updates to browser
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'initial_state',
    data: { agents, metrics }
  }));
});
```

---

## 🚀 Running 24/7

### Windows - Run as Service

1. Install node-windows:
```bash
npm install -g node-windows
```

2. Create service script (`install-service.js`):
```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'AI Agent Dashboard',
  description: 'Command center for AI agents',
  script: 'C:\\path\\to\\dashboard\\server.js'
});

svc.on('install', () => svc.start());
svc.install();
```

3. Run: `node install-service.js`

### Linux/Raspberry Pi - Systemd Service

Create `/etc/systemd/system/dashboard.service`:
```ini
[Unit]
Description=AI Agent Dashboard
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/ai-sales-agent/dashboard
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable dashboard
sudo systemctl start dashboard
```

---

## 📈 Next Steps

1. **Customize the UI**: Edit `public/index.html`
2. **Add more metrics**: Modify `server.js`
3. **Set up alerts**: Add email/SMS notifications
4. **Database integration**: Store historical data
5. **Multi-user access**: Add authentication

---

## 🎯 Your Command Center is Ready!

You now have a **professional-grade monitoring dashboard** for your AI agent fleet!

**Start it up:**
```bash
cd dashboard
npm start
```

**Open browser:**
```
http://localhost:4000
```

**Sit back and watch your AI employees work 24/7!** 🚀

---

**Questions? Check the troubleshooting section or review the code comments in `server.js`.**
