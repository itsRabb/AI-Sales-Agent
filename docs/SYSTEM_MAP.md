# 🗺️ SYSTEM MAP - Visual Architecture

## Your Complete AI Sales Agent System

```
                    ╔═══════════════════════════════════════════════════╗
                    ║  YOUR PC (Control Center)                        ║
                    ║  Windows 11 - Desktop                            ║
                    ╠═══════════════════════════════════════════════════╣
                    ║                                                   ║
                    ║  ┌─────────────────────┐  ┌────────────────────┐║
                    ║  │ Dashboard :4000     │  │ Orchestrator :5000 │║
                    ║  │ • Web UI            │  │ • Brain/Coordinator│║
                    ║  │ • Live monitoring   │  │ • 24/7 autonomous  │║
                    ║  │ • Feature toggles   │  │ • Learning system  │║
                    ║  │ • Agent control     │  │ • DuckDuckGo search│║
                    ║  │ • WebSocket feed    │  │ • Airtable saves   │║
                    ║  └─────────────────────┘  └────────────────────┘║
                    ║                                                   ║
                    ║  START.bat ← Double-click to launch              ║
                    ╚═══════════════════════════════════════════════════╝
                                        │
                                        │ Coordinates & Monitors
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            ▼                           ▼                           ▼
    
╔═══════════════════╗     ╔═══════════════════╗     ╔═══════════════════╗
║ Worker 1          ║     ║ Brain 1 (M715Q)   ║     ║ Brain 2 (M73)     ║
║ localhost:8001    ║     ║ localhost:6002    ║     ║ localhost:6001    ║
╠═══════════════════╣     ╠═══════════════════╣     ╠═══════════════════╣
║                   ║     ║                   ║     ║                   ║
║ WORKER #1         ║     ║ BRAIN #1          ║     ║ BRAIN #2          ║
║                   ║     ║                   ║     ║                   ║
║ • Scrapes web     ║     ║ Port: 6002        ║     ║ Port: 6001        ║
║ • Playwright      ║     ║ Ollama: :11434    ║     ║ Ollama: :11434    ║
║ • Anti-bot        ║     ║                   ║     ║                   ║
║ • Proxy support   ║     ║ Job: SCORING      ║     ║ Job: EMAILING     ║
║                   ║     ║ • Pull new leads  ║     ║ • Pull qualified  ║
║ Sites:            ║     ║ • Score 1-10      ║     ║ • Generate email  ║
║ • Zillow          ║     ║ • Use Ollama AI   ║     ║ • SEND via SMTP   ║
║ • Realtor.com     ║     ║ • Update Airtable ║     ║ • Update Airtable ║
║ • Redfin          ║     ║ • Qualify/DQ      ║     ║ • Mark contacted  ║
║ • LinkedIn*       ║     ║                   ║     ║                   ║
║                   ║     ║ Runs: Every 3 min ║     ║ Runs: Every 5 min ║
║ ripi_scraper.py   ║     ║ brain-m715q.js    ║     ║ brain-m73.js      ║
╚═══════════════════╝     ╚═══════════════════╝     ╚═══════════════════╝
            │                         │                         │
            │                         │                         │
            │                         ▼                         ▼
            │             ┌─────────────────────┐   ┌─────────────────────┐
            │             │ Ollama AI           │   │ Ollama AI           │
            │             │ llama3.1:8b         │   │ llama3.1:8b         │
            │             │ "Score this lead"   │   │ "Write this email"  │
            │             └─────────────────────┘   └─────────────────────┘
            │                         │                         │
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      │
                                      ▼
                          ╔═══════════════════════════╗
                          ║ Airtable (Cloud CRM/DB)   ║
                          ║ your_base_id_here         ║
                          ╠═══════════════════════════╣
                          ║                           ║
                          ║ Tables:                   ║
                          ║ • Leads                   ║
                          ║   - Name, Email, Phone    ║
                          ║   - Score (1-10)          ║
                          ║   - Status (new/qualified)║
                          ║   - Contacted (true/false)║
                          ║                           ║
                          ║ • Profiles (LinkedIn)     ║
                          ║ • Outreach (Emails sent)  ║
                          ║ • Unsubscribed            ║
                          ║                           ║
                          ╚═══════════════════════════╝
                                      │
                                      │ (M73 only)
                                      ▼
                          ╭───────────────────────────╮
                          │ Hostinger SMTP            │
                          │ smtp.hostinger.com:465    │
                          ├───────────────────────────┤
                          │                           │
                          │ Email: your-email@domain  │
                          │ Password: **************** │
                          │                           │
                          │ Sends actual emails to    │
                          │ qualified real estate     │
                          │ agents                    │
                          │                           │
                          ╰───────────────────────────╯
                                      │
                                      ▼
                          ╔═══════════════════════════╗
                          ║ Real Estate Agents        ║
                          ║ (Your Customers)          ║
                          ╠═══════════════════════════╣
                          ║                           ║
                          ║ Receive personalized      ║
                          ║ emails about white-label  ║
                          ║ hazard reports            ║
                          ║                           ║
                          ║ Can reply to start sales  ║
                          ║ conversation              ║
                          ║                           ║
                          ╚═══════════════════════════╝


╔══════════════════════════════════════════════════════════════════════╗
║                            Worker 2                                 ║
║                         localhost:8002                               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  WORKER #2 (Same as Worker 1)                                        ║
║  • Backup/parallel scraping                                         ║
║  • Load balancing                                                   ║
║  • Runs ripi_scraper.py                                             ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Data Flow: Lead Discovery to Email Sent

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: SEARCH (Every 5 minutes)                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Orchestrator                                                       │
│      │                                                              │
│      ├─ Searches DuckDuckGo                                        │
│      │  Query: "independent real estate agent Miami FL"            │
│      │                                                              │
│      ├─ Gets URLs:                                                 │
│      │  • zillow.com/professionals/miami-fl                        │
│      │  • realtor.com/realestateagents/miami_fl                   │
│      │  • redfin.com/real-estate-agents/miami-fl                  │
│      │                                                              │
│      └─ Sends URLs to RiPis ────────────────────────────────────┐  │
│                                                                   │  │
└───────────────────────────────────────────────────────────────────┼──┘
                                                                    │
┌───────────────────────────────────────────────────────────────────┼──┐
│ STEP 2: SCRAPE (Takes 2-3 minutes per batch)                     │  │
├───────────────────────────────────────────────────────────────────┼──┤
│                                                                   ▼  │
│  RiPi 1 or RiPi 2                                                   │
│      │                                                               │
│      ├─ Opens Playwright browser                                    │
│      ├─ Navigates to URL                                            │
│      ├─ Waits for page load                                         │
│      ├─ Scrolls to load lazy content                                │
│      ├─ Extracts HTML                                               │
│      │                                                               │
│      ├─ Passes to smart parser (zillow.py, realtor.py, etc.)       │
│      │                                                               │
│      └─ Returns agent data:                                         │
│         {                                                            │
│           name: "John Smith",                                        │
│           email: "john@smithrealty.com",                            │
│           phone: "305-555-1234",                                     │
│           city: "Miami",                                             │
│           state: "FL",                                               │
│           brokerage: "Smith Realty LLC",                            │
│           website: "smithrealty.com",                                │
│           reviews: 47,                                               │
│           years: 8                                                   │
│         }                                                            │
│         │                                                            │
│         └─ Sends back to Orchestrator ──────────────────────────┐  │
│                                                                   │  │
└───────────────────────────────────────────────────────────────────┼──┘
                                                                    │
┌───────────────────────────────────────────────────────────────────┼──┐
│ STEP 3: SAVE (Immediate)                                         │  │
├───────────────────────────────────────────────────────────────────┼──┤
│                                                                   ▼  │
│  Orchestrator                                                        │
│      │                                                               │
│      ├─ Filters out big brokerages (Compass, RE/MAX, etc.)         │
│      │                                                               │
│      ├─ Saves to Airtable:                                          │
│      │  POST https://api.airtable.com/.../Leads                     │
│      │  {                                                            │
│      │    Name: "John Smith",                                        │
│      │    Email: "john@smithrealty.com",                            │
│      │    Phone: "305-555-1234",                                     │
│      │    City: "Miami",                                             │
│      │    State: "FL",                                               │
│      │    Status: "new"  ◄── Important!                             │
│      │  }                                                            │
│      │                                                               │
│      └─ Broadcasts to Dashboard: "Saved 1 lead to Airtable"        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (Lead waits in Airtable...)
                                    │
┌───────────────────────────────────┼──────────────────────────────────┐
│ STEP 4: SCORE (Every 3 minutes)  │                                  │
├───────────────────────────────────┼──────────────────────────────────┤
│                                   ▼                                  │
│  M715Q Brain                                                         │
│      │                                                               │
│      ├─ Queries Airtable:                                           │
│      │  GET /Leads?filterByFormula={Status}='new'                   │
│      │                                                               │
│      ├─ Gets lead: John Smith                                       │
│      │                                                               │
│      ├─ Sends to Ollama AI:                                         │
│      │  "Score this real estate agent 1-10 based on:                │
│      │   - Business size (prefer small/independent)                 │
│      │   - Location (Miami = flood-prone = good!)                   │
│      │   - Online presence"                                          │
│      │                                                               │
│      ├─ Ollama responds:                                            │
│      │  {                                                            │
│      │    score: 8,                                                  │
│      │    reasoning: "Independent agent in high-risk flood zone",   │
│      │    qualification: "qualified"                                 │
│      │  }                                                            │
│      │                                                               │
│      └─ Updates Airtable:                                           │
│         PATCH /Leads/{recordId}                                      │
│         {                                                            │
│           Score: 8,                                                  │
│           Status: "qualified"  ◄── Changed!                         │
│         }                                                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (Lead now qualified...)
                                    │
┌───────────────────────────────────┼──────────────────────────────────┐
│ STEP 5: EMAIL (Every 5 minutes, if toggle ON)                      │
├───────────────────────────────────┼──────────────────────────────────┤
│                                   ▼                                  │
│  M73 Brain                                                           │
│      │                                                               │
│      ├─ Checks if email toggle is ON                                │
│      │  (If OFF, stops here)                                         │
│      │                                                               │
│      ├─ Queries Airtable:                                           │
│      │  GET /Leads?filterByFormula=                                 │
│      │      AND({Status}='qualified', {Contacted}=FALSE())          │
│      │                                                               │
│      ├─ Gets lead: John Smith (Score 8, not contacted yet)          │
│      │                                                               │
│      ├─ Double-checks: Contacted !== true (paranoid mode)           │
│      │                                                               │
│      ├─ Sends to Ollama AI:                                         │
│      │  "Write a personalized email to John Smith, a realtor in     │
│      │   Miami. Mention flood risks and how our hazard reports      │
│      │   help close deals faster."                                  │
│      │                                                               │
│      ├─ Ollama responds:                                            │
│      │  "Hi John,                                                    │
│      │                                                               │
│      │   I noticed you're working in Miami - great market!          │
│      │                                                               │
│      │   Quick question: how much time do you spend ordering        │
│      │   environmental reports for your clients? We built a tool    │
│      │   that gives instant hazard reports (flood, fire,            │
│      │   earthquake) for any property in seconds.                   │
│      │                                                               │
│      │   Agents using it say it helps them look more professional   │
│      │   and close deals faster. Would you be interested in         │
│      │   trying it out?                                              │
│      │                                                               │
│      │   Best,                                                       │
│      │   [Your Name] from [Your Company]"                           │
│      │                                                               │
│      ├─ SENDS email via configured SMTP:                            │
│      │  From: your-email@yourdomain.com                             │
│      │  To: john@smithrealty.com                                    │
│      │  Subject: "Quick idea for your Miami listings"               │
│      │                                                               │
│      ├─ ✅ Email actually sent! (MessageID received)                │
│      │                                                               │
│      └─ Updates Airtable:                                           │
│         PATCH /Leads/{recordId}                                      │
│         {                                                            │
│           Contacted: true,  ◄── Won't email again!                  │
│           Status: "contacted",                                       │
│           Last Contact Date: "2025-12-09T20:00:00Z"                 │
│         }                                                            │
│                                                                      │
│      └─ Waits 30 seconds (rate limiting) before next email          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                      ╔═════════════════════════════╗
                      ║ John receives email         ║
                      ║ Reads it                    ║
                      ║ Replies "Interested!"       ║
                      ║ → YOU GET A LEAD! 🎉        ║
                      ╚═════════════════════════════╝
```

---

## Dashboard Control Panel

```
╔══════════════════════════════════════════════════════════════════════╗
║                    AI FLEET COMMAND CENTER                           ║
║                    http://localhost:4000                             ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  [======== AGENT STATUS ========]                                   ║
║                                                                      ║
║  🕷️ RiPi 1              [●] ONLINE    [Restart] [Stop] [📋 Logs]   ║
║  🕷️ RiPi 2              [●] ONLINE    [Restart] [Stop] [📋 Logs]   ║
║  🧠 M715Q Brain          [●] ONLINE    [Restart] [Stop] [📋 Logs]   ║
║  🧠 M73 Brain            [●] ONLINE    [Restart] [Stop] [📋 Logs]   ║
║  🎯 Orchestrator         [●] ONLINE    [Restart] [Stop] [📋 Logs]   ║
║                                                                      ║
║  [======== FEATURE CONTROLS ========]                               ║
║                                                                      ║
║  📧 Email Sending (M73)         [ OFF ]  ◄── Toggle here!          ║
║     Enable M73 to send emails                                       ║
║                                                                      ║
║  🔒 Proxy Rotation (RiPis)      [ OFF ]                             ║
║     Route scraping through proxies                                  ║
║                                                                      ║
║  💼 LinkedIn Enrichment          [ OFF ]                             ║
║     Google search for LinkedIn profiles                             ║
║                                                                      ║
║  [======== LIVE ACTIVITY ========]                                  ║
║                                                                      ║
║  20:15:32  Orchestrator: Searching DuckDuckGo...                    ║
║  20:15:35  Found 8 URLs from search                                 ║
║  20:15:36  Sent 8 URLs to RiPi 1 for scraping                       ║
║  20:16:42  RiPi 1: Scraped 12 agents                                ║
║  20:16:43  Saved 12 leads to Airtable                               ║
║  20:18:05  M715Q: Scoring 12 new leads...                           ║
║  20:18:47  M715Q: Qualified 8 leads, disqualified 4                 ║
║  20:20:12  M73: Email sending DISABLED (toggle to enable)           ║
║                                                                      ║
║  [======== METRICS ========]                                        ║
║                                                                      ║
║  Leads Scraped Today:    147                                        ║
║  Leads Qualified:         92                                        ║
║  Emails Sent:              0   ◄── Enable email toggle!             ║
║  System Uptime:          4h 23m                                     ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Files You Need to Know

### Start the System
- `START.bat` - Double-click to launch (your PC)
- `brain-m73.js` - Run on M73 ThinkCentre
- `brain-m715q.js` - Run on M715Q ThinkCentre
- `ripi_scraper.py` - Run on both RiPis

### Configuration
- `.env.production` - All settings (email, Airtable, IPs)
- **DO NOT EDIT** - already configured correctly

### Documentation (Read These!)
- `QUICK_START.md` - How to start the system
- `QUESTIONS_ANSWERED.md` - Your questions answered
- `SYSTEM_CONFIRMED_WORKING.md` - Full technical reference
- `CODE_REVIEW_COMPLETE.md` - Proof everything works

### Original Docs
- `docs/README.md` - User manual
- `docs/goal.md` - Project requirements

---

## Device Roles

| Device | Role | What It Does | Runs |
|--------|------|--------------|------|
| **Your PC** | Control Center | Dashboard + Orchestrator | `START.bat` |
| **M73** | Email Brain | Generates & sends emails | `node brain-m73.js` |
| **M715Q** | Scoring Brain | Scores leads with AI | `node brain-m715q.js` |
| **RiPi 1** | Worker | Scrapes websites | `python ripi_scraper.py` |
| **RiPi 2** | Worker | Scrapes websites (backup) | `python ripi_scraper.py` |

---

## Ports & IPs

| Device | IP | Port | Access |
|--------|----|----|--------|
| Your PC Dashboard | localhost | 4000 | http://localhost:4000 |
| Your PC Orchestrator | localhost | 5000 | http://localhost:5000 |
| Brain 1 (M73) | 192.168.1.X | 6001 | http://localhost:6001 (or your IP) |
| Ollama 1 | 192.168.1.X | 11434 | http://localhost:11434 |
| Brain 2 (M715Q) | 192.168.1.Y | 6002 | http://localhost:6002 (or your IP) |
| Ollama 2 | 192.168.1.Y | 11434 | http://localhost:11434 |
| Worker 1 | 192.168.1.Z | 8001 | http://localhost:8001 (or your IP) |
| Worker 2 | 192.168.1.W | 8002 | http://localhost:8002 (or your IP) |

**Note:** Update `.env` file with your actual machine IPs. Use `localhost` if running all on one machine.

---

**Everything is mapped and ready to go! 🚀**

**Next step:** Read `QUICK_START.md` and launch the system!
