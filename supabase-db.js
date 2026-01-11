/**
 * SUPABASE DATABASE MODULE
 * 
 * Replacement for Airtable with unlimited scalability
 * Handles all database operations for leads, outreach, profiles
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

function initSupabase() {
    if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase credentials not configured - using Airtable fallback');
        return null;
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connected');
    return supabase;
}

// Initialize on load
initSupabase();

/**
 * LEADS TABLE OPERATIONS
 */

async function saveLeadToSupabase(leadData) {
    if (!supabase) return null;
    
    try {
        // Check for duplicate by email or name+location
        let existingLead = null;
        
        if (leadData.email) {
            const { data } = await supabase
                .from('leads')
                .select('id')
                .eq('email', leadData.email)
                .single();
            existingLead = data;
        }
        
        if (existingLead) {
            console.log(`⏭️ Duplicate lead skipped: ${leadData.name || leadData.email}`);
            return existingLead.id;
        }
        
        // Insert new lead
        const { data, error } = await supabase
            .from('leads')
            .insert([{
                name: leadData.name,
                company: leadData.company || leadData.brokerage,
                location: leadData.location,
                email: leadData.email,
                phone: leadData.phone,
                score: leadData.score || null,
                status: leadData.status || 'New',
                notes: leadData.notes || `Scraped from ${leadData.source_site || 'unknown'}`,
                source_site: leadData.source_site,
                source_url: leadData.source_url,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error saving to Supabase:', error.message);
            return null;
        }
        
        console.log(`✅ Saved lead to Supabase: ${data.name}`);
        return data.id;
        
    } catch (error) {
        console.error('❌ Supabase save error:', error.message);
        return null;
    }
}

async function updateLeadScore(leadId, scoreData) {
    if (!supabase) return false;
    
    try {
        const { error } = await supabase
            .from('leads')
            .update({
                score: scoreData.score,
                status: scoreData.score >= 7 ? 'Qualified' : scoreData.score >= 5 ? 'Warm' : 'Cold',
                notes: scoreData.reasoning || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId);
        
        if (error) {
            console.error('❌ Error updating score:', error.message);
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Supabase update error:', error.message);
        return false;
    }
}

async function getNewLeads(limit = 10) {
    if (!supabase) return [];
    
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'New')
            .limit(limit);
        
        if (error) throw error;
        
        return data || [];
        
    } catch (error) {
        console.error('❌ Error fetching leads:', error.message);
        return [];
    }
}

async function getLeadsBySource() {
    if (!supabase) return {};
    
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('source_site');
        
        if (error) throw error;
        
        // Count by source
        const counts = {};
        data.forEach(lead => {
            const source = lead.source_site || 'unknown';
            counts[source] = (counts[source] || 0) + 1;
        });
        
        return counts;
        
    } catch (error) {
        console.error('❌ Error counting sources:', error.message);
        return {};
    }
}

/**
 * OUTREACH TABLE OPERATIONS
 */

async function saveOutreachToSupabase(outreachData) {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from('outreach')
            .insert([{
                lead_id: outreachData.lead_id,
                type: outreachData.type || 'Email',
                subject: outreachData.subject,
                body: outreachData.body,
                sent_date: new Date().toISOString(),
                notes: outreachData.notes
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return data.id;
        
    } catch (error) {
        console.error('❌ Error saving outreach:', error.message);
        return null;
    }
}

async function checkExistingOutreach(leadId, type = 'Email') {
    if (!supabase) return false;
    
    try {
        const { data } = await supabase
            .from('outreach')
            .select('id')
            .eq('lead_id', leadId)
            .eq('type', type)
            .single();
        
        return !!data;
        
    } catch (error) {
        return false;
    }
}

/**
 * PROFILES TABLE OPERATIONS
 */

async function saveProfileToSupabase(profileData) {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .insert([{
                lead_id: profileData.lead_id,
                platform: profileData.platform,
                url: profileData.url,
                data: profileData.data,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return data.id;
        
    } catch (error) {
        console.error('❌ Error saving profile:', error.message);
        return null;
    }
}

/**
 * UNSUBSCRIBE TABLE OPERATIONS
 */

async function addToUnsubscribe(email, reason, leadId = null) {
    if (!supabase) return false;
    
    try {
        const { error } = await supabase
            .from('unsubscribe')
            .insert([{
                email: email,
                reason: reason,
                origin_lead_id: leadId,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        return true;
        
    } catch (error) {
        console.error('❌ Error adding to unsubscribe:', error.message);
        return false;
    }
}

async function checkUnsubscribed(email) {
    if (!supabase) return false;
    
    try {
        const { data } = await supabase
            .from('unsubscribe')
            .select('id')
            .eq('email', email)
            .single();
        
        return !!data;
        
    } catch (error) {
        return false;
    }
}

/**
 * UTILITY FUNCTIONS
 */

function isSupabaseConfigured() {
    return supabase !== null;
}

module.exports = {
    initSupabase,
    isSupabaseConfigured,
    
    // Leads
    saveLeadToSupabase,
    updateLeadScore,
    getNewLeads,
    getLeadsBySource,
    
    // Outreach
    saveOutreachToSupabase,
    checkExistingOutreach,
    
    // Profiles
    saveProfileToSupabase,
    
    // Unsubscribe
    addToUnsubscribe,
    checkUnsubscribed
};
