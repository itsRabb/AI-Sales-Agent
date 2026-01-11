/**
 * URL ASSIGNMENT & QUEUE SYSTEM
 * 
 * Distributes discovered URLs between RiPi #1 and RiPi #2
 * Prevents re-scraping and manages scraping state
 */

const supabaseDb = require('./supabase-db.js');

// In-memory URL queue (could be moved to Supabase for persistence)
const urlQueue = {
    ripi1: [],  // URLs assigned to RiPi #1
    ripi2: [],  // URLs assigned to RiPi #2
    completed: new Set(),  // URLs already scraped
    inProgress: new Map()  // URL -> {ripi, startedAt}
};

/**
 * Assign discovered URLs to RiPis
 * Strategy: Alternate assignment for load balancing
 */
function assignURLsToRiPis(directories) {
    console.log(`\n📋 Assigning ${directories.length} URLs to RiPis...`);
    
    const assignments = {
        ripi1: [],
        ripi2: []
    };
    
    // Filter out already completed URLs
    const newDirectories = directories.filter(d => 
        !urlQueue.completed.has(d.url) && 
        !urlQueue.inProgress.has(d.url)
    );
    
    console.log(`  ${newDirectories.length} new URLs (${directories.length - newDirectories.length} already processed)`);
    
    // Alternate assignment
    newDirectories.forEach((directory, index) => {
        if (index % 2 === 0) {
            assignments.ripi1.push(directory);
        } else {
            assignments.ripi2.push(directory);
        }
    });
    
    // Add to queues
    urlQueue.ripi1.push(...assignments.ripi1);
    urlQueue.ripi2.push(...assignments.ripi2);
    
    console.log(`✅ Assigned: RiPi #1 (${assignments.ripi1.length}), RiPi #2 (${assignments.ripi2.length})`);
    
    return assignments;
}

/**
 * Get next URL for a specific RiPi
 */
function getNextURL(ripiId) {
    const queue = ripiId === 'ripi1' ? urlQueue.ripi1 : urlQueue.ripi2;
    
    if (queue.length === 0) {
        return null;
    }
    
    const directory = queue.shift();
    
    // Mark as in progress
    urlQueue.inProgress.set(directory.url, {
        ripi: ripiId,
        startedAt: Date.now()
    });
    
    console.log(`📤 Assigned to ${ripiId}: ${directory.url}`);
    
    return directory;
}

/**
 * Mark URL as completed
 */
function markURLComplete(url, ripiId, stats = {}) {
    urlQueue.completed.add(url);
    urlQueue.inProgress.delete(url);
    
    console.log(`✅ ${ripiId} completed: ${url} (${stats.agentsSaved || 0} agents saved)`);
    
    return {
        completed: urlQueue.completed.size,
        remaining: urlQueue.ripi1.length + urlQueue.ripi2.length,
        inProgress: urlQueue.inProgress.size
    };
}

/**
 * Mark URL as failed
 */
function markURLFailed(url, ripiId, reason) {
    urlQueue.inProgress.delete(url);
    
    // Re-add to queue for retry (max 3 attempts)
    const directory = { url, retryCount: (urlQueue.retryCount || 0) + 1 };
    
    if (directory.retryCount < 3) {
        const queue = ripiId === 'ripi1' ? urlQueue.ripi1 : urlQueue.ripi2;
        queue.push(directory);
        console.log(`⚠️ ${ripiId} failed: ${url} - ${reason} (retry ${directory.retryCount}/3)`);
    } else {
        urlQueue.completed.add(url);
        console.log(`❌ ${ripiId} gave up on: ${url} - ${reason} (max retries)`);
    }
}

/**
 * Get queue status
 */
function getQueueStatus() {
    return {
        ripi1: {
            pending: urlQueue.ripi1.length,
            currentURL: Array.from(urlQueue.inProgress.entries())
                .find(([url, info]) => info.ripi === 'ripi1')?.[0] || null
        },
        ripi2: {
            pending: urlQueue.ripi2.length,
            currentURL: Array.from(urlQueue.inProgress.entries())
                .find(([url, info]) => info.ripi === 'ripi2')?.[0] || null
        },
        completed: urlQueue.completed.size,
        totalInProgress: urlQueue.inProgress.size
    };
}

/**
 * Clean up stale in-progress URLs (stuck for > 30 minutes)
 */
function cleanupStaleURLs() {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    
    let cleaned = 0;
    for (const [url, info] of urlQueue.inProgress.entries()) {
        if (now - info.startedAt > staleThreshold) {
            markURLFailed(url, info.ripi, 'Timeout - no response for 30min');
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} stale URLs`);
    }
}

// Clean up stale URLs every 10 minutes
setInterval(cleanupStaleURLs, 10 * 60 * 1000);

module.exports = {
    assignURLsToRiPis,
    getNextURL,
    markURLComplete,
    markURLFailed,
    getQueueStatus,
    urlQueue
};
