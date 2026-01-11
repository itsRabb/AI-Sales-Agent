"""
RIPI SCRAPER - Lightweight version for Raspberry Pi
Scrapes realtor directory URLs and saves to Supabase
Optional LinkedIn enrichment for additional contact info
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
from datetime import datetime, timezone
import os
import requests
from pathlib import Path
from bs4 import BeautifulSoup
import re

# Import Supabase module
from supabase_db import save_batch_to_supabase

# Import LinkedIn enrichment
from scrapers.linkedin import enrich_linkedin_profile, search_linkedin_profile

# Load .env from parent directory
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

app = FastAPI(title="RiPi Scraper Agent")

class ScrapeRequest(BaseModel):
    urls: List[str]
    enable_linkedin: Optional[bool] = False  # LinkedIn enrichment off by default

    location: Optional[str] = None


@app.get("/health")
async def health_check():
    """Health check endpoint for orchestrator"""
    return {
        "status": "healthy",
        "service": "ripi_scraper",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/restart")
async def restart_service():
    """Restart endpoint (placeholder for orchestrator compatibility)"""
    return {
        "success": True,
        "message": "Restart signal received",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# Simple in-memory log storage
activity_log = []

@app.get("/logs")
async def get_logs():
    """Return recent activity logs"""
    return {
        "logs": activity_log[-100:],  # Last 100 entries
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def parse_directory_page(html: str, url: str) -> List[Dict]:
    """
    Simple parser to extract realtor info from directory HTML.
    Strict filtering to avoid garbage like form labels and navigation.
    """
    soup = BeautifulSoup(html, 'html.parser')
    agents = []
    seen_names = set()
    
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    phone_pattern = r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    
    # STRICT name pattern: First Last (both must be 3+ chars, alpha only)
    name_pattern = r'\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b'
    
    # Blacklist common garbage patterns (form labels, nav, etc)
    blacklist = {
        'first name', 'last name', 'phone number', 'email address',
        'about us', 'contact us', 'privacy policy', 'terms of', 'terms service',
        'all rights', 'copyright', 'view profile', 'learn more', 'get started',
        'sign up', 'log in', 'home page', 'our team', 'our directory',
        'cost report', 'free cost', 'describe your', 'join our', 'get listed',
        'member login', 'promote your', 'partner network', 'your privacy',
        'real estate agents', 'estate agents', 'real estate', 'california real',
        'networking groups', 'business listing', 'free business', 'estate directory',
        # Company/business words that aren't person names
        'brokers', 'brokerage', 'realty', 'properties', 'appraisal', 'banker',
        'realtors', 'coldwell', 'century', 'keller williams', 'sotheby', 're/max',
        'associate', 'associates', 'preferred banker',
        # Street/location indicators
        'avenue', 'street', 'boulevard', 'drive', 'road', 'lane', 'way', 'circle',
        'ave', 'blvd', 'st ', 'dr ', 'rd ', 'ln ', ' ave', ' blvd', ' st', ' dr',
        # Navigation/action verbs
        'compare', 'select', 'open ', 'update', 'collapse', 'help ', 'need help',
        'get pre', 'stay updated', 'quick links',
        # Form labels and sections
        'feedback', 'compliment', 'problem', 'suggestion', 'website ',
        'contact information', 'personal information', 'cookie preferences',
        # Generic page elements
        'all offices', 'all agents', 'all homes', 'all real', 'open houses',
        'move meter', 'fair housing', 'selling your', 'not sell',
        # Generic words that appear in names but aren't people
        'find ', 'free ', 'report', 'estimate', 'listing', 'group', 'network'
    }
    
    # Common city/location names to skip
    locations = {'los angeles', 'beverly hills', 'marina del', 'del rey', 'san pedro',
                 'palos verdes', 'huntington beach', 'venice blvd', 'san vicente',
                 'hancock park', 'santa monica', 'west hollywood', 'silver lake'}
    
    # Look for names in common HTML structures
    priority_tags = soup.find_all(['td', 'h2', 'h3', 'h4', 'span', 'div', 'a', 'p'])
    
    for tag in priority_tags:
        # Skip containers with many children
        if len(list(tag.find_all())) > 3:
            continue
            
        text = tag.get_text(strip=True)
        
        # Skip if too short or too long
        if len(text) < 5 or len(text) > 50:
            continue
        
        # Find names
        names = re.findall(name_pattern, text)
        
        for name in names:
            name = name.strip()
            name_lower = name.lower()
            
            # Skip if already seen
            if name in seen_names:
                continue
            
            # Skip blacklisted patterns
            if any(pattern in name_lower for pattern in blacklist):
                continue
            
            # Skip location names
            if any(loc in name_lower for loc in locations):
                continue
            
            # Skip names with numbers, special chars, or all caps
            if any(char.isdigit() for char in name):
                continue
            if name.isupper():
                continue
            if any(char in name for char in ['@', '#', '$', '%', '&', '*']):
                continue
            
            # Both first and last name must be 3+ characters
            parts = name.split()
            if len(parts) < 2 or any(len(part) < 3 for part in parts):
                continue
            
            # Skip single-letter initials (e.g., "J Smith")
            if any(len(part) == 1 for part in parts):
                continue
                
            seen_names.add(name)
            
            # Try to find email/phone nearby
            parent = tag.parent
            nearby_text = parent.get_text() if parent else text
            
            block_emails = re.findall(email_pattern, nearby_text)
            block_phones = re.findall(phone_pattern, nearby_text)
            
            agent = {
                "name": name,
                "email": block_emails[0] if block_emails else None,
                "phone": block_phones[0] if block_phones else None,
                "company": None,
                "source_url": url,
                "scraped_at": datetime.now(timezone.utc).isoformat()
            }
            
            agents.append(agent)
    
    return agents


def save_batch_with_supabase(agents: List[Dict], batch_num: int) -> int:
    """Save a batch of agents to Supabase, returns count of saved records"""
    if not agents:
        return 0
    
    try:
        # Use the imported function from supabase_db module
        saved_count = save_batch_to_supabase(agents)
        log_activity(f"✅ Saved {saved_count}/{len(agents)} agents to Supabase (batch {batch_num})")
        return saved_count
    except Exception as e:
        log_activity(f"❌ Failed to save batch to Supabase: {e}")
        return 0


def log_activity(message: str):
    """Add to activity log"""
    activity_log.append(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] {message}")
    print(message)  # Also print to console


@app.post("/scrape")
async def scrape_urls(request: ScrapeRequest):
    """
    Scrape directory URLs using site-specific smart parsers
    
    Returns all extracted agents (unfiltered) for Supabase storage
    AI filtering happens later on M73/M715Q brains
    """
    
    all_agents = []
    
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise HTTPException(status_code=500, detail="playwright not installed")
    
    async with async_playwright() as p:
        # Lightweight browser for Pi
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security'
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        # Stealth patches
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = {runtime: {}};
        """)
        
        page = await context.new_page()
        
        for url in request.urls:
            try:
                log_activity(f"🌐 Scraping: {url}")
                
                # Navigate and wait for content
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                await page.wait_for_timeout(2000)
                
                # Special handling for chicagorealtor.com (button-based pagination)
                if 'chicagorealtor.com' in url.lower():
                    log_activity("📊 ChicagoRealtor detected - scraping with incremental Supabase saves")
                    
                    max_pages = 100  # High limit - will stop when Next button is disabled or missing
                    page_batch = []  # Collect agents for current batch
                    batch_num = 1
                    total_saved = 0
                    
                    for page_num in range(1, max_pages + 1):
                        log_activity(f"🔹 Scraping page {page_num}")
                        
                        # Wait for table to load
                        try:
                            await page.wait_for_selector('table#realtors', timeout=15000)
                            await page.wait_for_timeout(3000)  # Extra time for lazy-load
                        except:
                            log_activity(f"⚠️ Table not found on page {page_num}")
                            break
                        
                        # Scroll to load all table rows on current page
                        for scroll in range(5):
                            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                            await page.wait_for_timeout(1500)
                        
                        # Get HTML and parse current page
                        html = await page.content()
                        log_activity(f"📄 Page {page_num}: Got {len(html)} chars")
                        
                        # Parse with simple parser
                        page_agents = parse_directory_page(html, url)
                        log_activity(f"✅ Page {page_num}: Parsed {len(page_agents)} agents")
                        page_batch.extend(page_agents)
                        
                        # Every 5 pages, save to Supabase and clear memory
                        if page_num % 5 == 0:
                            log_activity(f"💾 Saving batch {batch_num} ({len(page_batch)} agents) to Supabase...")
                            saved = save_batch_with_supabase(page_batch, batch_num)
                            total_saved += saved
                            log_activity(f"✅ Batch {batch_num}: Saved {saved}/{len(page_batch)} agents to Supabase")
                            page_batch = []  # Clear memory
                            batch_num += 1
                        
                        # Look for Next button and click it
                        next_button = await page.query_selector('a.page-link:has-text("Next")')
                        if not next_button:
                            next_button = await page.query_selector('button:has-text("Next")')
                        
                        if next_button:
                            # Check if it's disabled
                            is_disabled = await next_button.get_attribute('disabled')
                            if is_disabled:
                                log_activity(f"✅ Reached last page at page {page_num}")
                                break
                            
                            # Click Next and wait for page to load
                            await next_button.click()
                            await page.wait_for_timeout(3000)  # Wait for navigation
                        else:
                            log_activity(f"✅ No Next button found on page {page_num}")
                            break
                    
                    # Save any remaining agents in final partial batch
                    if page_batch:
                        log_activity(f"💾 Saving final batch ({len(page_batch)} agents) to Supabase...")
                        saved = save_batch_with_supabase(page_batch, batch_num)
                        total_saved += saved
                        log_activity(f"✅ Final batch: Saved {saved}/{len(page_batch)} agents")
                    
                    log_activity(f"🎉 Chicago scrape complete: {total_saved} total agents saved to Supabase")
                    
                    # Skip normal parsing since we already did it
                    continue
                
                else:
                    # Default: Scroll 3 times for other sites
                    for i in range(3):
                        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                        await page.wait_for_timeout(1000)
                
                # Get HTML
                html = await page.content()
                log_activity(f"📄 Got {len(html)} chars from {url}")
                
                # Parse with simple parser
                agents = parse_directory_page(html, url)
                log_activity(f"✅ Parsed {len(agents)} agents")
                
                # LinkedIn enrichment if enabled
                if request.enable_linkedin:
                    log_activity(f"🔍 LinkedIn enrichment enabled - searching profiles...")
                    for agent in agents:
                        if agent.get('name'):
                            linkedin_url = search_linkedin_profile(agent['name'], agent.get('company'))
                            if linkedin_url:
                                enrichment = await enrich_linkedin_profile(linkedin_url)
                                agent.update(enrichment)
                                log_activity(f"✅ Enriched {agent['name']} from LinkedIn")
                
                all_agents.extend(agents)
                
                # Save to Supabase immediately after each URL
                if agents:
                    log_activity(f"💾 Saving {len(agents)} agents to Supabase...")
                    saved_count = save_batch_to_supabase(agents)
                    log_activity(f"✅ Saved {saved_count}/{len(agents)} agents to Supabase")
                    
            except Exception as e:
                print(f"❌ Failed {url}: {e}")
                continue
        
        await browser.close()
    
    return {
        'success': True,
        'scraped': len(all_agents),
        'agents': all_agents,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
