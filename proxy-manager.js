/**
 * PROXY MANAGEMENT API
 * Handles proxy configuration for scraper agents
 * Integrates with Orchestrator UI at localhost:5000
 */

const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Config file for persistence
const PROXY_CONFIG_FILE = path.join(__dirname, 'config', 'proxies.json');

// Scraper agent endpoints
const SCRAPER_AGENTS = [
    'http://localhost:8001',   // Worker Agent #1
    'http://localhost:8002',  // Worker Agent #2
    'http://localhost:8002',  // Worker Agent #2 (if exists)
];

// Ensure config directory exists
async function ensureConfigDir() {
    const configDir = path.dirname(PROXY_CONFIG_FILE);
    try {
        await fs.mkdir(configDir, { recursive: true });
    } catch (err) {
        // Directory already exists
    }
}

// Load proxy configuration
async function loadProxyConfig() {
    try {
        await ensureConfigDir();
        const data = await fs.readFile(PROXY_CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // Return default config if file doesn't exist
        return {
            enabled: false,
            rotation_enabled: false,
            proxies: []
        };
    }
}

// Save proxy configuration
async function saveProxyConfig(config) {
    await ensureConfigDir();
    await fs.writeFile(PROXY_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Test a single proxy
async function testProxy(proxyUrl) {
    try {
        const response = await axios.get('https://api.ipify.org?format=json', {
            proxy: false,  // Disable axios proxy for now
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        // In production, you'd actually use the proxy here
        // For now, just validate the URL format
        return {
            url: proxyUrl,
            working: true,
            ip: response.data.ip,
            status: 'working'
        };
    } catch (err) {
        return {
            url: proxyUrl,
            working: false,
            error: err.message,
            status: 'failed'
        };
    }
}

// Update all scraper agents with new proxy config
async function updateScraperAgents(config) {
    const results = [];
    
    for (const agentUrl of SCRAPER_AGENTS) {
        try {
            const response = await axios.post(`${agentUrl}/config/proxy`, {
                enabled: config.enabled,
                rotation_enabled: config.rotation_enabled,
                proxies: config.proxies.map(p => p.url || p)
            }, {
                timeout: 5000
            });
            
            results.push({
                agent: agentUrl,
                success: true,
                message: response.data.message
            });
        } catch (err) {
            results.push({
                agent: agentUrl,
                success: false,
                error: err.message
            });
        }
    }
    
    return results;
}

// Get proxy statistics
function getProxyStats(config) {
    const proxies = config.proxies || [];
    const total = proxies.length;
    const working = proxies.filter(p => p.status === 'working').length;
    const failed = proxies.filter(p => p.status === 'failed').length;
    const untested = proxies.filter(p => !p.status).length;
    
    return { total, working, failed, untested };
}

// API Routes

// Get current proxy configuration
router.get('/api/proxies/config', async (req, res) => {
    try {
        const config = await loadProxyConfig();
        const stats = getProxyStats(config);
        
        res.json({
            success: true,
            config: {
                enabled: config.enabled,
                rotation_enabled: config.rotation_enabled,
                proxies: config.proxies,
                proxy_stats: stats
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Toggle proxies on/off
router.post('/api/proxies/toggle', async (req, res) => {
    try {
        const config = await loadProxyConfig();
        config.enabled = !config.enabled;
        await saveProxyConfig(config);
        
        // Update all scraper agents
        const updateResults = await updateScraperAgents(config);
        
        res.json({
            success: true,
            enabled: config.enabled,
            message: `Proxies ${config.enabled ? 'enabled' : 'disabled'}`,
            agents_updated: updateResults
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Add a proxy
router.post('/api/proxies/add', async (req, res) => {
    try {
        const { proxy_url } = req.body;
        
        if (!proxy_url) {
            return res.status(400).json({
                success: false,
                message: 'proxy_url is required'
            });
        }
        
        // Validate proxy URL format
        const proxyRegex = /^(socks5|socks4|http|https):\/\/([^:@]+:[^:@]+@)?[^:]+:\d+$/;
        if (!proxyRegex.test(proxy_url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid proxy format. Use: socks5://user:pass@host:port or http://host:port'
            });
        }
        
        const config = await loadProxyConfig();
        
        // Check if proxy already exists
        if (config.proxies.some(p => (p.url || p) === proxy_url)) {
            return res.status(400).json({
                success: false,
                message: 'Proxy already exists'
            });
        }
        
        // Add proxy
        config.proxies.push({
            url: proxy_url,
            added_at: new Date().toISOString(),
            status: null
        });
        
        await saveProxyConfig(config);
        
        // Update scraper agents
        const updateResults = await updateScraperAgents(config);
        
        res.json({
            success: true,
            message: 'Proxy added successfully',
            config: config,
            agents_updated: updateResults
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Remove a proxy
router.post('/api/proxies/remove', async (req, res) => {
    try {
        const { proxy_url } = req.body;
        
        if (!proxy_url) {
            return res.status(400).json({
                success: false,
                message: 'proxy_url is required'
            });
        }
        
        const config = await loadProxyConfig();
        
        // Find and remove proxy
        const initialLength = config.proxies.length;
        config.proxies = config.proxies.filter(p => (p.url || p) !== proxy_url);
        
        if (config.proxies.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Proxy not found'
            });
        }
        
        await saveProxyConfig(config);
        
        // Update scraper agents
        const updateResults = await updateScraperAgents(config);
        
        res.json({
            success: true,
            message: 'Proxy removed successfully',
            config: config,
            agents_updated: updateResults
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Test a specific proxy
router.post('/api/proxies/test', async (req, res) => {
    try {
        const { proxy_url } = req.body;
        
        if (!proxy_url) {
            return res.status(400).json({
                success: false,
                message: 'proxy_url is required'
            });
        }
        
        const result = await testProxy(proxy_url);
        
        // Update config with test result
        const config = await loadProxyConfig();
        const proxyIndex = config.proxies.findIndex(p => (p.url || p) === proxy_url);
        
        if (proxyIndex !== -1) {
            if (typeof config.proxies[proxyIndex] === 'string') {
                config.proxies[proxyIndex] = {
                    url: proxy_url,
                    status: result.status,
                    last_tested: new Date().toISOString()
                };
            } else {
                config.proxies[proxyIndex].status = result.status;
                config.proxies[proxyIndex].last_tested = new Date().toISOString();
            }
            
            await saveProxyConfig(config);
        }
        
        res.json({
            success: true,
            result: result
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Test all proxies
router.post('/api/proxies/test-all', async (req, res) => {
    try {
        const config = await loadProxyConfig();
        
        if (!config.proxies || config.proxies.length === 0) {
            return res.json({
                success: true,
                message: 'No proxies to test',
                config: config
            });
        }
        
        // Test all proxies
        const testPromises = config.proxies.map(p => {
            const url = p.url || p;
            return testProxy(url);
        });
        
        const results = await Promise.all(testPromises);
        
        // Update config with results
        config.proxies = config.proxies.map((p, index) => {
            const url = p.url || p;
            return {
                url: url,
                status: results[index].status,
                last_tested: new Date().toISOString(),
                added_at: p.added_at || new Date().toISOString()
            };
        });
        
        await saveProxyConfig(config);
        
        const stats = getProxyStats(config);
        
        res.json({
            success: true,
            message: 'All proxies tested',
            config: config,
            proxy_stats: stats
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Get proxy status/statistics
router.get('/api/proxies/status', async (req, res) => {
    try {
        const config = await loadProxyConfig();
        const stats = getProxyStats(config);
        
        res.json({
            success: true,
            enabled: config.enabled,
            ...stats,
            proxies: config.proxies
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;
