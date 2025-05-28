// Test script to verify easy mode toggle functionality
// This script simulates the user flow to test the easy mode toggle

const axios = require('axios');

const API_BASE = "http://localhost:5002";
const API = `${API_BASE}/api`;
const DEFAULT_USER = "default";

async function testEasyModeToggle() {
    console.log("=== Testing Easy Mode Toggle Functionality ===");
    
    try {
        // 1. Get current settings to see initial easy mode state
        console.log("\n1. Getting current user settings...");
        const settingsResponse = await axios.get(`${API}/users/${DEFAULT_USER}/settings`);
        console.log("Current settings:", settingsResponse.data);
        const initialEasyMode = settingsResponse.data.settings.easy_mode;
        console.log("Initial easy mode state:", initialEasyMode);
        
        // 2. Toggle the easy mode setting
        console.log("\n2. Toggling easy mode...");
        const newEasyMode = !initialEasyMode;
        console.log("Setting easy mode to:", newEasyMode);
        
        const updateResponse = await axios.put(`${API}/users/${DEFAULT_USER}/settings`, {
            easy_mode: newEasyMode
        });
        
        console.log("Update response:", updateResponse.data);
        
        if (updateResponse.data.success) {
            console.log("✅ Easy mode toggle successful via API");
            
            // 3. Verify the setting was actually changed
            console.log("\n3. Verifying the change...");
            const verifyResponse = await axios.get(`${API}/users/${DEFAULT_USER}/settings`);
            const newState = verifyResponse.data.settings.easy_mode;
            console.log("New easy mode state:", newState);
            
            if (newState === newEasyMode) {
                console.log("✅ Easy mode setting verified - API is working correctly");
                
                // 4. Toggle it back to original state
                console.log("\n4. Restoring original state...");
                await axios.put(`${API}/users/${DEFAULT_USER}/settings`, {
                    easy_mode: initialEasyMode
                });
                console.log("✅ Restored to original state");
                
                console.log("\n=== API Test Result: SUCCESS ===");
                console.log("The backend API is working correctly for easy mode toggle.");
                console.log("Any frontend issues are likely in the JavaScript code or HTTP request handling.");
                
            } else {
                console.log("❌ Easy mode setting not properly saved");
            }
        } else {
            console.log("❌ Easy mode toggle failed:", updateResponse.data);
        }
        
    } catch (error) {
        console.log("❌ Error testing easy mode toggle:", error.message);
        if (error.response) {
            console.log("Response status:", error.response.status);
            console.log("Response data:", error.response.data);
        }
    }
}

// Run the test
testEasyModeToggle();
