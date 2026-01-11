/**
 * M73 BRAIN AGENT - 5-Email Sequence Sender
 * 
 * This agent sends a strategic 5-email drip campaign:
 * 
 * DAY 1:  Email 1 - "The Silent Competitor" (pain point, competition angle)
 * DAY 3:  Email 2 - "Straight Pain + Money" (ROI, math, lost commissions)
 * DAY 5:  Email 3 - "The FOMO Play" (other agents using it, falling behind)
 * DAY 7:  Email 4 - "I'm not selling you" (reverse psychology, last chance)
 * DAY 10: Email 5 - "Hyper-local + Listing Trigger" (specific location, final offer)
 * 
 * Features:
 * - Pre-written templates (no AI generation needed)
 * - Automatic sequence tracking in Airtable
 * - Location-based hazard detection (flood, fire, earthquake, wind, heat)
 * - Duplicate prevention (checks Email Sequence field)
 * - Rate limiting (30 seconds between emails)
 * - Toggle on/off via dashboard
 * - Sends via configured SMTP server
 * 
 * Runs on M73 ThinkCentre
 */

const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.M73_BRAIN_PORT || 6001;
const OLLAMA_URL = process.env.M73_OLLAMA_URL || 'http://localhost:11434/api/generate';
const AIRTABLE_BASE = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;

// Global toggle - can be controlled from dashboard
let emailingEnabled = false;
let isProcessing = false;

// Activity logs for dashboard
const activityLogs = [];
const MAX_LOGS = 500;

function addLog(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    activityLogs.unshift(logEntry);
    
    // Keep only last MAX_LOGS entries
    if (activityLogs.length > MAX_LOGS) {
        activityLogs.pop();
    }
    
    // Also log to console for important messages
    if (level === 'error' || level === 'warn' || level === 'success') {
        console.log(logEntry);
    }
}

// Email transporter
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.HOSTINGER_EMAIL_1 || process.env.HOSTINGER_EMAIL_2,
        pass: process.env.HOSTINGER_PASSWORD
    }
});

// Verify email config on startup
emailTransporter.verify((error) => {
    if (error) {
        console.error('❌ M73 Email configuration error:', error.message);
    } else {
        console.log('✅ M73 Email transporter ready');
    }
});

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
        agent: 'M73 Brain',
        emailingEnabled,
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
        emailingEnabled,
        isProcessing
    });
});

/**
 * Toggle emailing on/off
 */
app.post('/toggle', (req, res) => {
    emailingEnabled = !emailingEnabled;
    console.log(`📧 Email sending ${emailingEnabled ? 'ENABLED' : 'DISABLED'}`);
    res.json({ emailingEnabled });
});

/**
 * Get leads that need outreach
 * NEW: Returns leads for specific email sequence number
 */
async function getLeadsForOutreach() {
    try {
        // Get ALL qualified leads (we'll check sequence locally)
        const formula = encodeURIComponent("{Status}='qualified'");
        
        const response = await axios.get(
            `${AIRTABLE_BASE}/${process.env.AIRTABLE_LEADS_TABLE}?filterByFormula=${formula}&maxRecords=50`,
            { headers: config.airtableHeaders }
        );

        const allLeads = response.data.records || [];
        const leadsToEmail = [];
        const now = new Date();
        
        for (const lead of allLeads) {
            const fields = lead.fields;
            const lastContactDate = fields['Last Contact Date'] ? new Date(fields['Last Contact Date']) : null;
            const emailSequence = fields['Email Sequence'] || 0; // Track which email they're on
            
            // If never contacted, send Email 1
            if (!lastContactDate && emailSequence === 0) {
                leadsToEmail.push({ lead, sequenceNumber: 1 });
                continue;
            }
            
            // If contacted, check if it's time for next email
            if (lastContactDate) {
                const daysSinceLastContact = (now - lastContactDate) / (1000 * 60 * 60 * 24);
                
                // Email schedule: Day 1, Day 3, Day 5, Day 7, Day 10
                const schedule = [0, 2, 2, 2, 3]; // Days to wait before next email
                const nextSequence = emailSequence + 1;
                
                if (nextSequence <= 5) { // Max 5 emails
                    const daysToWait = schedule[emailSequence] || 0;
                    
                    if (daysSinceLastContact >= daysToWait) {
                        leadsToEmail.push({ lead, sequenceNumber: nextSequence });
                    }
                }
            }
        }
        
        console.log(`📧 Found ${leadsToEmail.length} leads ready for email (from ${allLeads.length} qualified)`);
        addLog(`Found ${leadsToEmail.length} leads ready for outreach from ${allLeads.length} qualified leads`, 'info');
        
        return leadsToEmail;
        
    } catch (error) {
        console.error('❌ Error fetching leads:', error.message);
        return [];
    }
}

/**
 * 5-EMAIL SEQUENCE TEMPLATES
 * These are the ONLY formats M73 uses
 */

// Helper to identify hazards in location
function identifyHazards(city, state) {
    const location = `${city} ${state}`.toLowerCase();
    const hazards = [];
    
    // Flood zones
    if (/(florida|miami|tampa|jacksonville|houston|galveston|new orleans|charleston|savannah|coastal|coast|river)/i.test(location)) {
        hazards.push('flood');
    }
    
    // Wildfire zones
    if (/(california|colorado|oregon|washington|arizona|texas|hill country|forest|mountain)/i.test(location)) {
        hazards.push('wildfire');
    }
    
    // Hurricane/Wind zones
    if (/(florida|louisiana|texas|carolina|gulf|coast|oklahoma|kansas|tornado)/i.test(location)) {
        hazards.push('wind');
    }
    
    // Heat zones
    if (/(phoenix|vegas|texas|arizona|california|desert|inland)/i.test(location)) {
        hazards.push('heat');
    }
    
    // Earthquake zones
    if (/(california|pacific|northwest|alaska|san francisco|los angeles|seattle)/i.test(location)) {
        hazards.push('earthquake');
    }
    
    return hazards;
}

// Email 1: The Silent Competitor (Day 1)
function generateEmail1(fields) {
    const name = fields.Name || 'there';
    const city = fields.City || 'your area';
    const hazards = identifyHazards(fields.City || '', fields.State || '');
    const mainHazard = hazards[0] || 'environmental';
    
    const hazardMention = {
        'flood': `With ${city}'s flood risk, buyers are asking more questions about properties before they commit`,
        'wildfire': `With wildfire season in ${city}, buyers want answers about property risks before they commit`,
        'wind': `With hurricane concerns in ${city}, buyers are asking more about property safety`,
        'heat': `With extreme heat in ${city}, buyers are asking more environmental questions`,
        'earthquake': `With seismic risks in ${city}, buyers want to know what they're getting into`,
        'environmental': `Buyers are asking more environmental questions before they commit`
    };

    return `${name},

${hazardMention[mainHazard] || hazardMention.environmental}.

Here's what I'm noticing: agents with instant hazard reports close deals faster because they answer buyer questions on the spot. No waiting 3-5 days for reports. No losing momentum.

Meanwhile, agents without reports? Buyers go cold while waiting. Deals stall. Competitors swoop in with better info.

Have you thought about this?

Best,
[Your Name]
[Your Company]`;
}

// Email 2: Straight Pain + Money (Day 3)
function generateEmail2(fields) {
    const name = fields.Name || 'there';
    const city = fields.City || 'your area';

    return `${name},

Quick math for ${city} agents:

Average deal = $8K commission
Time wasted chasing reports = 3-5 days
Deals lost to competitors with instant answers = 1-2 per month

That's $16K-$24K/month left on the table.

Our white-label hazard reports (flood, fire, quake, wind, heat, air quality) cost less than one fancy dinner. Instant delivery. Your branding. Professional reports that make YOU look like the expert.

Worth a look?

[Your Name]
[Your Company]`;
}

// Email 3: The FOMO Play (Day 5)
function generateEmail3(fields) {
    const name = fields.Name || 'there';
    const city = fields.City || 'your area';
    const state = fields.State || 'your state';

    return `${name},

I'll be direct: 3 other agents in ${city}, ${state} started using our hazard reports last month.

They're telling their buyers:
"I ran a complete hazard analysis on this property - here's what you need to know about flood, fire, earthquake, wind, and air quality risks."

While other agents are saying:
"Uh, I can order a report... it'll take a few days..."

Which conversation positions you as the professional?

This isn't about selling you. It's about not falling behind in ${city}.

[Your Name]
[Your Company]`;
}

// Email 4: "I'm not selling you" (Day 7)
function generateEmail4(fields) {
    const name = fields.Name || 'there';
    const city = fields.City || 'your area';

    return `${name},

Last email, then I'll leave you alone.

I'm not trying to sell you anything. I'm trying to make sure you don't lose listings to agents who show up with better intel than you.

That's it. That's the whole pitch.

Instant hazard reports = better intel = more closed deals in ${city}.

If that doesn't matter to your business, ignore this. But if it does... let's talk.

[Your Name]
[Your Company]
Reply with "interested" if you want to see how it works`;
}

// Email 5: Hyper-local + Specific Listing Trigger (Day 10 - Final)
function generateEmail5(fields) {
    const name = fields.Name || 'there';
    const city = fields.City || 'your area';
    const state = fields.State || '';
    const hazards = identifyHazards(fields.City || '', fields.State || '');
    
    let hazardList = 'flood, wildfire, earthquake, wind, heat, and air quality';
    if (hazards.length > 0) {
        hazardList = hazards.join(', ');
    }

    return `${name},

Final thought for ${city}, ${state}:

I saw some listings in your area that are in ${hazards[0] || 'hazard'} zones. Your buyers are going to ask about ${hazardList} risks.

Two ways this goes:
1. You hand them a professional hazard report on the spot (your branding, instant credibility)
2. You say "I'll check on that" and lose momentum

Agents using our reports tell us they're closing 2-3 more deals per quarter just by having better answers faster.

That's $16K-$24K in extra commissions per year.

For the cost of 2 Starbucks coffees per month.

If you're serious about staying competitive in ${city}, reply with "show me."

If not, no worries - good luck out there.

[Your Name]
[Your Company]
your-email@yourdomain.com`;
}

/**
 * Determine which email to send based on sequence count
 */
function generateEmailForSequence(lead, sequenceNumber) {
    const fields = lead.fields;
    
    const emailGenerators = [
        generateEmail1,  // Day 1
        generateEmail2,  // Day 3
        generateEmail3,  // Day 5
        generateEmail4,  // Day 7
        generateEmail5   // Day 10 (final)
    ];
    
    const emailIndex = Math.min(sequenceNumber - 1, 4); // Max at email 5
    const generator = emailGenerators[emailIndex];
    
    return generator(fields);
}

/**
 * Get subject line for sequence
 */
function getSubjectForSequence(fields, sequenceNumber) {
    const city = fields.City || 'your area';
    const name = fields.Name || 'there';
    
    const subjects = [
        `Quick question about ${city} listings`,                    // Email 1
        `The $16K-$24K/month mistake in ${city}`,                   // Email 2
        `${name} - other ${city} agents are doing this`,            // Email 3
        `Not trying to sell you anything, ${name}`,                 // Email 4
        `Final thought for ${city}, ${fields.State || ''}`          // Email 5
    ];
    
    const subjectIndex = Math.min(sequenceNumber - 1, 4);
    return subjects[subjectIndex];
}

/**
 * Send email via Hostinger SMTP
 */
async function sendEmail(lead, emailBody, subject, sequenceNumber) {
    const fields = lead.fields;
    
    const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Your Name'}" <${process.env.HOSTINGER_EMAIL_2}>`, // Using configured email
        to: fields.Email,
        subject: subject,
        text: emailBody,
        headers: {
            'List-Unsubscribe': `<mailto:unsubscribe@yourdomain.com?subject=Unsubscribe>`,
            'X-Company-Name': process.env.COMPANY_NAME,
            'X-Company-Address': process.env.COMPANY_ADDRESS,
            'X-Email-Sequence': sequenceNumber.toString()
        }
    };

    try {
        const info = await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Email ${sequenceNumber} sent to ${fields.Name} (${fields.Email})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send email to ${fields.Email}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Mark lead as contacted in Airtable
 * Updates sequence counter and timestamp
 */
async function markAsContacted(recordId, sequenceNumber) {
    try {
        const updateData = {
            fields: {
                'Last Contact Date': new Date().toISOString(),
                'Email Sequence': sequenceNumber,
                'Contact Method': 'Email'
            }
        };
        
        // After first email, mark as contacted
        if (sequenceNumber === 1) {
            updateData.fields['Contacted'] = true;
            updateData.fields['Status'] = 'contacted';
        }
        
        // After final email (5), mark as completed
        if (sequenceNumber === 5) {
            updateData.fields['Sequence Complete'] = true;
        }
        
        await axios.patch(
            `${AIRTABLE_BASE}/${process.env.AIRTABLE_LEADS_TABLE}/${recordId}`,
            updateData,
            { headers: config.airtableHeaders }
        );
        
        console.log(`✅ Updated lead (Email ${sequenceNumber}): ${recordId}`);
    } catch (error) {
        console.error(`❌ Failed to update lead ${recordId}:`, error.message);
    }
}

/**
 * Process leads and send emails (5-email sequence)
 */
async function processLeads() {
    if (!emailingEnabled) {
        console.log('⏸️  Emailing disabled, skipping...');
        return;
    }

    if (isProcessing) {
        console.log('⏸️  Already processing leads, skipping...');
        return;
    }

    isProcessing = true;
    console.log('🔄 M73 Brain: Processing 5-email sequence...');

    try {
        const leadsToEmail = await getLeadsForOutreach();
        
        if (leadsToEmail.length === 0) {
            console.log('✅ No leads ready for email (checking Day 1, 3, 5, 7, 10 schedule)');
            return;
        }

        console.log(`📧 Processing ${leadsToEmail.length} leads for email sequence`);

        for (const { lead, sequenceNumber } of leadsToEmail) {
            const fields = lead.fields;
            
            console.log(`\n📝 [Email ${sequenceNumber}/5] Preparing for ${fields.Name}...`);
            
            // Generate email using fixed templates (no AI needed!)
            const emailBody = generateEmailForSequence(lead, sequenceNumber);
            const subject = getSubjectForSequence(fields, sequenceNumber);

            console.log(`📧 Sending Email ${sequenceNumber} to ${fields.Email}...`);
            console.log(`   Subject: "${subject}"`);
            
            const result = await sendEmail(lead, emailBody, subject, sequenceNumber);

            if (result.success) {
                await markAsContacted(lead.id, sequenceNumber);
                console.log(`✅ Email ${sequenceNumber} sent successfully to ${fields.Name}`);
                
                if (sequenceNumber === 5) {
                    console.log(`🎉 Completed 5-email sequence for ${fields.Name}`);
                } else {
                    console.log(`⏰ Next email (${sequenceNumber + 1}/5) scheduled`);
                }
            } else {
                console.log(`❌ Failed to send Email ${sequenceNumber} to ${fields.Name}: ${result.error}`);
            }

            // Rate limiting - wait 30 seconds between emails
            console.log('⏳ Waiting 30 seconds before next email...');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }

        console.log('\n✅ M73 Brain: Finished email sequence processing');
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
    console.log(`🧠 M73 Brain Agent running on port ${PORT}`);
    console.log(`📧 Email: ${emailingEnabled ? 'ENABLED' : 'DISABLED'} (toggle via /toggle)`);
    
    // Process leads every 5 minutes
    setInterval(processLeads, 5 * 60 * 1000);
    
    // Process immediately on startup
    setTimeout(processLeads, 5000);
});
