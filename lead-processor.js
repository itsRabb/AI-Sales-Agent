/**
 * Direct Lead Processor - No Flowise Required
 * 
 * This script orchestrates your entire lead pipeline:
 * 1. Scrape profiles from Zillow/LinkedIn/Redfin
 * 2. Score leads with M73 (Sales Brain)
 * 3. Generate personalized emails with M73
 * 4. Save everything to Airtable
 * 5. Send emails via Hostinger (optional)
 */

const axios = require('axios');
require('dotenv').config();

// Agent endpoints
const SCRAPER_URL = process.env.SCRAPER_AGENT_URL || 'http://localhost:8001/scrape';
const SALES_BRAIN_URL = process.env.SALES_BRAIN_URL || 'http://localhost:11434/api/generate';
const AIRTABLE_BASE = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;

const config = {
    airtableHeaders: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
    }
};

/**
 * Step 1: Scrape lead profiles from multiple sources
 */
async function scrapeLeadProfiles(urls) {
    console.log('\n🔍 Step 1: Scraping profiles...');
    console.log(`URLs: ${urls.join(', ')}`);
    
    try {
        const response = await axios.post(SCRAPER_URL, { urls }, { timeout: 60000 });
        console.log('✅ Scraping complete!');
        return response.data.results || response.data;
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   → Is the scraper agent running? Check ' + SCRAPER_URL);
        }
        throw error;
    }
}

/**
 * Step 2: Score the lead with AI (Sales Brain - M73)
 */
async function scoreLeadWithAI(scrapedData) {
    console.log('\n🧠 Step 2: Scoring lead with Sales Brain (M73)...');
    
    const prompt = `You are a lead scoring expert for a B2B SaaS company selling white-label hazard reports to real estate agents.

Analyze this real estate agent profile and score them 1-10 based on:
- Business size (prefer small independent agents, not big brokerages)
- Location (prefer flood-prone areas: coastal, rivers, historic flood zones)
- Online presence quality (website, LinkedIn activity)
- Technology adoption (do they seem tech-savvy?)
- Deal velocity indicators (how many listings, reviews, years in business)

Profile Data:
${JSON.stringify(scrapedData, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "score": 8,
  "reasoning": "Independent agent in Miami (high flood risk area) with active online presence and 50+ listings. Strong fit for our hazard report service.",
  "redFlags": ["No website listed", "Very new agent (< 1 year)"],
  "strengths": ["High flood risk market", "Tech-savvy social media presence", "Volume player (50+ listings)"],
  "nextSteps": "Emphasize time savings and professional branding in outreach"
}`;

    try {
        const response = await axios.post(SALES_BRAIN_URL, {
            model: 'llama3.1:8b',
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.3  // Lower temp for more consistent scoring
            }
        }, { timeout: 120000 });

        const aiResponse = response.data.response;
        console.log('✅ AI scoring complete!');
        
        // Parse JSON from AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const scoreData = JSON.parse(jsonMatch[0]);
            console.log(`   Score: ${scoreData.score}/10`);
            console.log(`   Reasoning: ${scoreData.reasoning}`);
            return scoreData;
        } else {
            console.warn('⚠️ AI response was not valid JSON, using fallback');
            return {
                score: 5,
                reasoning: aiResponse,
                redFlags: [],
                strengths: [],
                nextSteps: 'Manual review needed'
            };
        }
    } catch (error) {
        console.error('❌ AI scoring failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   → Is Ollama running? Check ' + SALES_BRAIN_URL.replace('/api/generate', ''));
        }
        throw error;
    }
}

/**
 * Step 3: Generate personalized email with AI
 */
async function generateEmailWithAI(leadName, location, scoreData, scrapedData) {
    console.log('\n✍️ Step 3: Generating personalized email...');
    
    const prompt = `You are a sales expert writing a cold email to a real estate agent.

Lead: ${leadName} in ${location}
Score: ${scoreData.score}/10
Key Insights: ${scoreData.reasoning}
Strengths: ${scoreData.strengths.join(', ')}

Product: White-label hazard reports (flood, wildfire, earthquake) that real estate agents can brand as their own to close deals faster.

Write a short, personalized cold email (3-4 paragraphs max) that:
1. Opens with something specific about their business (use this data: ${JSON.stringify(scrapedData).substring(0, 500)})
2. Introduces the value prop: faster deal closures with professional hazard reports
3. Mentions their specific market risk (flood/fire/earthquake based on ${location})
4. Ends with a soft CTA (reply to chat, not a hard demo request)

Tone: Professional but friendly. Not salesy. Peer-to-peer.

Respond ONLY with valid JSON:
{
  "subject": "Quick idea for your ${location} listings",
  "body": "Hi ${leadName},\\n\\nI noticed you're handling properties in ${location}...\\n\\n[REST OF EMAIL]\\n\\nBest,\\n[Your Name]"
}`;

    try {
        const response = await axios.post(SALES_BRAIN_URL, {
            model: 'llama3.1:8b',
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.7  // Higher temp for creative writing
            }
        }, { timeout: 120000 });

        const aiResponse = response.data.response;
        console.log('✅ Email generated!');
        
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const emailData = JSON.parse(jsonMatch[0]);
            console.log(`   Subject: ${emailData.subject}`);
            return emailData;
        } else {
            console.warn('⚠️ AI response was not valid JSON, using fallback');
            return {
                subject: `Quick idea for your ${location} listings`,
                body: aiResponse
            };
        }
    } catch (error) {
        console.error('❌ Email generation failed:', error.message);
        throw error;
    }
}

/**
 * Step 4: Save lead to Airtable
 */
async function saveLeadToAirtable(leadName, location, scoreData, scrapedData, emailData) {
    console.log('\n💾 Step 4: Saving to Airtable...');
    
    try {
        // Create Lead record
        const leadResponse = await axios.post(
            `${AIRTABLE_BASE}/${process.env.AIRTABLE_LEADS_TABLE_ID}`,
            {
                fields: {
                    'Name': leadName,
                    'Location': location,
                    'Score': scoreData.score,
                    'Status': scoreData.score >= 7 ? 'Hot Lead' : scoreData.score >= 5 ? 'Warm Lead' : 'Cold Lead',
                    'Notes': `${scoreData.reasoning}\n\nStrengths: ${scoreData.strengths.join(', ')}\nRed Flags: ${scoreData.redFlags.join(', ')}\nNext Steps: ${scoreData.nextSteps}`
                }
            },
            { headers: config.airtableHeaders }
        );
        
        const leadId = leadResponse.data.id;
        console.log(`✅ Lead saved! ID: ${leadId}`);
        
        // Create Profile records (one per scraped URL)
        if (Array.isArray(scrapedData)) {
            for (const profile of scrapedData) {
                await axios.post(
                    `${AIRTABLE_BASE}/${process.env.AIRTABLE_PROFILES_TABLE_ID}`,
                    {
                        fields: {
                            'Lead': [leadId],
                            'Platform': profile.platform || 'Unknown',
                            'URL': profile.url || '',
                            'Data': JSON.stringify(profile.data || profile),
                            'Profile Summary': profile.summary || `Data from ${profile.platform || 'unknown source'}`
                        }
                    },
                    { headers: config.airtableHeaders }
                );
            }
            console.log(`✅ ${scrapedData.length} profile(s) saved!`);
        }
        
        // Create Outreach record (email ready to send)
        const outreachResponse = await axios.post(
            `${AIRTABLE_BASE}/${process.env.AIRTABLE_OUTREACH_TABLE_ID}`,
            {
                fields: {
                    'Lead': [leadId],
                    'Type': 'Email - Cold Outreach',
                    'Subject': emailData.subject,
                    'Body': emailData.body,
                    'Notes': 'Generated by AI - Ready to send',
                    'Sentiment Analysis': scoreData.score >= 7 ? 'Positive' : scoreData.score >= 5 ? 'Neutral' : 'Cautious'
                }
            },
            { headers: config.airtableHeaders }
        );
        
        console.log(`✅ Outreach email saved! ID: ${outreachResponse.data.id}`);
        console.log('\n📧 Email Preview:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Subject: ${emailData.subject}`);
        console.log(`\n${emailData.body}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        return { leadId, outreachId: outreachResponse.data.id };
    } catch (error) {
        console.error('❌ Airtable save failed:', error.message);
        if (error.response) {
            console.error('   Details:', error.response.data);
        }
        throw error;
    }
}

/**
 * Main processing function
 */
async function processLead(leadName, location, urls) {
    console.log('\n═══════════════════════════════════════════');
    console.log(`🚀 Processing Lead: ${leadName} (${location})`);
    console.log('═══════════════════════════════════════════');
    
    try {
        // Step 1: Scrape
        const scrapedData = await scrapeLeadProfiles(urls);
        
        // Step 2: Score
        const scoreData = await scoreLeadWithAI(scrapedData);
        
        // Step 3: Generate Email
        const emailData = await generateEmailWithAI(leadName, location, scoreData, scrapedData);
        
        // Step 4: Save to Airtable
        const airtableIds = await saveLeadToAirtable(leadName, location, scoreData, scrapedData, emailData);
        
        console.log('\n✅ COMPLETE! Lead processed successfully!');
        console.log(`   → Lead ID: ${airtableIds.leadId}`);
        console.log(`   → Outreach ID: ${airtableIds.outreachId}`);
        console.log(`   → Score: ${scoreData.score}/10`);
        console.log(`   → View in Airtable: https://airtable.com/${process.env.AIRTABLE_BASE_ID}`);
        
        return {
            success: true,
            leadName,
            score: scoreData.score,
            airtableIds,
            emailData
        };
        
    } catch (error) {
        console.error('\n❌ FAILED! Lead processing error:', error.message);
        return {
            success: false,
            leadName,
            error: error.message
        };
    }
}

/**
 * Batch process multiple leads
 */
async function processBatch(leads) {
    console.log(`\n📊 Processing batch of ${leads.length} leads...\n`);
    
    const results = [];
    for (const lead of leads) {
        const result = await processLead(lead.name, lead.location, lead.urls);
        results.push(result);
        
        // Wait 2 seconds between leads to avoid rate limits
        if (leads.indexOf(lead) < leads.length - 1) {
            console.log('\n⏳ Waiting 2 seconds before next lead...\n');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('📈 BATCH COMPLETE - Summary');
    console.log('═══════════════════════════════════════════');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    // Show scores
    console.log('\n🎯 Lead Scores:');
    results.filter(r => r.success).forEach(r => {
        console.log(`   ${r.leadName}: ${r.score}/10`);
    });
    
    return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE USAGE
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
    console.log('🤖 AI Sales Agent - Direct Lead Processor');
    console.log('════════════════════════════════════════════\n');
    
    // Example: Single lead
    const singleLead = {
        name: 'Sarah Johnson',
        location: 'Miami, FL',
        urls: [
            'https://www.zillow.com/profile/sarah-johnson-realtor',
            'https://www.linkedin.com/in/sarahjohnsonrealtor'
        ]
    };
    
    // Example: Batch of leads
    const batchLeads = [
        {
            name: 'Mike Chen',
            location: 'Houston, TX',
            urls: [
                'https://www.zillow.com/profile/mike-chen-realty',
                'https://www.redfin.com/real-estate-agents/mike-chen'
            ]
        },
        {
            name: 'Lisa Martinez',
            location: 'New Orleans, LA',
            urls: [
                'https://www.realtor.com/realestateagents/lisa-martinez',
                'https://www.linkedin.com/in/lisamartinezrealtor'
            ]
        },
        {
            name: 'David Park',
            location: 'Charleston, SC',
            urls: [
                'https://www.zillow.com/profile/davidpark-realestate'
            ]
        }
    ];
    
    // Choose which to run:
    const mode = process.argv[2] || 'single';
    
    if (mode === 'batch') {
        processBatch(batchLeads).catch(console.error);
    } else {
        processLead(singleLead.name, singleLead.location, singleLead.urls).catch(console.error);
    }
}

module.exports = { processLead, processBatch, scrapeLeadProfiles, scoreLeadWithAI, generateEmailWithAI };
