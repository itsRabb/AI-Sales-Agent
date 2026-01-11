/**
 * INTELLIGENT URL DISCOVERY SYSTEM
 * 
 * Uses AI strategy generation (one-time) + pattern matching (fast)
 * Finds real estate agent directories without expensive per-page AI
 * 
 * Architecture:
 * 1. M715Q Ollama generates search strategy for city (smart queries)
 * 2. DuckDuckGo searches find candidate URLs (fast, free)
 * 3. Pattern matcher validates directories (table detection)
 * 4. Returns verified URLs ready for RiPi scraping
 */

const axios = require('axios');
require('dotenv').config();

const M715Q_OLLAMA = process.env.M715Q_OLLAMA_URL || 'http://localhost:11434/api/generate';

// Global URL tracking - prevents rediscovering same URLs
// CLEAR ON STARTUP to avoid cached bad URLs
const discoveredUrls = new Set();
const validatedUrls = new Set();

// Auto-clear on module load
discoveredUrls.clear();
validatedUrls.clear();
console.log('🔄 URL discovery cache cleared on startup');

// Known directory patterns (used for quick validation)
const KNOWN_PATTERNS = [
    'chicagorealtor.com',
    'realtor.com/realestateagents',
    'zillow.com/professionals',
    'redfin.com/real-estate-agents',
    'houlihanlawrence.com/agents',
    'compass.com/agents',
    'kwcommercial.com/agents',
    'agent', 'agents', 'directory', 'search', 'find-agent', 'team'
];

/**
 * Generate smart search queries using AI (one-time per city)
 * @param {string} city - City name
 * @param {string} state - State abbreviation
 * @param {Array} learnedKeywords - Optional array of successful keywords from learning system
 */
async function generateSearchStrategy(city, state, learnedKeywords = []) {
    console.log(`🧠 Generating search strategy for ${city}, ${state}...`);
    
    // Build keyword hints from learned successful terms
    let keywordHint = '';
    if (learnedKeywords && learnedKeywords.length > 0) {
        const topKeywords = learnedKeywords
            .filter(k => k.successRate > 0.3)
            .slice(0, 3)
            .map(k => k.keyword);
        if (topKeywords.length > 0) {
            keywordHint = `\n\nProven successful search terms to incorporate: ${topKeywords.join(', ')}`;
        }
    }
    
    // Add variety to prevent repetitive queries
    const varietyHint = `\n\nIMPORTANT: Generate DIVERSE and CREATIVE queries. Try variations like:
- Different phrasing ("find realtor", "search agent", "locate broker", "property specialist")
- Different platforms ("MLS directory", "realty search", "brokerage roster", "agent database")
- Specific neighborhoods or suburbs in ${city}
- Regional real estate associations
- Alternative keywords ("home advisor", "real estate consultant", "listing agent finder")`;
    
    const prompt = `You are a web scraping expert finding real estate agent directories.

TARGET: Real estate agents in ${city}, ${state}

Generate 5 UNIQUE Google search queries to find agent directories. Focus on:
- Local MLS association websites
- Regional realtor directories
- Large brokerages with agent listings
- Local real estate boards${keywordHint}${varietyHint}

Return ONLY a JSON array of search queries, no explanation:
["query 1", "query 2", "query 3", "query 4", "query 5"]`;

    try {
        const response = await axios.post(M715Q_OLLAMA, {
            model: 'llama3.1:8b',
            prompt,
            stream: false,
            options: { temperature: 0.8 } // Higher temperature for more variety
        }, { timeout: 60000 });
        
        const aiResponse = response.data.response;
        const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
        
        if (jsonMatch) {
            const queries = JSON.parse(jsonMatch[0]);
            console.log(`✅ Generated ${queries.length} search queries`);
            return queries;
        } else {
            // Fallback to basic queries
            console.log('⚠️ AI response invalid, using fallback queries');
            return generateFallbackQueries(city, state, learnedKeywords);
        }
    } catch (error) {
        console.error('❌ AI strategy generation failed:', error.message);
        return generateFallbackQueries(city, state, learnedKeywords);
    }
}

/**
 * Fallback search queries (if AI fails)
 */
function generateFallbackQueries(city, state, learnedKeywords = []) {
    const baseQueries = [
        `"${city}" ${state} real estate agent directory`,
        `${city} realtor search MLS`,
        `${city} real estate agents list`,
        `${city} ${state} realty directory`,
        `find real estate agent ${city}`
    ];
    
    // If we have learned keywords, incorporate the best one
    if (learnedKeywords && learnedKeywords.length > 0) {
        const bestKeyword = learnedKeywords
            .filter(k => k.successRate > 0.5)
            .sort((a, b) => b.successRate - a.successRate)[0];
        
        if (bestKeyword) {
            baseQueries[0] = `${city} ${state} ${bestKeyword.keyword}`;
            console.log(`📚 Using learned keyword: "${bestKeyword.keyword}" (${(bestKeyword.successRate * 100).toFixed(1)}% success)`);
        }
    }
    
    return baseQueries;
}

/**
 * Search DuckDuckGo for directory URLs with pagination (no API key needed)
 * Continues to next pages until no new URLs found
 */
async function searchDirectories(query, maxPages = 5) {
    console.log(`🔍 Searching: ${query}`);
    
    const allNewUrls = [];
    let foundNewUrls = true;
    let page = 1;
    let nextParams = null;
    
    try {
        while (foundNewUrls && page <= maxPages) {
            console.log(`  📄 Page ${page}...`);
            
            // Build request params
            const params = page === 1 
                ? { q: query }
                : nextParams;
            
            const response = await axios.get('https://html.duckduckgo.com/html/', {
                params,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });
            
            const html = response.data;
            
            // Extract URLs from result links
            const urlPattern = /href="([^"]*(?:realtor|agent|directory|realty|broker)[^"]*)"/gi;
            const matches = html.matchAll(urlPattern);
            
            const pageUrls = [];
            for (const match of matches) {
                let url = match[1];
                
                // Decode DuckDuckGo redirect URLs
                if (url.includes('uddg=')) {
                    const decoded = decodeURIComponent(url.split('uddg=')[1]);
                    url = decoded;
                }
                
                // DECODE HTML ENTITIES FIRST
                url = url.replace(/&amp;/g, '&')
                         .replace(/&quot;/g, '"')
                         .replace(/&#39;/g, "'")
                         .replace(/&lt;/g, '<')
                         .replace(/&gt;/g, '>');
                
                // STRIP tracking parameters
                url = url.split('&rut=')[0]
                         .split('&df=')[0]
                         .split('?rut=')[0]
                         .split('?df=')[0]
                         .split('#')[0];
                
                // Filter out junk and check if already discovered
                if (url.startsWith('http') && 
                    !url.includes('duckduckgo.com') && 
                    !discoveredUrls.has(url)) {
                    pageUrls.push(url);
                    discoveredUrls.add(url);
                }
            }
            
            // Remove duplicates from this page
            const uniquePageUrls = [...new Set(pageUrls)];
            console.log(`  Found ${uniquePageUrls.length} new URLs on page ${page}`);
            
            if (uniquePageUrls.length > 0) {
                allNewUrls.push(...uniquePageUrls);
            } else {
                foundNewUrls = false;
                console.log(`  ⏹️ No new URLs found, stopping pagination`);
                break;
            }
            
            // Look for "Next" pagination link
            const nextMatch = html.match(/\/html\/\?q=[^"]*&s=(\d+)&[^"]*">Next/i);
            if (nextMatch) {
                // Extract next page params from the link
                const nextLinkMatch = html.match(/\/html\/\?([^"]*">Next)/i);
                if (nextLinkMatch) {
                    // Parse query string
                    const queryString = nextLinkMatch[1].replace(/&amp;/g, '&').replace('">Next', '');
                    nextParams = {};
                    queryString.split('&').forEach(param => {
                        const [key, value] = param.split('=');
                        if (key && value) {
                            nextParams[key] = decodeURIComponent(value);
                        }
                    });
                    page++;
                } else {
                    foundNewUrls = false;
                    console.log(`  ⏹️ No next page link found`);
                }
            } else {
                foundNewUrls = false;
                console.log(`  ⏹️ Reached last page`);
            }
            
            // Rate limit: 2 seconds between pages
            if (foundNewUrls) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log(`  ✅ Total ${allNewUrls.length} new URLs found across ${page} pages`);
        return allNewUrls;
        
    } catch (error) {
        console.error(`❌ Search failed: ${error.message}`);
        return allNewUrls; // Return whatever we got before error
    }
}

/**
 * Validate if URL is actually an agent directory with extractable data
 * CRITICAL: Must have NAME, EMAIL, and ideally CITY/STATE
 */
async function validateDirectory(url) {
    try {
        // CRITICAL: Strip ALL tracking parameters FIRST THING
        const originalUrl = url;
        url = url.split('&rut=')[0]
                 .split('&df=')[0]
                 .split('?rut=')[0]
                 .split('?df=')[0]
                 .split('#')[0];
        
        // Skip if already validated
        if (validatedUrls.has(url)) {
            return { valid: false, reason: 'Already validated', hasNames: false, hasEmails: false, hasCompany: false, hasLocation: false };
        }
        
        // Quick keyword check first
        const lowerUrl = url.toLowerCase();
        const hasKeyword = KNOWN_PATTERNS.some(pattern => lowerUrl.includes(pattern));
        
        if (!hasKeyword) {
            validatedUrls.add(url); // Mark as checked
            return { 
                valid: false, 
                reason: 'No directory keywords',
                hasNames: false,
                hasEmails: false,
                hasCompany: false,
                hasLocation: false
            };
        }
        
        // Fetch page HTML
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 8000,
            maxContentLength: 500000 // Only download 500KB max
        });
        
        const html = response.data;
        const htmlLower = html.toLowerCase();
        
        // ========================================
        // CRITICAL DATA FIELD DETECTION
        // ALL 4 FIELDS REQUIRED: Name, Email, Company, Location
        // ========================================
        
        // 1. EMAIL DETECTION - Must have visible email addresses
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emailMatches = html.match(emailRegex) || [];
        const hasEmails = emailMatches.length >= 3; // At least 3 emails visible
        const hasMailto = htmlLower.includes('mailto:');
        
        // 2. NAME DETECTION - Must have agent names (First Last format)
        const namePatterns = [
            /<td[^>]*>\s*([A-Z][a-z]+ [A-Z][a-z]+)/g,  // Table cells
            /<h[2-4][^>]*>\s*([A-Z][a-z]+ [A-Z][a-z]+)/g,  // Headers
            /<span[^>]*>\s*([A-Z][a-z]+ [A-Z][a-z]+)/g,  // Spans
            /class="[^"]*name[^"]*"[^>]*>\s*([A-Z][a-z]+ [A-Z][a-z]+)/g  // Name classes
        ];
        
        let nameMatches = 0;
        for (const pattern of namePatterns) {
            const matches = html.match(pattern) || [];
            nameMatches += matches.length;
        }
        const hasNames = nameMatches >= 5; // At least 5 full names
        
        // 3. COMPANY DETECTION - Must have brokerage/company names
        const companyKeywords = [
            'realty', 'real estate', 'properties', 'group', 'team',
            'keller williams', 'coldwell banker', 'century 21', 're/max',
            'exp realty', 'compass', 'sotheby', 'berkshire hathaway',
            'brokerage', 'brokers', 'associates', 'agency'
        ];
        
        let companyMentions = 0;
        for (const keyword of companyKeywords) {
            const matches = (htmlLower.match(new RegExp(keyword, 'g')) || []).length;
            companyMentions += matches;
        }
        
        // Also look for company name patterns (capitalized multi-word phrases)
        const companyPatterns = [
            /(?:td|span|div)[^>]*>\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s+(?:Realty|Properties|Group|Team|Real Estate))/g,
            /class="[^"]*company[^"]*"[^>]*>\s*([A-Z][a-z]+)/g,
            /class="[^"]*broker[^"]*"[^>]*>\s*([A-Z][a-z]+)/g
        ];
        
        let companyNameMatches = 0;
        for (const pattern of companyPatterns) {
            const matches = html.match(pattern) || [];
            companyNameMatches += matches.length;
        }
        
        const hasCompany = (companyMentions >= 5) || (companyNameMatches >= 3);
        
        // 4. LOCATION DETECTION - City/State info (REQUIRED)
        const stateAbbrevs = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
        const statePattern = new RegExp(`\\b(${stateAbbrevs.join('|')})\\b`, 'g');
        const stateMatches = html.match(statePattern) || [];
        const hasLocation = stateMatches.length >= 5;
        
        // 4. DIRECTORY STRUCTURE
        const hasTable = htmlLower.includes('<table') || htmlLower.includes('class="agent');
        const agentCount = (htmlLower.match(/\bagent\b/g) || []).length;
        const hasMultipleAgents = agentCount >= 10;
        
        // ========================================
        // VALIDATION SCORING
        // ========================================
        
        const score = 
            (hasTable ? 15 : 0) +
            (hasMultipleAgents ? 15 : agentCount * 2) +
            (hasEmails ? 25 : 0) +    // Critical
            (hasMailto ? 5 : 0) +
            (hasNames ? 25 : 0) +     // Critical
            (hasCompany ? 20 : 0) +   // Critical
            (hasLocation ? 20 : 0);   // Critical
        
        // MUST have ALL 4 fields: Names, Emails, Company, Location
        const meetsDataRequirements = hasNames && hasEmails && hasCompany && hasLocation;
        
        // Mark as validated regardless of result
        validatedUrls.add(url);
        
        // SEND TO RIPI IF: Has names + emails OR score >= 60 (more lenient!)
        const sendToRiPi = (hasNames && hasEmails) || score >= 60;
        
        if (meetsDataRequirements && score >= 75) {
            return { 
                valid: true, 
                confidence: 'high',
                reason: `✅ Complete - Names:${nameMatches} Emails:${emailMatches.length} Company:${companyMentions} Location:Yes`,
                hasNames: true,
                hasEmails: true,
                hasCompany: true,
                hasLocation: true
            };
        } else if (sendToRiPi) {
            return { 
                valid: true, 
                confidence: 'medium',
                reason: `⚠️ Partial - Names:${nameMatches} Emails:${emailMatches.length} Company:${companyMentions} Location:${hasLocation ? 'Yes' : 'No'}`,
                hasNames: hasNames,
                hasEmails: hasEmails,
                hasCompany: hasCompany,
                hasLocation: hasLocation
            };
        } else {
            const missing = [];
            if (!hasNames) missing.push('Names');
            if (!hasEmails) missing.push('Emails');
            if (!hasCompany) missing.push('Company');
            if (!hasLocation) missing.push('Location');
            
            return { 
                valid: false, 
                reason: `❌ Missing: ${missing.join(', ')} | Names:${nameMatches} Emails:${emailMatches.length} Company:${companyMentions} States:${stateMatches.length}`,
                hasNames: hasNames,
                hasEmails: hasEmails,
                hasCompany: hasCompany,
                hasLocation: hasLocation
            };
        }
        
    } catch (error) {
        return { 
            valid: false, 
            reason: `Fetch failed: ${error.message}`,
            hasNames: false,
            hasCompany: false,
            hasEmails: false,
            hasLocation: false
        };
    }
}

/**
 * Main discovery function: Find directories for a city (INFINITE MODE)
 * Keeps generating new queries and searching until stopped
 * @param {string} city - City name
 * @param {string} state - State abbreviation
 * @param {Array} learnedKeywords - Optional learned keywords from orchestrator
 * @param {Number} maxQueries - Max queries before stopping (default: unlimited)
 */
async function discoverDirectories(city, state, learnedKeywords = [], maxQueries = 50) {
    console.log(`\n🎯 Discovering directories for ${city}, ${state} - CONTINUOUS MODE...`);
    
    const validDirectories = [];
    let totalQueries = 0;
    let consecutiveEmptySearches = 0;
    
    while (true) {
        // Check if we hit max queries limit
        if (totalQueries >= maxQueries) {
            console.log(`\n⏹️ Reached max queries limit (${maxQueries}), returning ${validDirectories.length} directories to orchestrator`);
            break;
        }
        
        // Step 1: Generate fresh search queries using AI
        console.log(`\n🧠 Generating fresh search strategy (round ${Math.floor(totalQueries / 5) + 1})...`);
        const queries = await generateSearchStrategy(city, state, learnedKeywords);
        
        // Step 2: Search for each query with pagination
        let roundUrls = [];
        for (const query of queries) {
            totalQueries++;
            const urls = await searchDirectories(query);
            
            if (urls.length === 0) {
                consecutiveEmptySearches++;
                console.log(`  ⚠️ No new URLs from this query (${consecutiveEmptySearches} consecutive empty)`);
            } else {
                consecutiveEmptySearches = 0; // Reset counter
                roundUrls.push(...urls);
            }
            
            await sleep(2000); // Rate limit: 2s between searches
            
            // If too many empty searches, generate completely new strategy
            if (consecutiveEmptySearches >= 10) {
                console.log(`\n🔄 Too many empty searches, generating new strategy with different keywords...`);
                consecutiveEmptySearches = 0;
                break; // Break to generate new queries
            }
        }
        
        // Remove duplicates from this round
        roundUrls = [...new Set(roundUrls)];
        console.log(`\n📊 Round complete: ${roundUrls.length} new candidate URLs`);
        
        // Step 3: Validate new URLs (parallel batches of 5)
        if (roundUrls.length > 0) {
            console.log(`\n✅ Validating ${roundUrls.length} directories...`);
            
            for (let i = 0; i < roundUrls.length; i += 5) {
                const batch = roundUrls.slice(i, i + 5);
                const results = await Promise.all(
                    batch.map(url => validateDirectory(url))
                );
                
                for (let idx = 0; idx < batch.length; idx++) {
                    const url = batch[idx];
                    const result = results[idx];
                    if (result.valid) {
                        console.log(`  ✅ ${url} (${result.confidence}) - ${result.reason}`);
                        validDirectories.push({
                            url,
                            confidence: result.confidence,
                            city,
                            state,
                            hasNames: result.hasNames,
                            hasCompany: result.hasCompany,
                            hasEmails: result.hasEmails,
                            hasLocation: result.hasLocation,
                            discoveredAt: new Date().toISOString()
                        });
                        
                        // RETURN IMMEDIATELY WITH THIS ONE DIRECTORY
                        console.log(`\n🚀 RETURNING ${validDirectories.length} directory to orchestrator for immediate scraping!`);
                        return validDirectories;
                    } else {
                        console.log(`  ❌ ${url} - ${result.reason}`);
                    }
                }
                
                await sleep(1000); // Rate limit between validation batches
            }
        }
        
        console.log(`\n📈 Progress: ${validDirectories.length} valid directories found, ${totalQueries} queries executed`);
        
        // Brief pause before next round
        await sleep(3000);
    }
    
    console.log(`\n🎉 Discovery complete: ${validDirectories.length} valid directories for ${city}`);
    return validDirectories;
}

/**
 * Discover directories for multiple cities
 * @param {Array} cities - Array of {city, state} objects
 * @param {Array} learnedKeywords - Optional learned keywords from orchestrator
 */
async function discoverForCities(cities, learnedKeywords = []) {
    const allDirectories = [];
    
    for (const location of cities) {
        try {
            const directories = await discoverDirectories(location.city, location.state, learnedKeywords);
            allDirectories.push(...directories);
            
            // Save progress incrementally
            console.log(`\n💾 Total directories discovered: ${allDirectories.length}`);
            
            // Wait between cities
            await sleep(5000);
            
        } catch (error) {
            console.error(`❌ Failed ${location.city}:`, error.message);
        }
    }
    
    return allDirectories;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Get discovery statistics
 */
function getDiscoveryStats() {
    return {
        totalDiscovered: discoveredUrls.size,
        totalValidated: validatedUrls.size,
        discoveredUrls: Array.from(discoveredUrls),
        validatedUrls: Array.from(validatedUrls)
    };
}

/**
 * Reset URL tracking (useful for fresh starts)
 */
function resetDiscoveryCache() {
    discoveredUrls.clear();
    validatedUrls.clear();
    console.log('🔄 Discovery cache cleared');
}

// Export functions
module.exports = {
    discoverDirectories,
    discoverForCities,
    generateSearchStrategy,
    validateDirectory,
    getDiscoveryStats,
    resetDiscoveryCache
};

// CLI usage
if (require.main === module) {
    const testCities = [
        { city: 'Miami', state: 'FL' },
        { city: 'Tampa', state: 'FL' },
        { city: 'Orlando', state: 'FL' }
    ];
    
    discoverForCities(testCities).then(directories => {
        console.log('\n\n========================================');
        console.log('DISCOVERY COMPLETE');
        console.log('========================================');
        console.log(`Total directories: ${directories.length}`);
        console.log('\nHigh confidence:');
        directories.filter(d => d.confidence === 'high').forEach(d => {
            console.log(`  ${d.url}`);
        });
    });
}
