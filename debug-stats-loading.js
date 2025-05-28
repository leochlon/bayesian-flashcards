// Debug script to test the exact user statistics loading issue
console.log('=== User Statistics Loading Debug Test ===');

// Test the exact URL being generated for user statistics
const API_BASE = 'http://localhost:5002/api';
const DEFAULT_USER = 'default';
const refreshKey = Date.now();

const userStatsUrl = `${API_BASE}/stats/user?user=${DEFAULT_USER}&t=${refreshKey}`;
console.log('Generated User Stats URL:', userStatsUrl);

// Test backend availability first
async function debugBackend() {
  try {
    console.log('1. Testing backend health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    console.log('Health check status:', healthResponse.status);
    console.log('Health check response:', await healthResponse.text());

    console.log('2. Testing user stats endpoint...');
    const statsResponse = await fetch(userStatsUrl);
    console.log('Stats response status:', statsResponse.status);
    console.log('Stats response headers:', Object.fromEntries(statsResponse.headers.entries()));
    
    if (statsResponse.ok) {
      console.log('✅ Backend is responding correctly');
      const blob = await statsResponse.blob();
      console.log('Image blob size:', blob.size, 'bytes');
      console.log('Image blob type:', blob.type);
      return { success: true, size: blob.size };
    } else {
      const errorText = await statsResponse.text();
      console.log('❌ Backend error response:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.log('❌ Network/connection error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test the frontend loading pattern
async function debugFrontendLoading() {
  console.log('3. Testing frontend image loading pattern...');
  
  // Simulate what FixedZoomableImage does
  const img = new Image();
  let attempts = 0;
  const maxAttempts = 4;
  
  return new Promise((resolve) => {
    function tryLoad(url, attempt) {
      attempts++;
      console.log(`Attempt ${attempt}/${maxAttempts}: Loading ${url}`);
      
      const testImg = new Image();
      
      testImg.onload = () => {
        console.log(`✅ Success on attempt ${attempt}: ${testImg.width}x${testImg.height}`);
        resolve({ success: true, attempts, dimensions: `${testImg.width}x${testImg.height}` });
      };
      
      testImg.onerror = (error) => {
        console.log(`❌ Failed attempt ${attempt}:`, error);
        
        if (attempt < maxAttempts) {
          // Add cache-busting like the real code does
          const cacheBuster = Date.now();
          const newUrl = url.includes('?') 
            ? `${url}&retry=${cacheBuster}`
            : `${url}?retry=${cacheBuster}`;
          
          setTimeout(() => {
            tryLoad(newUrl, attempt + 1);
          }, 1000);
        } else {
          console.log(`❌ All ${maxAttempts} attempts failed`);
          resolve({ success: false, attempts, error: 'Max retries exceeded' });
        }
      };
      
      testImg.src = url;
    }
    
    tryLoad(userStatsUrl, 1);
  });
}

// Run the complete diagnostic
async function runDiagnostic() {
  console.log('Starting comprehensive diagnostic...');
  
  const backendResult = await debugBackend();
  console.log('Backend test result:', backendResult);
  
  if (backendResult.success) {
    const frontendResult = await debugFrontendLoading();
    console.log('Frontend test result:', frontendResult);
    
    if (frontendResult.success) {
      console.log('🎉 DIAGNOSIS: Backend and image loading work correctly');
      console.log('🔍 LIKELY ISSUE: Frontend infinite loop in React components');
    } else {
      console.log('🔍 DIAGNOSIS: Image loading fails even with direct fetch');
      console.log('🎯 LIKELY ISSUE: Backend image generation or CORS problem');
    }
  } else {
    console.log('🔍 DIAGNOSIS: Backend is not responding or has errors');
    console.log('🎯 LIKELY ISSUE: Backend service down or database problem');
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.debugStatsLoading = runDiagnostic;
  console.log('Run window.debugStatsLoading() to start diagnostic');
} else {
  runDiagnostic();
}