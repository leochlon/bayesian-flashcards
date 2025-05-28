// Validation logs to confirm infinite loop diagnosis
// Add these console logs to validate the issue patterns

console.log('=== VALIDATION LOGS FOR INFINITE LOOP DIAGNOSIS ===');

// Log 1: StatsView render cycle detection
const statsViewRenderLog = `
// Add to StatsView.js line 17 (after initial console.logs):
console.log('🔄 StatsView RENDER CYCLE:', {
  renderCount: ++window.statsViewRenderCount || (window.statsViewRenderCount = 1),
  timestamp: Date.now(),
  statsType: localStatsType,
  refreshKey: refreshKey,
  hasValidSelection: hasValidSelection
});
`;

// Log 2: getStatsUrl invocation tracking  
const getStatsUrlLog = `
// Add to StatsView.js line 111 (start of getStatsUrl):
console.log('🎯 getStatsUrl INVOKED:', {
  invocationCount: ++window.getStatsUrlCount || (window.getStatsUrlCount = 1),
  refreshKey: refreshKey,
  hasTriedFetch: hasTriedFetch,
  stackTrace: new Error().stack.split('\\n').slice(0, 5)
});
`;

// Log 3: Image component state changes
const imageStateLog = `
// Add to FixedZoomableImage.js line 4 (after props log):
console.log('🖼️ FixedZoomableImage STATE:', {
  renderCount: ++window.imageRenderCount || (window.imageRenderCount = 1),
  src: src,
  imageLoaded: imageLoaded,
  imageError: imageError,
  retryCount: retryCount
});
`;

console.log('Add these validation logs:');
console.log('1. StatsView render tracking:', statsViewRenderLog);
console.log('2. getStatsUrl invocation tracking:', getStatsUrlLog);
console.log('3. Image component state tracking:', imageStateLog);

console.log('\nExpected patterns if diagnosis is correct:');
console.log('- statsViewRenderCount should increment rapidly (> 10 in first second)');
console.log('- getStatsUrlCount should match or exceed render count');
console.log('- Multiple useEffect triggers visible in stack traces');
console.log('- imageRenderCount should show frequent re-renders');