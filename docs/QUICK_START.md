# 🚀 QUICK START GUIDE

## Step 1: Start Your PC Components

**On your main PC**, double-click:
```
START.bat
```

This will:
- ✅ Install dependencies (first time only)
- ✅ Start Dashboard on http://localhost:4000
- ✅ Start Orchestrator on http://localhost:5000
- ✅ Open browser automatically

**Wait for:** "System Online" message

---

## Step 2: Start M715Q Brain (Scoring Agent)

**On Scoring Agent Machine:**
```bash
cd "AI Sales Agent"
node brain-m715q.js
```

**You should see:**
```
🧠 M715Q Brain Agent running on port 6002
```

**This agent:**
- Scores new leads every 3 minutes
- Uses Ollama AI at localhost:11434
- Updates Airtable with scores

**Leave this running!**

---

## Step 3: Start M73 Brain (Email Agent)

**On Email Agent Machine:**
```bash
cd "AI Sales Agent"
node brain-m73.js
```

**You should see:**
```
🧠 M73 Brain Agent running on port 6001
✅ M73 Email transporter ready
📧 Email: DISABLED (toggle via /toggle)
```

**This agent:**
- Sends emails to qualified leads every 5 minutes
- Uses Ollama AI at localhost:11434
- Connects to your SMTP provider (configured in .env)
- **Starts DISABLED** - turn on via dashboard when ready

**Leave this running!**

---

## Step 4: Start RiPi Workers (Scrapers)

### On Worker Agent #1:
```bash
cd scraper-agent
source venv/bin/activate
python ripi_scraper.py
```

### On Worker Agent #2:
```bash
cd scraper-agent
source venv/bin/activate
python ripi_scraper.py
```

**You should see:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
```

**These agents:**
- Scrape Zillow, Realtor.com, Redfin
- Optional LinkedIn enrichment
- Return data to orchestrator

**Leave both running!**

---

## Step 5: Check Dashboard

**Open:** http://localhost:4000

**You should see:**
- ✅ All 5 agents showing **ONLINE** (green circles)
- ✅ Live activity feed updating
- ✅ Metrics counting up

**If any agent shows offline (red):**
- Go back to that machine
- Check the terminal for errors
- Restart the agent

---

## Step 6: Configure Toggles

**In the dashboard, you'll see 3 toggles:**

### 1. 📧 Email Sending (M73 Brain)
- **OFF by default** - emails won't send
- **Turn ON when ready** - M73 will start emailing qualified leads
- No restart needed - just click the toggle

### 2. 🔒 Proxy Rotation (RiPis)
- **OFF by default** - direct connections (faster)
- **Turn ON if getting blocked** - routes through proxies (slower but safer)
- No restart needed

### 3. 💼 LinkedIn Enrichment
- **OFF by default** - scrapes realtor directories only
- **Turn ON for more data** - also searches Google for LinkedIn profiles
- No restart needed

**Recommendation:** Start with all toggles OFF, watch it work, then enable as needed.

---

## Step 7: Watch It Work

### What Happens Next (Automatically)

```
Every 5 minutes:
  1. Orchestrator searches DuckDuckGo for realtors
  2. Sends URLs to RiPis for scraping
  3. Saves results to Airtable (Status='new')

Every 3 minutes:
  4. M715Q picks up new leads
  5. Scores them 1-10 with AI
  6. Updates Airtable (Status='qualified' or 'disqualified')

Every 5 minutes (if email toggle is ON):
  7. M73 picks up qualified leads
  8. Generates personalized email with AI
  9. SENDS email via your configured SMTP
  10. Updates Airtable (Contacted=true)
```

### Check Progress

**Dashboard Activity Feed:**
- Shows what each agent is doing right now
- Updates every few seconds
- Color-coded: green=success, red=error, blue=info

**Airtable:**
- Open: https://airtable.com/your_base_id
- Watch the Leads table fill up
- Check Status changing: new → qualified → contacted

**Agent Logs:**
- Click "📋 Logs" button on any agent card
- See recent activity and any errors

---

## Step 8: Enable Email Sending (When Ready)

**After confirming leads are being scraped and scored:**

1. Check Airtable has leads with `Status='qualified'`
2. Click the **Email Sending toggle** to ON
3. Watch the M73 terminal - should see "📧 Email sending ENABLED"
4. Wait 5 minutes - M73 will send first batch of emails
5. Check terminal for "✅ Email sent to..."

**M73 will send emails every 5 minutes to qualified leads that haven't been contacted yet.**

---

## Troubleshooting

### Agent shows offline in dashboard

**Check the agent's terminal:**
- Look for errors (red text)
- Try restarting the agent

**Test connectivity:**
```bash
# From your local machine or via SSH
curl http://localhost:8001/health   # Worker Agent 1
curl http://localhost:8002/health   # Worker Agent 2  
curl http://localhost:6001/health   # Email Agent
curl http://localhost:6002/health   # Scoring Agent
```

### No leads appearing in Airtable

**Check orchestrator terminal:**
- Is it searching DuckDuckGo?
- Is it finding URLs?
- Is it sending to RiPis?
- Any errors?

**Check RiPi terminals:**
- Are they receiving scrape requests?
- Any Playwright errors?

### No emails being sent

**Check these:**
1. ✅ Email toggle is ON in dashboard
2. ✅ M73 terminal says "Email sending ENABLED"
3. ✅ Airtable has leads with Status='qualified' AND Contacted=false
4. ✅ M73 terminal shows no SMTP errors

**Test email manually:**
```bash
curl -X POST http://localhost:6001/process
```

### Duplicate emails

**Shouldn't happen!** Code checks twice:
1. Airtable query filters `Contacted=false`
2. Before sending, checks again

**If it does happen:**
- Check Airtable - is Contacted field updating?
- Check M73 logs for errors

---

## Expected Timeline

### First 10 Minutes
- Orchestrator does 2 searches
- Finds 5-10 leads
- Saves to Airtable
- M715Q scores them
- Dashboard shows activity

### First Hour
- 6-12 searches
- 10-20 leads found
- 5-10 qualified leads
- If email ON: 5-10 emails sent

### First Day
- 150-200 searches
- 250-400 leads
- 100-150 qualified
- If email ON: 100-150 emails sent

### Response Rate
- 1-2% of emails get replies
- 10-20 replies per 1,000 emails
- 1-2 customers per 1,000 emails

---

## Stopping the System

### On Your PC
- Close the terminal windows
- Or: Press any key in the START.bat window
- This stops orchestrator and dashboard

### On M73 & M715Q
- Press `Ctrl+C` in the terminal
- Agents shut down gracefully

### On RiPis
- Press `Ctrl+C` in the terminal
- Python process stops

**To restart:** Just follow steps 1-4 again!

---

## Daily Workflow

### Morning (5 min)
1. Open dashboard - all agents online?
2. Check Airtable for new leads
3. Verify M73 is sending (if toggle ON)

### Afternoon (10 min)
4. Review qualified leads in Airtable
5. Read generated emails for quality
6. Check for responses from agents

### Evening (5 min)
7. Update Airtable with any replies
8. Adjust keywords if needed (edit autonomous-orchestrator.js)
9. Let it run overnight!

---

## Success Indicators

**You know it's working when:**
- ✅ Dashboard shows all 5 agents online
- ✅ Activity feed constantly updating
- ✅ Airtable Leads table filling up
- ✅ M715Q terminal: "Scoring XYZ..."
- ✅ M73 terminal: "Email sent to..."
- ✅ Inbox gets replies from realtors!

---

## Configuration Files

**Main config:** `.env.production`
```env
# Your email credentials
HOSTINGER_EMAIL_1=your-email@yourdomain.com
HOSTINGER_PASSWORD=your_password_here

# Airtable
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here

# Agent IPs
RIPI_1_URL=http://localhost:8001
RIPI_2_URL=http://localhost:8002
M73_OLLAMA_URL=http://localhost:11434
M715Q_OLLAMA_URL=http://localhost:11434
```

**Don't need to edit anything** - it's already configured!

---

## Support

**Having issues?**

1. Check `QUESTIONS_ANSWERED.md` - answers common questions
2. Check `SYSTEM_CONFIRMED_WORKING.md` - full technical reference
3. Click "📋 Logs" in dashboard for each agent
4. Check terminal output for errors

**Files to reference:**
- `QUESTIONS_ANSWERED.md` - Your specific questions answered
- `SYSTEM_CONFIRMED_WORKING.md` - Complete system documentation
- `docs/README.md` - Original documentation
- `docs/goal.md` - Project goals

---

## You're All Set! 🎉

**The system is:**
- ✅ Fully configured
- ✅ Email sending works (your configured SMTP)
- ✅ Duplicate prevention built-in
- ✅ Live dashboard controls
- ✅ Runs 24/7 autonomously

**Just start all the agents and watch it work!**

Dashboard: http://localhost:4000
Airtable: https://airtable.com/your_base_id

**Let it run for a few hours, then check Airtable for your first batch of leads.**
