"""LinkedIn public profile enrichment (no login required)."""

from typing import Dict, Any, Optional
import asyncio
import requests
from bs4 import BeautifulSoup
import re


def extract_meta_content(soup: BeautifulSoup, property_name: str) -> Optional[str]:
    """Extract content from meta tag"""
    meta = soup.find("meta", property=property_name) or soup.find("meta", attrs={"name": property_name})
    return meta.get("content") if meta else None


def clean_text(text: Optional[str]) -> Optional[str]:
    """Clean and normalize text"""
    if not text:
        return None
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


async def enrich_linkedin_profile(url: str, timeout: int = 15) -> Dict[str, Any]:
    """
    Enrich a realtor profile with LinkedIn data.
    
    Args:
        url: LinkedIn profile URL
        timeout: Request timeout in seconds
        
    Returns:
        Enrichment data: {headline, company, location, avatar_url, bio}
    """
    
    enrichment = {
        "headline": None,
        "company": None,
        "location": None,
        "avatar_url": None,
        "bio": None,
        "linkedin_url": url
    }
    
    try:
        # Fetch the public profile page
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract from Open Graph meta tags (most reliable for public profiles)
        full_name = extract_meta_content(soup, "og:title")
        description = extract_meta_content(soup, "og:description")
        enrichment["avatar_url"] = extract_meta_content(soup, "og:image")
        enrichment["bio"] = clean_text(description)
        
        # Parse description for headline and location
        # Format is typically: "Headline | Location" or "Headline at Company | Location"
        if description:
            parts = description.split(" | ")
            if len(parts) > 0:
                headline_part = parts[0]
                enrichment["headline"] = clean_text(headline_part)
                
                # Extract company from "at Company" pattern
                if " at " in headline_part:
                    company_match = re.search(r' at (.+)$', headline_part)
                    if company_match:
                        enrichment["company"] = clean_text(company_match.group(1))
            
            if len(parts) > 1:
                enrichment["location"] = clean_text(parts[-1])
        
        # Try to extract from JSON-LD structured data
        json_ld = soup.find("script", type="application/ld+json")
        if json_ld:
            import json
            try:
                ld_data = json.loads(json_ld.string)
                
                # Handle @graph structure
                if "@graph" in ld_data:
                    for item in ld_data["@graph"]:
                        if item.get("@type") == "Person":
                            if not enrichment["headline"] and "jobTitle" in item:
                                enrichment["headline"] = clean_text(item["jobTitle"])
                            if not enrichment["company"] and "worksFor" in item:
                                if isinstance(item["worksFor"], dict):
                                    enrichment["company"] = clean_text(item["worksFor"].get("name"))
                                else:
                                    enrichment["company"] = clean_text(item["worksFor"])
                
                # Handle direct Person object
                elif ld_data.get("@type") == "Person":
                    if not enrichment["headline"] and "jobTitle" in ld_data:
                        enrichment["headline"] = clean_text(ld_data["jobTitle"])
                    if not enrichment["company"] and "worksFor" in ld_data:
                        if isinstance(ld_data["worksFor"], dict):
                            enrichment["company"] = clean_text(ld_data["worksFor"].get("name"))
                        else:
                            enrichment["company"] = clean_text(ld_data["worksFor"])
            except:
                pass
        
        return enrichment
        
    except Exception as e:
        print(f"⚠️ LinkedIn enrichment failed for {url}: {e}")
        return enrichment


def search_linkedin_profile(realtor_name: str, company: Optional[str] = None) -> Optional[str]:
    """
    Search for a realtor's LinkedIn profile URL using Google.
    
    Args:
        realtor_name: Full name of the realtor
        company: Optional company/brokerage name
        
    Returns:
        LinkedIn profile URL if found, None otherwise
    """
    try:
        # Build search query
        query = f"{realtor_name} realtor linkedin"
        if company:
            query += f" {company}"
        
        # Use Google search via requests
        search_url = "https://www.google.com/search"
        params = {"q": query}
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(search_url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find LinkedIn URL in search results
        for link in soup.find_all('a', href=True):
            href = link['href']
            if 'linkedin.com/in/' in href:
                # Extract clean LinkedIn URL
                match = re.search(r'(https?://[^/]*linkedin\.com/in/[^/?&]+)', href)
                if match:
                    return match.group(1)
        
        return None
        
    except Exception as e:
        print(f"⚠️ LinkedIn search failed for {realtor_name}: {e}")
        return None
