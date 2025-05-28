/**
 * Test script to verify the stats functionality fixes
 */

const API = 'http://localhost:5002/api';

async function testStatsEndpoints() {
    console.log('Testing stats API endpoints...');

    try {
        // Test user stats (should work without deck)
        console.log('1. Testing user stats endpoint...');
        const userResponse = await fetch(`${API}/stats/user?user=default`);
        console.log(`User stats: ${userResponse.status} ${userResponse.statusText}`);
        
        // Test deck stats (needs a deck)
        console.log('2. Testing deck stats endpoint...');
        const deckResponse = await fetch(`${API}/stats/deck?deck=test&user=default`);
        console.log(`Deck stats: ${deckResponse.status} ${deckResponse.statusText}`);
        
        // Test session stats (needs a session)
        console.log('3. Testing session stats endpoint...');
        const sessionResponse = await fetch(`${API}/stats/session?session=1&user=default`);
        console.log(`Session stats: ${sessionResponse.status} ${sessionResponse.statusText}`);
        
        console.log('\nAll tests completed. Check the responses above.');
        
    } catch (error) {
        console.error('Error testing endpoints:', error);
    }
}

function testCacheBusting() {
    console.log('\nTesting cache-busting logic...');
    
    // Simulate the cache key generation logic from our fixed component
    const generateCacheKey = (statsType, currentDeck, selectedSession, timestamp) => {
        return `${statsType}-${statsType === 'deck' ? currentDeck || 'none' : statsType === 'session' ? selectedSession || 'none' : 'user'}-${timestamp}`;
    };
    
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 1000; // 1 second later
    
    // Test different scenarios
    const scenarios = [
        { statsType: 'user', currentDeck: null, selectedSession: null, timestamp: timestamp1 },
        { statsType: 'user', currentDeck: null, selectedSession: null, timestamp: timestamp2 },
        { statsType: 'deck', currentDeck: 'math', selectedSession: null, timestamp: timestamp1 },
        { statsType: 'deck', currentDeck: 'science', selectedSession: null, timestamp: timestamp1 },
        { statsType: 'session', currentDeck: null, selectedSession: '123', timestamp: timestamp1 }
    ];
    
    scenarios.forEach((scenario, index) => {
        const cacheKey = generateCacheKey(
            scenario.statsType, 
            scenario.currentDeck, 
            scenario.selectedSession, 
            scenario.timestamp
        );
        console.log(`Scenario ${index + 1}: ${JSON.stringify(scenario)} => Cache key: ${cacheKey}`);
    });
    
    console.log('\nCache-busting test completed. Each scenario should produce a unique cache key.');
}

// Run tests if this is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    const fetch = require('node-fetch');
    
    testStatsEndpoints().then(() => {
        testCacheBusting();
    });
} else {
    // Browser environment
    testStatsEndpoints().then(() => {
        testCacheBusting();
    });
}
