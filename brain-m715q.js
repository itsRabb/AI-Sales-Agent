/**
 * M715Q BRAIN AGENT - Lead Scorer
 * 
 * This agent:
 * 1. Pulls new leads from Airtable (Status = 'new')
 * 2. Scores them using Ollama AI
 * 3. Updates Status to 'qualified' or 'disqualified'
 * 4. Adds scoring details to Airtable
 * 
 * Runs on M715Q ThinkCentre with Ollama
 */

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.M715Q_BRAIN_PORT || 6002;
const OLLAMA_URL = process.env.M715Q_OLLAMA_URL || 'http://localhost:11434/api/generate';
const AIRTABLE_BASE = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;

let isProcessing = false;

// Activity logs for dashboard
const activityLogs = [];
const MAX_LOGS = 500;

function addLog(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    activityLogs.unshift(logEntry);
    
    if (activityLogs.length > MAX_LOGS) {
        activityLogs.pop();
    }
    
    if (level === 'error' || level === 'warn' || level === 'success') {
        console.log(logEntry);
    }
}

const config = {
    airtableHeaders: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
    }
};

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        agent: 'M715Q Brain',
        isProcessing,
        timestamp: new Date().toISOString()
    });
});

/**
 * Logs endpoint
 */
app.get('/logs', (req, res) => {
    res.json({
        logs: activityLogs,
        totalLogs: activityLogs.length,
        isProcessing
    });
});

/**
 * Get new leads that need scoring
 */
async function getNewLeads() {
    try {
        const formula = encodeURIComponent("{Status}='New'");
        
        const response = await axios.get(
            `${AIRTABLE_BASE}/${process.env.AIRTABLE_LEADS_TABLE}?filterByFormula=${formula}&maxRecords=20`,
            { headers: config.airtableHeaders }
        );

        addLog(`Fetched ${response.data.records?.length || 0} new leads from Airtable`);
        return response.data.records || [];
    } catch (error) {
        addLog(`Error fetching leads: ${error.response?.status} - ${error.response?.statusText || error.message}`, 'error');
        if (error.response?.status === 403) {
            addLog('⚠️ Airtable 403: Check API key permissions or table name in Leads table', 'error');
        }
        return [];
    }
}

/**
 * Score lead with Ollama AI
 */
async function scoreLead(lead) {
    const fields = lead.fields;
    
    const prompt = `You are a lead scoring expert for a hazard report company offering flood and multi-hazard reports (wildfire, heat, wind, air quality, earthquake).

TARGET CUSTOMER: New/junior agents with < 5 years experience. These agents are building their business, tech-savvy, and need tools to look professional and close deals faster.

Analyze this real estate agent and score them 1-10 based on:

**HIGHEST PRIORITY (give most weight):**
1. Years of Experience (0-5 years = PERFECT, 6-10 = OK, 10+ = less ideal)
2. Business Type (Independent/Small = BEST, Team = OK, Big brokerage = NO)
3. Hazard-Prone Location:
   - FLOOD: Coastal, riverside, historic flood zones (FL, TX, LA, CA coast, etc.)
   - WILDFIRE: California, Pacific NW, Colorado, Texas Hill Country
   - EARTHQUAKE: California, Pacific NW, Alaska
   - WIND: Florida, Gulf Coast, Tornado Alley (OK, KS, TX)
   - ALL HAZARDS: Areas with multiple risks = highest value!

**SECONDARY FACTORS:**
4. Tech adoption (website, social media, LinkedIn = good signs)
5. Activity level (listings, reviews = active agent)

Agent Profile:
- Name: ${fields.Name || 'Unknown'}
- Email: ${fields.Email || 'None'}
- Phone: ${fields.Phone || 'None'}
- Location: ${fields.City || 'Unknown'}, ${fields.State || ''}
- Business: ${fields['Business Type'] || 'Unknown'}
- Website: ${fields.Website || 'None'}
- LinkedIn: ${fields['LinkedIn Profile'] || 'None'}
- Listings: ${fields['Total Listings'] || 0}
- Years Experience: ${fields['Years in Business'] || 'Unknown'}

**SCORING GUIDE:**
- 9-10: New agent (0-3 yrs) in multi-hazard area (e.g., CA coast = fire+quake+flood)
- 7-8: Junior agent (3-5 yrs) in high-risk area (e.g., Miami = flood+wind, Austin = flood+heat)
- 5-6: Established agent (5-10 yrs) or hazard-prone location
- 1-4: Senior agent (10+ yrs) or low-risk area or big brokerage

Respond with ONLY valid JSON in this format:
{
  "score": 8,
  "reasoning": "3-year agent in Miami (flood+hurricane risk) - perfect fit for hazard reports",
  "strengths": ["New agent (needs tools)", "High-risk market", "Independent", "Tech-savvy"],
  "redFlags": [],
  "qualification": "qualified"
}

Qualification: "qualified" if score >= 6, else "disqualified".`;

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: 'llama3.1:8b',
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.3,
                max_tokens: 400
            }
        }, { timeout: 90000 });

        const aiResponse = response.data.response;
        
        // Extract JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const scoreData = JSON.parse(jsonMatch[0]);
            return scoreData;
        } else {
            // Fallback scoring
            console.warn('⚠️ AI response not JSON, using fallback');
            return {
                score: 5,
                reasoning: 'Could not parse AI response',
                strengths: [],
                redFlags: [],
                qualification: 'qualified'
            };
        }
    } catch (error) {
        console.error('❌ Error scoring lead:', error.message);
        // Fallback scoring
        return {
            score: 5,
            reasoning: 'Error during scoring',
            strengths: [],
            redFlags: [],
            qualification: 'qualified'
        };
    }
}

/**
 * Update lead in Airtable with score
 */
async function updateLeadScore(recordId, scoreData) {
    try {
        const notesAddition = `\n\n--- AI SCORE ---
Score: ${scoreData.score}/10
Reasoning: ${scoreData.reasoning}
Strengths: ${scoreData.strengths.join(', ')}
Red Flags: ${scoreData.redFlags.join(', ')}`;

        await axios.patch(
            `${AIRTABLE_BASE}/${process.env.AIRTABLE_LEADS_TABLE}/${recordId}`,
            {
                fields: {
                    'Score': scoreData.score,
                    'Status': scoreData.score >= 6 ? 'Qualified' : 'Lost'
                }
            },
            { headers: config.airtableHeaders }
        );
        addLog(`✅ Updated lead score: ${recordId} (Score: ${scoreData.score})`, 'success');
    } catch (error) {
        addLog(`Failed to update lead ${recordId}: ${error.message}`, 'error');
    }
}

/**
 * Process new leads and score them
 */
async function processLeads() {
    if (isProcessing) {
        console.log('⏸️  Already processing leads, skipping...');
        return;
    }

    isProcessing = true;
    console.log('🔄 M715Q Brain: Scoring new leads...');

    try {
        const leads = await getNewLeads();
        
        if (leads.length === 0) {
            console.log('✅ No new leads to score');
            return;
        }

        console.log(`🧠 Found ${leads.length} leads to score`);

        for (const lead of leads) {
            const fields = lead.fields;
            
            console.log(`🔍 Scoring ${fields.Name || 'Unknown Lead'}...`);
            const scoreData = await scoreLead(lead);

            console.log(`📊 Score: ${scoreData.score}/10 - ${scoreData.qualification}`);
            await updateLeadScore(lead.id, scoreData);

            // Small delay between scoring
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('✅ M715Q Brain: Finished scoring leads');
    } catch (error) {
        console.error('❌ Error processing leads:', error.message);
    } finally {
        isProcessing = false;
    }
}

/**
 * Manual trigger endpoint (for testing)
 */
app.post('/process', async (req, res) => {
    if (isProcessing) {
        return res.status(429).json({ error: 'Already processing' });
    }

    res.json({ message: 'Processing started' });
    processLeads(); // Don't await - run in background
});

/**
 * Start the server and begin processing
 */
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧠 M715Q Brain Agent running on port ${PORT}`);
    console.log(`🌐 Accessible at http://localhost:${PORT}`);
    console.log('📧 Ready to send emails via SMTP');
    
    // Score leads every 3 minutes
    setInterval(processLeads, 3 * 60 * 1000);
    
    // Process immediately on startup
    setTimeout(processLeads, 3000);
});
