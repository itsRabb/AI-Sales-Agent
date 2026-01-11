# 🚀 SUPABASE QUICK START

## What I Created For You

### 📁 Files Created
1. **supabase-db.js** - Node.js database module with all CRUD operations
2. **supabase-schema.sql** - SQL to create all tables (copy/paste in Supabase)
3. **scraper-agent/supabase_db.py** - Python module for RiPi scrapers
4. **migrate-to-supabase.js** - One-time migration script from Airtable
5. **SUPABASE_MIGRATION.md** - Complete step-by-step guide
6. **setup-supabase.bat** - Windows setup script
7. **setup-supabase.sh** - Linux setup script (for RiPis)

### 📋 Your Checklist

#### Step 1: Create Supabase Account (2 minutes)
- [ ] Go to https://supabase.com
- [ ] Sign up with GitHub/email
- [ ] Create new project
- [ ] Choose region (US East)
- [ ] Set strong database password
- [ ] Wait for project creation (~2 mins)

#### Step 2: Get Your Credentials (30 seconds)
- [ ] Go to: Settings → API
- [ ] Copy **Project URL**
- [ ] Copy **anon/public key**
- [ ] Copy **service_role key** (optional, for admin tasks)

#### Step 3: Add to .env File (1 minute)
Add these three lines to your `.env` file:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
USE_SUPABASE=false
```

#### Step 4: Create Database Tables (1 minute)
- [ ] Open Supabase dashboard
- [ ] Click "SQL Editor" in sidebar
- [ ] Click "New Query"
- [ ] Open `supabase-schema.sql` file
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run" button
- [ ] Verify 4 tables created: leads, outreach, profiles, unsubscribe

#### Step 5: Install Dependencies (30 seconds)
Run in your project folder:
```bash
npm install @supabase/supabase-js
```

Or just run:
```bash
setup-supabase.bat
```

#### Step 6: Test Connection (10 seconds)
```bash
node -e "require('./supabase-db.js').isSupabaseConfigured() && console.log('✅ Working!')"
```

Should see: `✅ Supabase connected`

#### Step 7: Migrate Existing Data (optional, 5-10 minutes)
If you have existing Airtable data:
```bash
node migrate-to-supabase.js
```

This will copy all leads from Airtable to Supabase.

#### Step 8: Go Live! (instant)
When ready to switch:
1. Change `.env`: `USE_SUPABASE=true`
2. Restart orchestrator
3. Done! 🎉

---

## What Happens Next

### Testing Phase (Recommended: 24 hours)
- System writes to **BOTH** Airtable AND Supabase
- You can compare data to verify accuracy
- Zero risk - Airtable still works as backup

### Production Phase
- Set `USE_SUPABASE=true`
- System uses only Supabase
- Faster performance
- Unlimited storage (compared to 5000 rows)

---

## Quick Comparison

| Feature | Airtable Free | Supabase Free |
|---------|---------------|---------------|
| **Max Rows** | 5,000 | 500,000+ |
| **Storage** | Limited | 500MB |
| **API Calls** | 5/sec | Unlimited |
| **Speed** | Moderate | Fast (Postgres) |
| **Cost** | $0 → $20/mo | $0 → $25/mo |
| **Scaling** | Hard limit | Easy |

---

## Support Commands

### Check if Supabase is working:
```bash
node -e "console.log(require('./supabase-db.js').isSupabaseConfigured() ? 'Yes' : 'No')"
```

### View table in Supabase:
1. Go to dashboard
2. Click "Table Editor"
3. Select "leads" table
4. See all data in real-time

### Count leads by source:
In SQL Editor:
```sql
SELECT source_site, COUNT(*) as count 
FROM leads 
GROUP BY source_site;
```

### Rollback to Airtable:
Change `.env`: `USE_SUPABASE=false`

---

## Need Help?

**Common Issues:**

❌ "Supabase not configured"
→ Check .env has SUPABASE_URL and SUPABASE_ANON_KEY

❌ "Table doesn't exist"
→ Run supabase-schema.sql in SQL Editor

❌ "Connection failed"
→ Verify project URL is correct (should end in .supabase.co)

---

**You're all set! Let me know when you have the credentials and I'll help you test it.**
