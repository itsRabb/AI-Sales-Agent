/**
 * AUTONOMOUS ORCHESTRATOR
 * 
 * This is the brain that runs 24/7, learns from mistakes, and adapts.
 * 
 * What it does:
 * - Searches DuckDuckGo for real estate agents (learns what keywords work)
 * - Scrapes profiles automatically
 * - Scores leads with AI
 * - Generates and sends emails
 * - Tracks what works and what doesn't
 * - ADAPTS its strategy based on results
 * - Broadcasts what it's doing in real-time
 */

const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const http = require('http');
const nodemailer = require('nodemailer');
const supabaseDb = require('./supabase-db.js');

// Clear module cache to ensure latest code is loaded
delete require.cache[require.resolve('./url-discovery.js')];
delete require.cache[require.resolve('./url-assignment.js')];

const urlDiscovery = require('./url-discovery.js');
const urlAssignment = require('./url-assignment.js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.ORCHESTRATOR_PORT || 5000;

// Global settings
global.linkedInEnabled = false; // Can be toggled via dashboard

// RiPis are workers (scrapers only - no AI processing)
const SCRAPERS = [
    process.env.RIPI_1_URL || 'http://localhost:8001',  // Worker Agent #1
    process.env.RIPI_2_URL || 'http://localhost:8002'   // Worker Agent #2
];
let currentScraperIndex = 0;

function getNextScraper() {
    const scraper = SCRAPERS[currentScraperIndex];
    currentScraperIndex = (currentScraperIndex + 1) % SCRAPERS.length;
    return scraper;
}

// Brains handle email sending (M73 & M715Q)
const BRAIN_AGENTS = [
    process.env.M73_BRAIN_URL || 'http://localhost:6001',
    process.env.M715Q_BRAIN_URL || 'http://localhost:6002'
];

// Ollama endpoints for scoring
const M715Q_OLLAMA = process.env.M715Q_OLLAMA_URL || 'http://localhost:11434/api/generate';

// Email transporter (Hostinger SMTP)
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT == 465, // SSL for 465, STARTTLS for 587
    requireTLS: process.env.SMTP_PORT == 587, // Required for port 587
    auth: {
        user: process.env.HOSTINGER_EMAIL_1,
        pass: process.env.HOSTINGER_PASSWORD
    }
});

// Verify email configuration on startup
emailTransporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email configuration error:', error.message);
        console.error('Check HOSTINGER_EMAIL_1 and HOSTINGER_PASSWORD in .env');
    } else {
        console.log('✅ Email transporter ready:', process.env.HOSTINGER_EMAIL_1);
    }
});

// Learning database - tracks what works
const learningData = {
    searchKeywords: [
        // Start with these, will learn which ones work best
        { keyword: 'independent real estate agent florida', successRate: 0, timesUsed: 0, leadQuality: [] },
        { keyword: 'realtor small business miami', successRate: 0, timesUsed: 0, leadQuality: [] },
        { keyword: 'real estate broker houston', successRate: 0, timesUsed: 0, leadQuality: [] },
        { keyword: 'independent realtor charleston', successRate: 0, timesUsed: 0, leadQuality: [] },
        { keyword: 'real estate agent new orleans', successRate: 0, timesUsed: 0, leadQuality: [] },
    ],
    scrapingStrategies: [
        { method: 'zillow', successRate: 0, timesUsed: 0 },
        { method: 'realtor.com', successRate: 0, timesUsed: 0 },
        { method: 'redfin', successRate: 0, timesUsed: 0 },
        { method: 'linkedin', successRate: 0, timesUsed: 0 },
    ],
    emailSubjectLines: [
        { template: 'Quick idea for your {location} listings', openRate: 0, timesUsed: 0 },
        { template: 'Helping agents in {location} close faster', openRate: 0, timesUsed: 0 },
        { template: '{name} - seen your {location} properties', openRate: 0, timesUsed: 0 },
    ],
    targetLocations: [
    // ALL 50 STATES - Comprehensive Nationwide Coverage
    
    // ALABAMA
    { city: 'Birmingham', state: 'AL', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Montgomery', state: 'AL', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Mobile', state: 'AL', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Huntsville', state: 'AL', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // ALASKA
    { city: 'Anchorage', state: 'AK', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Fairbanks', state: 'AK', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Juneau', state: 'AK', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // ARIZONA
    { city: 'Phoenix', state: 'AZ', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Tucson', state: 'AZ', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Mesa', state: 'AZ', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Scottsdale', state: 'AZ', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Chandler', state: 'AZ', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Glendale', state: 'AZ', priority: 8, leadsFound: 0, conversionRate: 0 },
    
    // ARKANSAS
    { city: 'Little Rock', state: 'AR', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Fort Smith', state: 'AR', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Fayetteville', state: 'AR', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // CALIFORNIA
    { city: 'Los Angeles', state: 'CA', priority: 10, leadsFound: 0, conversionRate: 0 },
    { city: 'San Diego', state: 'CA', priority: 10, leadsFound: 0, conversionRate: 0 },
    { city: 'San Francisco', state: 'CA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Sacramento', state: 'CA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'San Jose', state: 'CA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Oakland', state: 'CA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Fresno', state: 'CA', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Long Beach', state: 'CA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Bakersfield', state: 'CA', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Anaheim', state: 'CA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Irvine', state: 'CA', priority: 9, leadsFound: 0, conversionRate: 0 },
    
    // COLORADO
    { city: 'Denver', state: 'CO', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Colorado Springs', state: 'CO', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Aurora', state: 'CO', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Fort Collins', state: 'CO', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Boulder', state: 'CO', priority: 8, leadsFound: 0, conversionRate: 0 },
    
    // CONNECTICUT
    { city: 'Hartford', state: 'CT', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Bridgeport', state: 'CT', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'New Haven', state: 'CT', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Stamford', state: 'CT', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // DELAWARE
    { city: 'Wilmington', state: 'DE', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Dover', state: 'DE', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // FLORIDA
    { city: 'Miami', state: 'FL', priority: 10, leadsFound: 0, conversionRate: 0 },
    { city: 'Tampa', state: 'FL', priority: 10, leadsFound: 0, conversionRate: 0 },
    { city: 'Jacksonville', state: 'FL', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Fort Lauderdale', state: 'FL', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Orlando', state: 'FL', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'St Petersburg', state: 'FL', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Naples', state: 'FL', priority: 10, leadsFound: 0, conversionRate: 0 },
    { city: 'Sarasota', state: 'FL', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Clearwater', state: 'FL', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'West Palm Beach', state: 'FL', priority: 9, leadsFound: 0, conversionRate: 0 },
    
    // GEORGIA
    { city: 'Atlanta', state: 'GA', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Savannah', state: 'GA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Augusta', state: 'GA', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Columbus', state: 'GA', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Athens', state: 'GA', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // HAWAII
    { city: 'Honolulu', state: 'HI', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Hilo', state: 'HI', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Kailua', state: 'HI', priority: 8, leadsFound: 0, conversionRate: 0 },
    
    // IDAHO
    { city: 'Boise', state: 'ID', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Meridian', state: 'ID', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Idaho Falls', state: 'ID', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // ILLINOIS
    { city: 'Chicago', state: 'IL', priority: 6, leadsFound: 0, conversionRate: 0, lastFullScrape: null, isComplete: false },
    { city: 'Naperville', state: 'IL', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Aurora', state: 'IL', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Schaumburg', state: 'IL', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Joliet', state: 'IL', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Rockford', state: 'IL', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // INDIANA
    { city: 'Indianapolis', state: 'IN', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Fort Wayne', state: 'IN', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Evansville', state: 'IN', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Carmel', state: 'IN', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // IOWA
    { city: 'Des Moines', state: 'IA', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Cedar Rapids', state: 'IA', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Davenport', state: 'IA', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // KANSAS
    { city: 'Kansas City', state: 'KS', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Wichita', state: 'KS', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Overland Park', state: 'KS', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Olathe', state: 'KS', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // KENTUCKY
    { city: 'Louisville', state: 'KY', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Lexington', state: 'KY', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Bowling Green', state: 'KY', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // LOUISIANA
    { city: 'New Orleans', state: 'LA', priority: 10, leadsFound: 0, conversionRate: 0 },
    { city: 'Baton Rouge', state: 'LA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Shreveport', state: 'LA', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Lafayette', state: 'LA', priority: 8, leadsFound: 0, conversionRate: 0 },
    
    // MAINE
    { city: 'Portland', state: 'ME', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Augusta', state: 'ME', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // MARYLAND
    { city: 'Baltimore', state: 'MD', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Columbia', state: 'MD', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Annapolis', state: 'MD', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // MASSACHUSETTS
    { city: 'Boston', state: 'MA', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Worcester', state: 'MA', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Springfield', state: 'MA', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Cambridge', state: 'MA', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // MICHIGAN
    { city: 'Detroit', state: 'MI', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Grand Rapids', state: 'MI', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Ann Arbor', state: 'MI', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Troy', state: 'MI', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // MINNESOTA
    { city: 'Minneapolis', state: 'MN', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'St Paul', state: 'MN', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Rochester', state: 'MN', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Bloomington', state: 'MN', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // MISSISSIPPI
    { city: 'Jackson', state: 'MS', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Gulfport', state: 'MS', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Biloxi', state: 'MS', priority: 8, leadsFound: 0, conversionRate: 0 },
    
    // MISSOURI
    { city: 'Kansas City', state: 'MO', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'St Louis', state: 'MO', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Springfield', state: 'MO', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Columbia', state: 'MO', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // MONTANA
    { city: 'Billings', state: 'MT', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Missoula', state: 'MT', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Great Falls', state: 'MT', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // NEBRASKA
    { city: 'Omaha', state: 'NE', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Lincoln', state: 'NE', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // NEVADA
    { city: 'Las Vegas', state: 'NV', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Henderson', state: 'NV', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Reno', state: 'NV', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // NEW HAMPSHIRE
    { city: 'Manchester', state: 'NH', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Nashua', state: 'NH', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Concord', state: 'NH', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // NEW JERSEY
    { city: 'Newark', state: 'NJ', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Jersey City', state: 'NJ', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Paterson', state: 'NJ', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Elizabeth', state: 'NJ', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // NEW MEXICO
    { city: 'Albuquerque', state: 'NM', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Santa Fe', state: 'NM', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Las Cruces', state: 'NM', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // NEW YORK
    { city: 'New York', state: 'NY', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Buffalo', state: 'NY', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Rochester', state: 'NY', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Syracuse', state: 'NY', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Albany', state: 'NY', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // NORTH CAROLINA
    { city: 'Charlotte', state: 'NC', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Raleigh', state: 'NC', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Greensboro', state: 'NC', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Durham', state: 'NC', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Winston-Salem', state: 'NC', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // NORTH DAKOTA
    { city: 'Fargo', state: 'ND', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Bismarck', state: 'ND', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // OHIO
    { city: 'Columbus', state: 'OH', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Cleveland', state: 'OH', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Cincinnati', state: 'OH', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Toledo', state: 'OH', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Akron', state: 'OH', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // OKLAHOMA
    { city: 'Oklahoma City', state: 'OK', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Tulsa', state: 'OK', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Norman', state: 'OK', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // OREGON
    { city: 'Portland', state: 'OR', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Eugene', state: 'OR', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Salem', state: 'OR', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Bend', state: 'OR', priority: 8, leadsFound: 0, conversionRate: 0 },
    
    // PENNSYLVANIA
    { city: 'Philadelphia', state: 'PA', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Pittsburgh', state: 'PA', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Allentown', state: 'PA', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Erie', state: 'PA', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // RHODE ISLAND
    { city: 'Providence', state: 'RI', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Warwick', state: 'RI', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // SOUTH CAROLINA
    { city: 'Charleston', state: 'SC', priority: 10, leadsFound: 0, conversionRate: 0 },
    { city: 'Columbia', state: 'SC', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Myrtle Beach', state: 'SC', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Greenville', state: 'SC', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // SOUTH DAKOTA
    { city: 'Sioux Falls', state: 'SD', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Rapid City', state: 'SD', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // TENNESSEE
    { city: 'Nashville', state: 'TN', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Memphis', state: 'TN', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Knoxville', state: 'TN', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Chattanooga', state: 'TN', priority: 7, leadsFound: 0, conversionRate: 0 },
    
    // TEXAS
    { city: 'Houston', state: 'TX', priority: 10, leadsFound: 0, conversionRate: 0 },
    { city: 'Dallas', state: 'TX', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Austin', state: 'TX', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'San Antonio', state: 'TX', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Fort Worth', state: 'TX', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'El Paso', state: 'TX', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Plano', state: 'TX', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Arlington', state: 'TX', priority: 8, leadsFound: 0, conversionRate: 0 },
    
    // UTAH
    { city: 'Salt Lake City', state: 'UT', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Provo', state: 'UT', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'West Valley City', state: 'UT', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Park City', state: 'UT', priority: 9, leadsFound: 0, conversionRate: 0 },
    
    // VERMONT
    { city: 'Burlington', state: 'VT', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Montpelier', state: 'VT', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // VIRGINIA
    { city: 'Virginia Beach', state: 'VA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Norfolk', state: 'VA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Richmond', state: 'VA', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Arlington', state: 'VA', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Alexandria', state: 'VA', priority: 8, leadsFound: 0, conversionRate: 0 },
    
    // WASHINGTON
    { city: 'Seattle', state: 'WA', priority: 9, leadsFound: 0, conversionRate: 0 },
    { city: 'Spokane', state: 'WA', priority: 7, leadsFound: 0, conversionRate: 0 },
    { city: 'Tacoma', state: 'WA', priority: 8, leadsFound: 0, conversionRate: 0 },
    { city: 'Bellevue', state: 'WA', priority: 9, leadsFound: 0, conversionRate: 0 },
    
    // WEST VIRGINIA
    { city: 'Charleston', state: 'WV', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Huntington', state: 'WV', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // WISCONSIN
    { city: 'Milwaukee', state: 'WI', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Madison', state: 'WI', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Green Bay', state: 'WI', priority: 6, leadsFound: 0, conversionRate: 0 },
    
    // WYOMING
    { city: 'Cheyenne', state: 'WY', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Casper', state: 'WY', priority: 6, leadsFound: 0, conversionRate: 0 },
    { city: 'Jackson', state: 'WY', priority: 8, leadsFound: 0, conversionRate: 0 },
    ],
    metrics: {
        totalSearches: 0,
        totalLeadsFound: 0,
        totalLeadsScored: 0,
        totalEmailsSent: 0,
        totalReplies: 0,
        totalConversions: 0,
        currentStrategy: 'exploration', // exploration or exploitation
        lastStrategyChange: Date.now(),
        consecutiveFailures: 0,
    },
    currentActivity: 'Starting up...',
    lastActivityUpdate: Date.now(),
};

// Activity logs for dashboard viewing
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
}

// Activity broadcasting
function broadcastActivity(activity, details = {}) {
    learningData.currentActivity = activity;
    learningData.lastActivityUpdate = Date.now();
    
    // Add to logs
    addLog(activity, 'info');
    if (Object.keys(details).length > 0) {
        addLog(`  Details: ${JSON.stringify(details)}`, 'debug');
    }
    
    const message = {
        type: 'activity',
        activity,
        details,
        timestamp: Date.now(),
        metrics: learningData.metrics
    };
    
    // Broadcast to all connected dashboard clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
    
    // Only log important activities to console (not every single broadcast)
    const importantActivities = [
        '🚀 Starting autonomous',
        '🎉 Lead processed successfully',
        '❌ Critical error',
        '⚠️ Retry limit',
        '✅ Email sent successfully',
        '⏸️ Fleet paused',
        '▶️ Fleet resumed',
        '⏹️ Fleet operations stopped',
        '📊 Strategy adapted'
    ];
    
    const shouldLog = importantActivities.some(keyword => activity.includes(keyword));
    
    if (shouldLog) {
        console.log(`\n🤖 [${new Date().toLocaleTimeString()}] ${activity}`);
        if (Object.keys(details).length > 0) {
            console.log('   Details:', JSON.stringify(details, null, 2));
        }
    }
}

// Smart keyword selector - learns which keywords find quality leads
function selectSmartKeyword() {
    const strategy = learningData.metrics.currentStrategy;
    
    if (strategy === 'exploration' || learningData.metrics.totalSearches < 20) {
        // Exploration: Try different keywords to learn
        const leastUsed = learningData.searchKeywords.sort((a, b) => a.timesUsed - b.timesUsed)[0];
        broadcastActivity('🔍 Exploring new search strategy', { 
            keyword: leastUsed.keyword,
            reason: 'Learning phase - trying different approaches'
        });
        return leastUsed;
    } else {
        // Exploitation: Use what works (80/20 rule)
        if (Math.random() < 0.8) {
            // 80% - use best performing keyword
            const bestKeyword = learningData.searchKeywords
                .filter(k => k.timesUsed > 0)
                .sort((a, b) => b.successRate - a.successRate)[0];
            broadcastActivity('🎯 Using proven strategy', {
                keyword: bestKeyword.keyword,
                successRate: `${(bestKeyword.successRate * 100).toFixed(1)}%`,
                reason: 'Best performing search term'
            });
            return bestKeyword;
        } else {
            // 20% - explore new options
            const random = learningData.searchKeywords[Math.floor(Math.random() * learningData.searchKeywords.length)];
            broadcastActivity('🧪 Testing alternative approach', {
                keyword: random.keyword,
                reason: 'Continuous learning - exploring variations'
            });
            return random;
        }
    }
}

// Smart location selector
function selectSmartLocation() {
    const RESCRAPE_DAYS = 30; // Wait 30 days before re-scraping a completed city
    const now = Date.now();
    
    // Filter out recently completed cities
    const availableLocations = learningData.targetLocations.filter(loc => {
        if (!loc.isComplete) return true; // Not completed yet, available
        if (!loc.lastFullScrape) return true; // No scrape date, available
        
        const daysSinceLastScrape = (now - loc.lastFullScrape) / (1000 * 60 * 60 * 24);
        return daysSinceLastScrape >= RESCRAPE_DAYS; // Re-scrape after 30 days
    });
    
    // If all cities are complete, reset them all
    if (availableLocations.length === 0) {
        broadcastActivity('🔄 All cities scraped - resetting completion flags', {
            note: 'Will start fresh scraping cycle'
        });
        learningData.targetLocations.forEach(loc => {
            loc.isComplete = false;
        });
        return learningData.targetLocations.sort((a, b) => {
            const aScore = a.priority + (a.conversionRate * 10);
            const bScore = b.priority + (b.conversionRate * 10);
            return bScore - aScore;
        })[0];
    }
    
    // Prioritize high-risk flood areas and locations with good conversion rates
    const sorted = availableLocations.sort((a, b) => {
        const aScore = a.priority + (a.conversionRate * 10);
        const bScore = b.priority + (b.conversionRate * 10);
        return bScore - aScore;
    });
    
    return sorted[0];
}

// Multi-layer deep search for SMALL independent realtors
async function searchForRealtors() {
    const keyword = selectSmartKeyword();
    const location = selectSmartLocation();
    
    keyword.timesUsed++;
    learningData.metrics.totalSearches++;
    
    // Use separate city and state fields
    const city = location.city;
    const state = location.state;
    const citySlug = city.toLowerCase().replace(/[^a-z]/g, '-').replace(/--+/g, '-');
    const stateSlug = state.toLowerCase();
    
    // ❌ FALLBACK REMOVED - MUST USE URL DISCOVERY ONLY
    // broadcastActivity('🔎 Deep search for independent realtors', {
    //     target: `Chicago area agents`,
    //     strategy: 'ChicagoRealtor.com Directory (Batched)',
    //     filters: 'All licensed realtors',
    //     attempt: keyword.timesUsed,
    //     note: 'Scraping in 5-page batches to avoid memory issues'
    // });
    
    try {
        const urls = [];
        
        // ❌ FALLBACK REMOVED - NO HARDCODED URLS
        // ChicagoRealtor.com - comprehensive Chicago metro area database
        // Single base URL - scraper will click Next button for 5 pages
        // We call it multiple times to avoid memory overflow (15k+ total agents)
        // Each scrape: 5 pages × 500 agents = 2,500 agents per batch
        // urls.push('https://chicagorealtor.com/realtor-search/');
        
        // ❌ FALLBACK REMOVED - NO BOUTIQUE QUERIES
        // const neighborhoods = getNeighborhoods(city);
        // const boutiqueQueries = [
        //     `boutique real estate ${city}`,
        //     `independent realtor ${city}`,
        //     `local real estate agents ${city}`
        // ];
        
        // ❌ FALLBACK REMOVED - EMPTY URLS ARRAY FORCES URL DISCOVERY
        broadcastActivity('⚠️ NO FALLBACK - Using URL Discovery ONLY', {
            totalUrls: urls.length,
            note: 'System MUST use AI URL discovery - no hardcoded URLs'
        });
        
        keyword.successRate = ((keyword.successRate * (keyword.timesUsed - 1)) + 1) / keyword.timesUsed;
        learningData.metrics.consecutiveFailures = 0;
        
        return { 
            urls, 
            location, 
            keyword,
            searchQueries: boutiqueQueries,
            neighborhoods,
            filters: {
                excludeBrokerages: ['Compass', 'RE/MAX', 'Keller Williams', 'Coldwell Banker', 'Sotheby', 'Douglas Elliman', 'Berkshire Hathaway', 'Century 21', 'eXp Realty'],
                targetKeywords: ['boutique', 'independent', 'local', 'small', 'family-owned', 'solo agent'],
                maxTeamSize: 20,
                preferDirect: true // Prefer direct contact info over general office emails
            }
        };
        
    } catch (error) {
        broadcastActivity('❌ Search failed', {
            error: error.message,
            willRetry: true,
            retryIn: '30 seconds'
        });
        
        keyword.successRate = ((keyword.successRate * (keyword.timesUsed - 1)) + 0) / keyword.timesUsed;
        learningData.metrics.consecutiveFailures++;
        
        return null;
    }
}

// Get major neighborhoods for a city (helps find local boutique firms)
function getNeighborhoods(city) {
    const neighborhoodMap = {
        'Miami': ['Coral Gables', 'Brickell', 'Wynwood', 'Coconut Grove', 'Pinecrest', 'South Beach', 'Key Biscayne'],
        'Fort Lauderdale': ['Las Olas', 'Victoria Park', 'Wilton Manors', 'Harbor Beach', 'Rio Vista'],
        'Orlando': ['Winter Park', 'Baldwin Park', 'College Park', 'Thornton Park', 'Lake Nona'],
        'Tampa': ['Hyde Park', 'Seminole Heights', 'Davis Islands', 'Westshore', 'South Tampa'],
        'Jacksonville': ['Riverside', 'Avondale', 'San Marco', 'Beaches', 'Mandarin'],
        'Naples': ['Old Naples', 'Park Shore', 'Pelican Bay', 'Aqualane Shores', 'Port Royal'],
        'Palm Beach': ['West Palm Beach', 'Palm Beach Gardens', 'Jupiter', 'Wellington', 'Boca Raton']
    };
    
    return neighborhoodMap[city] || [];
}

// Scrape lead profiles with deep search and filtering
async function scrapeProfiles(searchResult) {
    const scraperUrl = getNextScraper();
    
    const urls = searchResult.urls || searchResult;
    const filters = searchResult.filters || {};
    const searchQueries = searchResult.searchQueries || [];
    const neighborhoods = searchResult.neighborhoods || [];
    
    broadcastActivity('🕷️ Scraping with smart parsers', {
        urls: Array.isArray(urls) ? urls.length : 0,
        sources: Array.isArray(urls) ? urls.slice(0, 5).map(u => {
            try {
                return new URL(u).hostname;
            } catch {
                return 'unknown';
            }
        }) : [],
        method: 'Smart parsers (parsers.py)',
        scraper: scraperUrl
    });
    
    try {
        // Use simple /scrape endpoint (ripi_scraper.py with smart parsers)
        const response = await axios.post(`${scraperUrl}/scrape`, { 
            urls: Array.isArray(urls) ? urls : [urls],
            location: searchResult.location?.city || null
        }, { 
            timeout: 120000 // Longer timeout for scraping
        });
        
        const responseData = response.data;
        const results = responseData.agents || responseData.results || [];
        const totalFound = responseData.scraped || (Array.isArray(results) ? results.length : 0);
        const afterFiltering = totalFound; // Smart parsers already filter in parsers.py
        const brokeragesProcessed = 0; // Not tracked in simple version
        
        learningData.metrics.totalLeadsFound += afterFiltering;
        
        // Learn which scraping sources work best
        if (Array.isArray(results)) {
            results.forEach(result => {
                try {
                    const platform = result.platform || 'unknown';
                    const strategy = learningData.scrapingStrategies.find(s => s.method === platform);
                    if (strategy) {
                        strategy.timesUsed++;
                        // Count as success if result has priority 'high' or contact info
                        const isSuccess = result.priority === 'high' || result.phone || result.email;
                        strategy.successRate = ((strategy.successRate * (strategy.timesUsed - 1)) + (isSuccess ? 1 : 0)) / strategy.timesUsed;
                    }
                } catch (err) {
                    // Skip invalid results
                }
            });
        }
        
        broadcastActivity('✅ Scrape complete (smart parsers)', {
            totalFound: totalFound,
            agentsExtracted: afterFiltering,
            usedSmartParsers: true,
            dataQuality: afterFiltering > 0 ? 'Excellent ✓' : 'No agents found',
            scraperUsed: scraperUrl
        });
        
        return results;
    } catch (error) {
        broadcastActivity('❌ Scraping failed', {
            error: error.message,
            scraperStatus: `Check if ${scraperUrl} is online`,
            willTry: 'Other scraper on next attempt'
        });
        throw error;
    }
}

// LinkedIn enrichment - Search Google and scrape LinkedIn profile
async function enrichWithLinkedIn(leadData) {
    // Check if LinkedIn enrichment is enabled
    if (!global.linkedInEnabled) {
        return leadData; // Return unchanged
    }

    broadcastActivity('🔍 Searching for LinkedIn profile', {
        name: leadData.name,
        location: leadData.location
    });

    try {
        const scraperUrl = getNextScraper();
        
        // Build Google search query with more context
        const searchQuery = [
            leadData.name,
            'realtor',
            leadData.brokerage || '',
            leadData.location || '',
            'site:linkedin.com/in'
        ].filter(Boolean).join(' ');

        // Search Google for LinkedIn profile
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
        
        broadcastActivity('🌐 Google searching', {
            query: searchQuery
        });

        // Call RiPi to scrape Google search results
        const googleResponse = await axios.post(`${scraperUrl}/scrape`, {
            urls: [googleUrl]
        }, { timeout: 30000 });

        // Extract LinkedIn URL from Google results
        const linkedInUrl = extractLinkedInUrl(googleResponse.data);
        
        if (!linkedInUrl) {
            broadcastActivity('⚠️ No LinkedIn profile found', {
                name: leadData.name
            });
            return leadData;
        }

        broadcastActivity('✅ Found LinkedIn profile', {
            url: linkedInUrl
        });

        // Scrape LinkedIn profile
        const linkedInResponse = await axios.post(`${scraperUrl}/scrape`, {
            urls: [linkedInUrl],
            platform: 'linkedin'
        }, { timeout: 30000 });

        const linkedInData = linkedInResponse.data.results?.[0] || linkedInResponse.data[0];

        if (linkedInData) {
            // Merge LinkedIn data with lead data
            leadData.linkedin_url = linkedInUrl;
            leadData.linkedin_headline = linkedInData.headline;
            leadData.linkedin_experience = linkedInData.experience;
            leadData.linkedin_connections = linkedInData.connections;
            
            // Try to extract better email or phone if available
            if (linkedInData.email && !leadData.email) {
                leadData.email = linkedInData.email;
            }
            if (linkedInData.phone && !leadData.phone) {
                leadData.phone = linkedInData.phone;
            }

            broadcastActivity('✅ LinkedIn data enriched', {
                headline: linkedInData.headline,
                connections: linkedInData.connections
            });
        }

        return leadData;

    } catch (error) {
        broadcastActivity('⚠️ LinkedIn enrichment failed', {
            error: error.message,
            continuing: 'Processing without LinkedIn data'
        });
        return leadData; // Return original data if enrichment fails
    }
}

// Extract LinkedIn profile URL from Google search HTML
function extractLinkedInUrl(googleData) {
    try {
        const results = Array.isArray(googleData.results) ? googleData.results : googleData;
        const html = results[0]?.html || JSON.stringify(results);
        
        // Look for LinkedIn profile URLs in the HTML
        const linkedInPattern = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/g;
        const matches = html.match(linkedInPattern);
        
        if (matches && matches.length > 0) {
            // Return first match (most relevant)
            return matches[0];
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// Score lead with AI (prioritizing small/independent agents)
async function scoreLead(scrapedData, location) {
    broadcastActivity('🧠 Analyzing lead with M715Q Ollama', {
        location: location.city,
        profiles: Array.isArray(scrapedData) ? scrapedData.length : 1
    });
    
    // Extract brokerage info for scoring boost
    const brokerage = scrapedData.brokerage || scrapedData.office_name || 'Unknown';
    const contactQuality = scrapedData.contact_quality || 'unknown';
    const priority = scrapedData.priority || 'medium';
    
    const prompt = `You are a lead scoring AI for a B2B SaaS selling white-label hazard reports to real estate agents.

TARGET PROFILE: Small, independent, boutique real estate agents and brokerages. These are our BEST prospects.

🎯 SCORING CRITERIA (1-10):

HIGH PRIORITY (+3 points):
- Independent/boutique brokerage (NOT Compass, RE/MAX, Keller Williams, Sotheby's, etc.)
- Small team size (<20 agents)
- Local/family-owned firm
- Direct contact info (personal email, not info@ or office@)
- Keywords: "boutique", "independent", "local", "small firm"

MEDIUM PRIORITY (+1-2 points):
- Active online presence
- Recent sales activity
- Good reviews/ratings
- Located in high-risk area (${location.city} - flood/fire/earthquake zones)

LOWER PRIORITY (-2 points):
- Part of big national chain
- Generic office contact only
- Low tech adoption signals

Current Agent Data:
- Brokerage: ${brokerage}
- Contact Quality: ${contactQuality}
- Priority Tag: ${priority}
- Full Profile: ${JSON.stringify(scrapedData, null, 2)}

Respond ONLY with valid JSON:
{
  "score": 8,
  "reasoning": "Why this score (mention if small/independent)",
  "name": "Agent Name",
  "email": "email@example.com",
  "phone": "555-1234",
  "brokerage": "${brokerage}",
  "brokerageSize": "small|medium|large",
  "isTargetProfile": true,
  "strengths": ["Independent brokerage", "Direct contact", "High-risk location"],
  "redFlags": ["flag 1"],
  "nextSteps": "Emphasize white-label benefits for boutique firms"
}`;

    try {
        const response = await axios.post(M715Q_OLLAMA, {
            model: 'llama3.1:8b',
            prompt,
            stream: false,
            options: { temperature: 0.3 }
        }, { timeout: 120000 });
        
        const aiResponse = response.data.response;
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const scoreData = JSON.parse(jsonMatch[0]);
            
            // Boost score for small/independent agents
            let finalScore = scoreData.score;
            if (priority === 'high' || contactQuality === 'direct') {
                finalScore = Math.min(10, finalScore + 1);
                scoreData.scoreBoost = '+1 (target profile match)';
            }
            
            scoreData.score = finalScore;
            learningData.metrics.totalLeadsScored++;
            
            // Track quality distribution
            if (scoreData.isTargetProfile) {
                learningData.metrics.qualityLeads = (learningData.metrics.qualityLeads || 0) + 1;
            }
            
            broadcastActivity('✅ Lead scored', {
                score: `${finalScore}/10`,
                name: scoreData.name || 'Unknown',
                brokerage: brokerage,
                targetMatch: scoreData.isTargetProfile ? 'YES ✓' : 'no',
                quality: finalScore >= 7 ? 'Hot 🔥' : finalScore >= 5 ? 'Warm' : 'Cold'
            });
            
            return scoreData;
        } else {
            throw new Error('AI returned invalid JSON');
        }
    } catch (error) {
        broadcastActivity('❌ Lead scoring failed', {
            error: error.message,
            brainStatus: 'Check if M73 is running Ollama'
        });
        throw error;
    }
}

// Generate email with AI
async function generateEmail(scoreData, location) {
    broadcastActivity('✍️ Writing personalized email', {
        leadName: scoreData.name,
        leadScore: scoreData.score,
        location: location.city
    });
    
    const subjectTemplate = selectSmartSubject();
    subjectTemplate.timesUsed++;
    
    const subject = subjectTemplate.template
        .replace('{location}', location.city.split(',')[0])
        .replace('{name}', scoreData.name || 'there');
    
    const prompt = `You are a sales expert writing to ${scoreData.name}, a real estate agent in ${location.city}.

Their score: ${scoreData.score}/10
Strengths: ${scoreData.strengths.join(', ')}
What to emphasize: ${scoreData.nextSteps}

Write a SHORT email (3 paragraphs) that:
1. Opens with something specific about their business
2. Introduces white-label hazard reports (flood/fire/earthquake) for faster deal closures
3. Mentions ${location.city}'s specific risks
4. Soft CTA (just reply to chat)

Tone: Professional, peer-to-peer, not salesy.

Respond ONLY with JSON:
{
  "body": "Hi ${scoreData.name},\\n\\n[EMAIL BODY]\\n\\nBest,\\n[Your Name]"
}`;

    try {
        const response = await axios.post(M715Q_OLLAMA, {
            model: 'llama3.1:8b',
            prompt,
            stream: false,
            options: { temperature: 0.7 }
        }, { timeout: 120000 });
        
        const aiResponse = response.data.response;
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const emailData = JSON.parse(jsonMatch[0]);
            
            broadcastActivity('✅ Email generated', {
                subject,
                preview: emailData.body.substring(0, 100) + '...'
            });
            
            return { subject, body: emailData.body };
        } else {
            throw new Error('AI returned invalid JSON');
        }
    } catch (error) {
        broadcastActivity('❌ Email generation failed', {
            error: error.message
        });
        throw error;
    }
}

function selectSmartSubject() {
    // Use best performing subject line 70% of the time
    if (Math.random() < 0.7 && learningData.emailSubjectLines.some(s => s.timesUsed > 0)) {
        return learningData.emailSubjectLines
            .filter(s => s.timesUsed > 0)
            .sort((a, b) => b.openRate - a.openRate)[0];
    } else {
        return learningData.emailSubjectLines[Math.floor(Math.random() * learningData.emailSubjectLines.length)];
    }
}

// Save RAW lead to Supabase immediately after scraping
async function saveRawLeadToSupabase(profile, location) {
    const fullLocation = `${location.city}, ${location.state}`;
    broadcastActivity('💾 Saving raw lead to Supabase', {
        name: profile.name,
        location: fullLocation
    });
    
    try {
        const leadData = {
            name: profile.name || 'Unknown',
            company: profile.brokerage || profile.company,
            location: fullLocation,
            email: profile.email || '',
            phone: profile.phone || '',
            source_site: profile.source_site,
            source_url: profile.source_url,
            brokerage: profile.brokerage
        };
        
        const leadId = await supabaseDb.saveLeadToSupabase(leadData);
        
        if (!leadId) {
            broadcastActivity('⏭️ Duplicate lead found, skipping', {
                name: profile.name,
                location: fullLocation
            });
            return null;
        }
        
        broadcastActivity('✅ Raw lead saved to Supabase', {
            leadId: leadId,
            name: profile.name
        });
        
        return leadId;
    } catch (error) {
        broadcastActivity('❌ Failed to save raw lead', {
            error: error.message,
            name: profile.name
        });
        return null;
    }
}

// Update lead with score
async function updateLeadScore(leadId, scoreData) {
    try {
        const success = await supabaseDb.updateLeadScore(leadId, scoreData);
        
        if (success) {
            broadcastActivity('✅ Score updated in Supabase', {
                leadId,
                score: scoreData.score
            });
        } else {
            broadcastActivity('❌ Failed to update score', {
                leadId
            });
        }
    } catch (error) {
        broadcastActivity('❌ Failed to update score', {
            error: error.message,
            leadId
        });
    }
}

// Send email via M73 brain
async function sendEmail(leadId, email, emailData) {
    try {
        // Check if we already contacted this lead
        const alreadyContacted = await supabaseDb.checkExistingOutreach(leadId, 'Email');
        
        if (alreadyContacted) {
            broadcastActivity('⏭️ Already contacted this lead, skipping email', {
                leadId: leadId
            });
            return;
        }
        
        broadcastActivity('📧 Sending email', {
            to: email,
            subject: emailData.subject
        });
        
        const info = await emailTransporter.sendMail({
            from: `"Your Name - Your Company" <${process.env.HOSTINGER_EMAIL_1}>`,
            to: email,
            subject: emailData.subject,
            text: emailData.body,
            html: emailData.body.replace(/\n/g, '<br>'),
            headers: {
                'List-Unsubscribe': `<mailto:${process.env.HOSTINGER_EMAIL_1}?subject=unsubscribe>`,
                'X-Mailer': 'AI Sales Agent'
            }
        });
        
        learningData.metrics.totalEmailsSent++;
        
        // Save outreach to Supabase
        await supabaseDb.saveOutreachToSupabase({
            lead_id: leadId,
            type: 'Email',
            subject: emailData.subject,
            body: emailData.body,
            notes: `Sent via ${process.env.HOSTINGER_EMAIL_1}\nMessage ID: ${info.messageId}`
        });
        
        broadcastActivity('✅ Email sent successfully!', {
            to: email,
            messageId: info.messageId
        });
    } catch (error) {
        broadcastActivity('❌ Email send failed', {
            to: email,
            error: error.message
        });
    }
}

// Main autonomous loop
async function autonomousLoop() {
    broadcastActivity('🚀 Starting autonomous lead generation cycle with URL Discovery');
    
    while (fleetRunning) {
        try {
            // Step 1: Smart location selection
            const location = selectSmartLocation();
            broadcastActivity('🎯 Selected target location', {
                city: location.city,
                state: location.state,
                priority: location.priority,
                leadsFound: location.leadsFound
            });
            
            // Step 2: Discover URLs using AI + learned keywords
            const cities = [{ city: location.city, state: location.state }];
            const directories = await urlDiscovery.discoverForCities(cities, learningData.searchKeywords);
            
            if (!directories || directories.length === 0) {
                broadcastActivity('⏸️ No directories found for location, waiting before retry', {
                    location: `${location.city}, ${location.state}`,
                    waitTime: '2 minutes',
                    willTry: 'Different location'
                });
                await sleep(120000); // Wait 2 minutes
                
                // Check if still running after sleep
                if (!fleetRunning) break;
                continue;
            }
            
            broadcastActivity('✅ Discovered directories', {
                count: directories.length,
                location: `${location.city}, ${location.state}`
            });
            
            // Step 3: Assign to RiPis
            const assignments = urlAssignment.assignURLsToRiPis(directories);
            
            console.log(`🔧 DEBUG: directories.length = ${directories.length}`)
            console.log(`🔧 DEBUG: assignments.ripi1.length = ${assignments.ripi1.length}`);
            console.log(`🔧 DEBUG: assignments.ripi2.length = ${assignments.ripi2.length}`);
            
            // Step 3.5: SEND URLs to RiPis immediately
            broadcastActivity('📤 Sending URLs to RiPis for scraping', {
                ripi1: assignments.ripi1.length,
                ripi2: assignments.ripi2.length
            });
            
            // Send to RiPi #1
            if (assignments.ripi1.length > 0) {
                try {
                    const urls = assignments.ripi1.map(d => {
                        let clean = d.url.split('&rut=')[0].split('&df=')[0].split('?rut=')[0].split('?df=')[0].split('#')[0];
                        console.log(`🚀 SENDING TO RIPI #1: ${clean}`);
                        return clean;
                    });
                    console.log(`📡 POSTING ${urls.length} URLs TO ${SCRAPERS[0]}/scrape`);
                    // Fire and forget - don't wait for response
                    axios.post(`${SCRAPERS[0]}/scrape`, { urls }, { timeout: 30000 }).catch(err => {
                        console.log(`⚠️ RiPi #1 async error: ${err.message}`);
                    });
                    broadcastActivity('✅ Sent to RiPi #1', { count: urls.length });
                } catch (error) {
                    console.log(`❌ RIPI #1 ERROR:`, error.message);
                    broadcastActivity('⚠️ RiPi #1 unreachable', { error: error.message });
                }
            } else {
                console.log(`⏭️ SKIPPING RIPI #1 - No URLs assigned`);
            }
            
            // Send to RiPi #2
            if (assignments.ripi2.length > 0) {
                try {
                    const urls = assignments.ripi2.map(d => {
                        let clean = d.url.split('&rut=')[0].split('&df=')[0].split('?rut=')[0].split('?df=')[0].split('#')[0];
                        console.log(`🚀 SENDING TO RIPI #2: ${clean}`);
                        return clean;
                    });
                    console.log(`📡 POSTING ${urls.length} URLs TO ${SCRAPERS[1]}/scrape`);
                    // Fire and forget - don't wait for response
                    axios.post(`${SCRAPERS[1]}/scrape`, { urls }, { timeout: 30000 }).catch(err => {
                        console.log(`⚠️ RiPi #2 async error: ${err.message}`);
                    });
                    broadcastActivity('✅ Sent to RiPi #2', { count: urls.length });
                } catch (error) {
                    console.log(`❌ RIPI #2 ERROR:`, error.message);
                    broadcastActivity('⚠️ RiPi #2 unreachable', { error: error.message });
                }
            } else {
                console.log(`⏭️ SKIPPING RIPI #2 - No URLs assigned`);
            }
            
            // Step 4: Update learning metrics
            location.leadsFound += directories.length;
            directories.forEach(dir => {
                // Track which keywords were used (would need to extract from queries)
                // For now, just mark discovery as successful
                learningData.metrics.totalSearches++;
            });
            
            broadcastActivity('📊 URLs assigned to RiPi queue', {
                totalDirectories: directories.length,
                status: 'RiPis will process in queue mode'
            });
            
            // Quick pause before next discovery cycle (continuous mode)
            console.log('\n⏭️ Continuing discovery in 5 seconds...\n');
            await sleep(5000); // 5 seconds - keep it moving!
            
        } catch (error) {
            console.error('❌ Autonomous loop error:', error);
            broadcastActivity('❌ Error in autonomous cycle', {
                error: error.message,
                willRetry: 'in 2 minutes'
            });
            
            await sleep(120000);
        }
    }
    
    broadcastActivity('⏹️ Autonomous loop stopped');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================== 
// HTTP SERVER & API ENDPOINTS
// ==========================================// ==========================================
// FLEET CONTROL STATE (must be before endpoints)
// ==========================================
let fleetRunning = false;
let fleetLoopPromise = null;

// ==========================================
// API ENDPOINTS
// ==========================================
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// CORS middleware - Allow dashboard to communicate
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/orchestrator-ui.html');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        fleetRunning: fleetRunning,
        activity: learningData.currentActivity,
        metrics: learningData.metrics,
        uptime: process.uptime()
    });
});

app.get('/api/learning-data', (req, res) => {
    res.json(learningData);
});

// Real-time leads by source from Supabase
app.get('/api/leads-by-source', async (req, res) => {
    try {
        const counts = await supabaseDb.getLeadsBySource();
        res.json(counts);
    } catch (error) {
        console.error('Error fetching Supabase leads:', error.message);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

app.get('/logs', (req, res) => {
    res.json({
        logs: activityLogs,
        totalLogs: activityLogs.length,
        currentActivity: learningData.currentActivity,
        fleetRunning: fleetRunning
    });
});

app.get('/api/activity', (req, res) => {
    res.json({
        currentActivity: learningData.currentActivity,
        lastUpdate: learningData.lastActivityUpdate,
        metrics: learningData.metrics
    });
});

app.post('/api/pause', (req, res) => {
    if (!fleetRunning) {
        return res.json({ status: 'already_paused', message: 'Fleet is not running' });
    }
    
    fleetRunning = false;
    broadcastActivity('⏸️ Fleet paused by user');
    console.log('⏸️ Fleet paused by user');
    res.json({ status: 'paused', message: 'Fleet operations paused' });
});

app.post('/api/resume', async (req, res) => {
    console.log('🔔 /api/resume endpoint hit!');
    console.log('   Current fleetRunning:', fleetRunning);
    console.log('   Current fleetLoopPromise:', fleetLoopPromise ? 'exists' : 'null');
    
    if (fleetRunning) {
        console.log('⚠️ Fleet already running, sending already_running response');
        return res.json({ status: 'already_running', message: 'Fleet is already running' });
    }
    
    fleetRunning = true;
    broadcastActivity('▶️ Fleet resumed by user');
    console.log('\n🚀 Fleet operations STARTED');
    console.log('📊 Monitor progress at http://localhost:5000\n');
    
    // Start the autonomous loop
    if (!fleetLoopPromise) {
        console.log('✅ Starting autonomousLoop()...');
        fleetLoopPromise = autonomousLoop().catch(error => {
            console.error('💥 Error in autonomous loop:', error);
            fleetRunning = false;
            broadcastActivity('❌ Fleet stopped due to error', { error: error.message });
        });
    } else {
        console.log('ℹ️ autonomousLoop already exists, not starting new one');
    }
    
    console.log('✅ Sending success response to dashboard');
    res.json({ status: 'running', message: 'Fleet operations started' });
});

// ==========================================
// URL DISCOVERY & ASSIGNMENT ENDPOINTS
// ==========================================

// Discover directories for specific cities
app.post('/api/discover-urls', async (req, res) => {
    try {
        const { cities } = req.body;
        
        if (!cities || !Array.isArray(cities)) {
            return res.status(400).json({ 
                error: 'Missing cities array. Example: [{city: "Miami", state: "FL"}]' 
            });
        }
        
        broadcastActivity(`🔍 Discovering directories for ${cities.length} cities...`);
        
        // Pass learned keywords to discovery system
        const allDirectories = await urlDiscovery.discoverForCities(cities, learningData.searchKeywords);
        
        // Assign to RiPis
        const assignments = urlAssignment.assignURLsToRiPis(allDirectories);
        
        // Update learning metrics based on results
        allDirectories.forEach(dir => {
            const location = learningData.targetLocations.find(
                loc => loc.city === dir.city && loc.state === dir.state
            );
            if (location) {
                location.leadsFound++;
            }
        });
        
        res.json({
            success: true,
            discovered: allDirectories.length,
            assignments: {
                ripi1: assignments.ripi1.length,
                ripi2: assignments.ripi2.length
            },
            directories: allDirectories,
            queueStatus: urlAssignment.getQueueStatus()
        });
        
    } catch (error) {
        console.error('Discovery error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get next URL for a specific RiPi
app.get('/api/ripi/:ripiId/next-url', (req, res) => {
    const { ripiId } = req.params;
    
    if (!['ripi1', 'ripi2'].includes(ripiId)) {
        return res.status(400).json({ error: 'Invalid ripiId. Use "ripi1" or "ripi2"' });
    }
    
    const directory = urlAssignment.getNextURL(ripiId);
    
    if (!directory) {
        return res.json({ 
            hasWork: false,
            message: 'Queue empty'
        });
    }
    
    res.json({
        hasWork: true,
        directory: directory
    });
});

// Mark URL as completed
app.post('/api/ripi/:ripiId/complete', (req, res) => {
    const { ripiId } = req.params;
    const { url, stats } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Missing url' });
    }
    
    const status = urlAssignment.markURLComplete(url, ripiId, stats || {});
    
    res.json({
        success: true,
        status: status
    });
});

// Mark URL as failed
app.post('/api/ripi/:ripiId/failed', (req, res) => {
    const { ripiId } = req.params;
    const { url, reason } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Missing url' });
    }
    
    urlAssignment.markURLFailed(url, ripiId, reason || 'Unknown error');
    
    res.json({
        success: true,
        message: 'URL marked as failed'
    });
});

// Get queue status
app.get('/api/queue-status', (req, res) => {
    res.json(urlAssignment.getQueueStatus());
});

// ==========================================

// WebSocket connection for real-time updates
wss.on('connection', (ws) => {
    console.log('📡 Dashboard connected to orchestrator');
    
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Orchestrator real-time feed active',
        currentActivity: learningData.currentActivity,
        metrics: learningData.metrics
    }));
});

// ==========================================
// START SERVER
// ==========================================
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                                                ║
║      ██████╗ ██████╗  ██████╗██╗  ██╗███████╗███████╗████████╗██████╗  █████╗ ████████╗ ██████╗ ██████╗                      ║
║     ██╔═══██╗██╔══██╗██╔════╝██║  ██║██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗                     ║
║     ██║   ██║██████╔╝██║     ███████║█████╗  ███████╗   ██║   ██████╔╝███████║   ██║   ██║   ██║██████╔╝                     ║
║     ██║   ██║██╔══██╗██║     ██╔══██║██╔══╝  ╚════██║   ██║   ██╔══██╗██╔══██║   ██║   ██║   ██║██╔══██╗                     ║
║     ╚██████╔╝██║  ██║╚██████╗██║  ██║███████╗███████║   ██║   ██║  ██║██║  ██║   ██║   ╚██████╔╝██║  ██║                     ║
║      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝                     ║
║                                                                                                                                ║
║                                            BLACK NEON // 2026 EDITION                                                          ║
║                                         [Autonomous Intelligence Core]                                                         ║
║                                                                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝

    🎯 Port: ${PORT}
    🌐 UI: http://localhost:${PORT}
    
    ✅ Ready and waiting for fleet initialization...
    💡 Go to the Dashboard (http://localhost:4000) and click "Initialize Fleet"
    `);
});

module.exports = { learningData, broadcastActivity };
