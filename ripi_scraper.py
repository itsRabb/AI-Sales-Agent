"""
TEST SCRIPT: URL Discovery System
Tests the discovery → assignment → scraping pipeline
"""

import requests
import json
import time
import os

# Use environment variable or default to orchestrator IP
ORCHESTRATOR_URL = os.getenv('ORCHESTRATOR_URL', 'http://localhost:5000')

def test_url_discovery():
    """Test discovering URLs for cities"""
    print("\n🧪 TEST 1: URL Discovery")
    print("=" * 60)
    
    # All 50 states - one major city per state for comprehensive testing
    cities = [
        # Alabama to California
        {"city": "Birmingham", "state": "AL"},
        {"city": "Anchorage", "state": "AK"},
        {"city": "Phoenix", "state": "AZ"},
        {"city": "Little Rock", "state": "AR"},
        {"city": "Los Angeles", "state": "CA"},
        {"city": "San Diego", "state": "CA"},
        {"city": "San Francisco", "state": "CA"},
        # Colorado to Florida
        {"city": "Denver", "state": "CO"},
        {"city": "Hartford", "state": "CT"},
        {"city": "Wilmington", "state": "DE"},
        {"city": "Miami", "state": "FL"},
        {"city": "Tampa", "state": "FL"},
        {"city": "Orlando", "state": "FL"},
        # Georgia to Illinois
        {"city": "Atlanta", "state": "GA"},
        {"city": "Honolulu", "state": "HI"},
        {"city": "Boise", "state": "ID"},
        {"city": "Chicago", "state": "IL"},
        {"city": "Naperville", "state": "IL"},
        # Indiana to Maine
        {"city": "Indianapolis", "state": "IN"},
        {"city": "Des Moines", "state": "IA"},
        {"city": "Kansas City", "state": "KS"},
        {"city": "Louisville", "state": "KY"},
        {"city": "New Orleans", "state": "LA"},
        {"city": "Portland", "state": "ME"},
        # Maryland to Missouri
        {"city": "Baltimore", "state": "MD"},
        {"city": "Boston", "state": "MA"},
        {"city": "Detroit", "state": "MI"},
        {"city": "Minneapolis", "state": "MN"},
        {"city": "Jackson", "state": "MS"},
        {"city": "St Louis", "state": "MO"},
        # Montana to New York
        {"city": "Billings", "state": "MT"},
        {"city": "Omaha", "state": "NE"},
        {"city": "Las Vegas", "state": "NV"},
        {"city": "Henderson", "state": "NV"},
        {"city": "Reno", "state": "NV"},
        {"city": "Manchester", "state": "NH"},
        {"city": "Newark", "state": "NJ"},
        {"city": "Albuquerque", "state": "NM"},
        {"city": "New York", "state": "NY"},
        # North Carolina to Pennsylvania
        {"city": "Charlotte", "state": "NC"},
        {"city": "Fargo", "state": "ND"},
        {"city": "Columbus", "state": "OH"},
        {"city": "Oklahoma City", "state": "OK"},
        {"city": "Portland", "state": "OR"},
        {"city": "Philadelphia", "state": "PA"},
        {"city": "Providence", "state": "RI"},
        # South Carolina to Texas
        {"city": "Charleston", "state": "SC"},
        {"city": "Sioux Falls", "state": "SD"},
        {"city": "Nashville", "state": "TN"},
        {"city": "Houston", "state": "TX"},
        {"city": "Dallas", "state": "TX"},
        {"city": "Austin", "state": "TX"},
        # Utah to Wyoming
        {"city": "Salt Lake City", "state": "UT"},
        {"city": "Burlington", "state": "VT"},
        {"city": "Virginia Beach", "state": "VA"},
        {"city": "Seattle", "state": "WA"},
        {"city": "Charleston", "state": "WV"},
        {"city": "Milwaukee", "state": "WI"},
        {"city": "Cheyenne", "state": "WY"},
    ]
    
    print(f"📍 Discovering directories for: {', '.join([c['city'] for c in cities])}")
    
    response = requests.post(
        f'{ORCHESTRATOR_URL}/api/discover-urls',
        json={'cities': cities}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Discovery successful!")
        print(f"   📊 Discovered: {data.get('discovered')} directories")
        print(f"   🤖 RiPi #1: {data.get('assignments', {}).get('ripi1')} URLs")
        print(f"   🤖 RiPi #2: {data.get('assignments', {}).get('ripi2')} URLs")
        
        print("\n📋 Discovered directories:")
        for i, directory in enumerate(data.get('directories', [])[:5], 1):
            has_names = '✅' if directory.get('hasNames') else '❌'
            has_emails = '✅' if directory.get('hasEmails') else '❌'
            has_company = '✅' if directory.get('hasCompany') else '❌'
            has_location = '✅' if directory.get('hasLocation') else '❌'
            print(f"   {i}. {directory.get('url')}")
            print(f"      {directory.get('confidence')} | Names:{has_names} Emails:{has_emails} Company:{has_company} Location:{has_location}")
        
        if data.get('discovered') > 5:
            print(f"   ... and {data.get('discovered') - 5} more")
        
        return data
    else:
        print(f"❌ Discovery failed: {response.status_code}")
        print(f"   {response.text}")
        return None


def test_queue_status():
    """Check queue status"""
    print("\n🧪 TEST 2: Queue Status")
    print("=" * 60)
    
    response = requests.get(f'{ORCHESTRATOR_URL}/api/queue-status')
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Queue status:")
        print(f"   🤖 RiPi #1: {data.get('ripi1', {}).get('pending')} pending")
        print(f"      Current: {data.get('ripi1', {}).get('currentURL') or 'None'}")
        print(f"   🤖 RiPi #2: {data.get('ripi2', {}).get('pending')} pending")
        print(f"      Current: {data.get('ripi2', {}).get('currentURL') or 'None'}")
        print(f"   ✅ Completed: {data.get('completed')}")
        print(f"   🔄 In Progress: {data.get('totalInProgress')}")
        return data
    else:
        print(f"❌ Queue check failed: {response.status_code}")
        return None


def test_ripi_next_url(ripi_id):
    """Test getting next URL for a RiPi"""
    print(f"\n🧪 TEST 3: Get Next URL for {ripi_id.upper()}")
    print("=" * 60)
    
    response = requests.get(f'{ORCHESTRATOR_URL}/api/ripi/{ripi_id}/next-url')
    
    if response.status_code == 200:
        data = response.json()
        if data.get('hasWork'):
            directory = data.get('directory', {})
            print(f"\n✅ {ripi_id.upper()} got work:")
            print(f"   URL: {directory.get('url')}")
            print(f"   City: {directory.get('city')}, {directory.get('state')}")
            print(f"   Confidence: {directory.get('confidence')}")
            return directory
        else:
            print(f"\n⏸️ No work available for {ripi_id.upper()}")
            return None
    else:
        print(f"❌ Failed: {response.status_code}")
        return None


def test_complete_url(ripi_id, url, agents_saved=100):
    """Test marking URL as complete"""
    print(f"\n🧪 TEST 4: Mark URL Complete")
    print("=" * 60)
    
    response = requests.post(
        f'{ORCHESTRATOR_URL}/api/ripi/{ripi_id}/complete',
        json={'url': url, 'stats': {'agentsSaved': agents_saved}}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Marked as complete:")
        print(f"   URL: {url}")
        print(f"   Agents saved: {agents_saved}")
        print(f"   Status: {data.get('status')}")
        return True
    else:
        print(f"❌ Failed: {response.status_code}")
        return False


def run_all_tests():
    """Run complete test suite"""
    print("\n" + "=" * 60)
    print("🚀 TESTING URL DISCOVERY & ASSIGNMENT SYSTEM")
    print("=" * 60)
    
    # Test 1: Discover URLs
    discovery_result = test_url_discovery()
    
    if not discovery_result:
        print("\n❌ Discovery failed - cannot continue tests")
        return
    
    time.sleep(2)
    
    # Test 2: Check queue
    test_queue_status()
    
    time.sleep(1)
    
    # Test 3: Get next URL for RiPi #1
    ripi1_url = test_ripi_next_url('ripi1')
    
    time.sleep(1)
    
    # Test 4: Get next URL for RiPi #2
    ripi2_url = test_ripi_next_url('ripi2')
    
    time.sleep(1)
    
    # Test 5: Mark RiPi #1 URL as complete
    if ripi1_url:
        test_complete_url('ripi1', ripi1_url.get('url'), agents_saved=150)
    
    time.sleep(1)
    
    # Test 6: Check queue again to see changes
    test_queue_status()
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    try:
        run_all_tests()
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()
