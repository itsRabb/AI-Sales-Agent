"""
Supabase Database Module for Python (RiPi Scrapers)
Handles lead saving from scrapers to Supabase
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
USE_SUPABASE = os.getenv('USE_SUPABASE', 'false').lower() == 'true'

def is_supabase_configured() -> bool:
    """Check if Supabase credentials are available"""
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY)

def save_lead_to_supabase(lead_data: Dict) -> Optional[str]:
    """
    Save a single lead to Supabase
    
    Args:
        lead_data: Dictionary with name, email, phone, company, location, etc.
        
    Returns:
        Lead ID (UUID) if successful, None if failed
    """
    if not is_supabase_configured():
        print("⚠️ Supabase not configured - skipping")
        return None
    
    try:
        # Prepare lead record
        lead_record = {
            'name': lead_data.get('name'),
            'company': lead_data.get('company') or lead_data.get('brokerage'),
            'location': lead_data.get('location'),
            'email': lead_data.get('email'),
            'phone': lead_data.get('phone'),
            'score': lead_data.get('score'),
            'status': 'New',
            'notes': f"Scraped from {lead_data.get('source_site', 'unknown')}",
            'source_site': lead_data.get('source_site'),
            'source_url': lead_data.get('source_url'),
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Check for duplicates first
        if lead_record['email']:
            headers = {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
                'Content-Type': 'application/json'
            }
            
            # Query for existing lead
            check_url = f"{SUPABASE_URL}/rest/v1/leads?email=eq.{lead_record['email']}&select=id"
            check_response = requests.get(check_url, headers=headers)
            
            if check_response.status_code == 200 and check_response.json():
                existing = check_response.json()[0]
                print(f"⏭️ Duplicate skipped: {lead_record['name']} ({lead_record['email']})")
                return existing['id']
        
        # Insert new lead
        insert_url = f"{SUPABASE_URL}/rest/v1/leads"
        response = requests.post(
            insert_url,
            headers=headers,
            json=lead_record
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                lead_id = result[0]['id']
                print(f"✅ Saved to Supabase: {lead_record['name']}")
                return lead_id
            else:
                print(f"⚠️ Unexpected response format from Supabase")
                return None
        else:
            print(f"❌ Supabase save failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Supabase error: {str(e)}")
        return None

def save_batch_to_supabase(leads: List[Dict]) -> int:
    """
    Save multiple leads to Supabase with duplicate checking
    
    Args:
        leads: List of lead dictionaries
        
    Returns:
        Number of leads successfully saved
    """
    if not is_supabase_configured():
        print("⚠️ Supabase not configured - skipping batch")
        return 0
    
    if not leads:
        return 0
    
    saved_count = 0
    
    try:
        # Define headers first (needed for all operations)
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Get all emails to check for duplicates in one query
        emails = [lead.get('email') for lead in leads if lead.get('email')]
        existing_emails = set()
        
        if emails:
            # Build query for existing emails
            email_list = ','.join([f'"{email}"' for email in emails])
            check_url = f"{SUPABASE_URL}/rest/v1/leads?email=in.({email_list})&select=email"
            check_response = requests.get(check_url, headers=headers)
            
            if check_response.status_code == 200:
                existing_emails = {lead['email'] for lead in check_response.json()}
        
        # Prepare batch insert (non-duplicates only)
        new_leads = []
        for lead in leads:
            if lead.get('email') and lead['email'] in existing_emails:
                print(f"⏭️ Duplicate skipped: {lead.get('name')}")
                continue
            
            new_leads.append({
                'name': lead.get('name'),
                'company': lead.get('company') or lead.get('brokerage'),
                'location': lead.get('location'),
                'email': lead.get('email'),
                'phone': lead.get('phone'),
                'score': lead.get('score'),
                'status': 'New',
                'notes': f"Scraped from {lead.get('source_site', 'unknown')}",
                'source_site': lead.get('source_site'),
                'source_url': lead.get('source_url'),
                'created_at': datetime.utcnow().isoformat()
            })
        
        if not new_leads:
            print("⏭️ No new leads to save (all duplicates)")
            return 0
        
        # Batch insert
        insert_url = f"{SUPABASE_URL}/rest/v1/leads"
        response = requests.post(
            insert_url,
            headers=headers,
            json=new_leads
        )
        
        if response.status_code in [200, 201]:
            saved_count = len(new_leads)
            print(f"✅ Saved {saved_count} leads to Supabase")
            return saved_count
        else:
            print(f"❌ Batch save failed: {response.status_code} - {response.text}")
            return 0
            
    except Exception as e:
        print(f"❌ Batch save error: {str(e)}")
        return 0

def get_lead_count_by_source() -> Dict[str, int]:
    """
    Get count of leads grouped by source_site
    
    Returns:
        Dictionary with source_site as key, count as value
    """
    if not is_supabase_configured():
        return {}
    
    try:
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}'
        }
        
        url = f"{SUPABASE_URL}/rest/v1/leads?select=source_site"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            leads = response.json()
            counts = {}
            for lead in leads:
                source = lead.get('source_site', 'unknown')
                counts[source] = counts.get(source, 0) + 1
            return counts
        else:
            return {}
            
    except Exception as e:
        print(f"❌ Count error: {str(e)}")
        return {}
