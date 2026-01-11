# 🔍 URL Discovery & Assignment System

## Overview

The URL Discovery System automatically finds real estate agent directories across the web using AI strategy generation and pattern matching. It then intelligently assigns discovered URLs to RiPi scrapers for data collection.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR                            │
│  ┌───────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ URL Discovery │→ │ Assignment  │→ │ Queue Manager   │  │
│  │  (AI + Search)│  │  (50/50)    │  │ (State Tracking)│  │
│  └───────────────┘  └─────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
    ┌─────────┐                     ┌─────────┐
    │ RiPi #1 │                     │ RiPi #2 │
    │ (50%)   │                     │ (50%)   │
    └────┬────┘                     └────┬────┘
         │                               │
         └───────────────┬───────────────┘
                         ▼
                  ┌─────────────┐
                  │  SUPABASE   │
                  │  Database   │
                  └─────────────┘
```

## Components

### 1. URL Discovery (`url-discovery.js`)

**Purpose**: Find real estate agent directories using AI + pattern matching

**Functions**:
- `generateSearchStrategy(city, state)`: Uses M715Q Ollama to create 5 smart search queries
- `searchDirectories(query)`: Scrapes DuckDuckGo HTML for directory URLs
- `validateDirectory(url)`: Checks for agent table patterns
- `discoverDirectories(city, state)`: Orchestrates full discovery
- `discoverForCities(cities)`: Batch processes multiple cities

**How it works**:
1. AI generates 5 search queries per city (e.g., "Miami FL realtor directory")
2. DuckDuckGo searches return candidate URLs
3. Pattern matching filters for "realtor", "agent", "directory" keywords
4. Validation checks for HTML tables + multiple agent mentions
5. Returns high/medium confidence directories

**Rate limiting**: 
- 2 seconds between searches
- 1 second between validation batches of 5

### 2. URL Assignment (`url-assignment.js`)

**Purpose**: Distribute discovered URLs to RiPis and track scraping state

**Functions**:
- `assignURLsToRiPis(directories)`: Alternates assignment (even → RiPi #1, odd → RiPi #2)
- `getNextURL(ripiId)`: Returns next URL from queue for specific RiPi
- `markURLComplete(url, ripiId, stats)`: Marks URL as done
- `markURLFailed(url, ripiId, reason)`: Retries up to 3 times, then marks complete
- `getQueueStatus()`: Returns current queue state

**State tracking**:
- `ripi1` queue: URLs assigned to RiPi #1
- `ripi2` queue: URLs assigned to RiPi #2
- `completed`: Set of all finished URLs (deduplicated)
- `inProgress`: Map of URLs currently being scraped with timestamp

**Auto-cleanup**: Stale URLs (stuck for >30min) automatically marked as failed and re-queued

### 3. Orchestrator Endpoints

#### Discovery & Assignment

**POST** `/api/discover-urls`
```json
{
  "cities": [
    {"city": "Miami", "state": "FL"},
    {"city": "Tampa", "state": "FL"}
  ]
}
```
Response:
```json
{
  "success": true,
  "discovered": 15,
  "assignments": {
    "ripi1": 8,
    "ripi2": 7
  },
  "directories": [...],
  "queueStatus": {...}
}
```

#### Queue Management

**GET** `/api/ripi/:ripiId/next-url`
- Returns next URL for specific RiPi
- Returns `hasWork: false` if queue empty

**POST** `/api/ripi/:ripiId/complete`
```json
{
  "url": "https://example.com/agents",
  "stats": {"agentsSaved": 450}
}
```

**POST** `/api/ripi/:ripiId/failed`
```json
{
  "url": "https://example.com/agents",
  "reason": "Parser not found"
}
```

**GET** `/api/queue-status`
- Returns current state of all queues

### 4. RiPi Scrapers

Both RiPi #1 and RiPi #2 use identical scraping logic:

**Two modes**:

1. **Queue Mode (NEW)** - Automatic URL fetching:
   ```python
   # POST /scrape with empty request.urls
   # RiPi automatically fetches next URL from orchestrator
   # Reports completion/failure back to orchestrator
   ```

2. **Legacy Mode** - Direct URL scraping:
   ```python
   # POST /scrape with request.urls = [...]
   # Scrapes provided URLs
   ```

**Key features**:
- Auto-pagination detection (Next button, numbered, arrows)
- Uploads after EVERY page (prevents memory overflow)
- Parser auto-selection based on URL domain
- Reports progress to orchestrator

**Identification**:
- RiPi #1: `ripi_id = 'ripi1'`
- RiPi #2: `ripi_id = 'ripi2'`

## Known Directory Patterns

Automatically detected high-confidence patterns:
- `chicagorealtor.com`
- `realtor.com/realestateagents`
- `zillow.com/professionals`
- `redfin.com/real-estate-agents`
- `compass.com/agents`

Keywords for discovery:
- "realtor directory"
- "agent directory"
- "real estate agents"
- "find agents"

## Usage

### 1. Discover URLs for cities

```bash
curl -X POST http://localhost:5000/api/discover-urls \
  -H "Content-Type: application/json" \
  -d '{"cities": [{"city": "Miami", "state": "FL"}]}'
```

### 2. Check queue status

```bash
curl http://localhost:5000/api/queue-status
```

### 3. Start RiPi scraping (automatic)

RiPi #1:
```bash
curl -X POST http://localhost:8001/scrape \
  -H "Content-Type: application/json" \
  -d '{"urls": []}'
```

RiPi #2:
```bash
curl -X POST http://localhost:8002/scrape \
  -H "Content-Type: application/json" \
  -d '{"urls": []}'
```

### 4. Run test suite

```bash
python test-discovery.py
```

Tests:
- URL discovery for 3 Florida cities
- Queue status checking
- Next URL assignment
- Completion marking
- Queue state updates

## Environment Variables

Add to `.env`:
```env
ORCHESTRATOR_URL=http://localhost:5000
```

## Workflow

### Initial Setup
1. Start orchestrator: `node autonomous-orchestrator.js`
2. Start RiPi #1: `python scraper-agent/ripi_scraper.py`
3. Start RiPi #2: `python scraper-agent/ripi_scraper_ripi2_new.py`

### Discovery & Scraping
1. Orchestrator discovers URLs for target cities
2. URLs automatically assigned 50/50 to RiPi #1 and RiPi #2
3. RiPis request next URL from queue
4. RiPis scrape with pagination, upload every page to Supabase
5. RiPis report completion, get next URL
6. Repeat until queue empty

### Monitoring
```bash
# Check queue
curl http://localhost:5000/api/queue-status

# Check Worker #1 logs
curl http://localhost:8001/logs

# Check Worker #2 logs
curl http://localhost:8002/logs
```

## Error Handling

**URL Discovery Failures**:
- AI strategy falls back to template queries if Ollama fails
- DuckDuckGo scraping continues if some searches fail
- Low-confidence directories filtered out

**Scraping Failures**:
- Failed URLs automatically re-queued (max 3 retries)
- After 3 failures, URL marked complete (prevents infinite loops)
- Stale URLs (stuck >30min) auto-cleaned and re-queued

**Memory Protection**:
- RiPis upload EVERY page before continuing
- No batching (prevents 512MB RAM overflow)
- Sequential processing (one page at a time)

## Advantages

1. **Scalable**: Discovers hundreds of directories automatically
2. **Cost-effective**: AI for strategy only (cheap), not per-page (expensive)
3. **Resilient**: Retry logic, stale cleanup, duplicate prevention
4. **Load balanced**: 50/50 split between RiPis
5. **Memory safe**: Per-page uploads prevent overflow

## Future Enhancements

- [ ] Persist queue to Supabase (survive restarts)
- [ ] Priority scoring for high-value cities
- [ ] Dynamic parser generation for unknown directory formats
- [ ] Scheduled re-scraping (30-day rotation)
- [ ] Multi-city batch discovery
- [ ] Dashboard visualization of queue state

## Files

Core modules:
- `url-discovery.js` - AI strategy + DuckDuckGo search + validation
- `url-assignment.js` - Queue management + state tracking
- `autonomous-orchestrator.js` - REST API endpoints
- `scraper-agent/ripi_scraper.py` - RiPi #1 scraper
- `scraper-agent/ripi_scraper_ripi2_new.py` - RiPi #2 scraper

Testing:
- `test-discovery.py` - Complete test suite
