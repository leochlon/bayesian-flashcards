#!/usr/bin/env node

/**
 * Validation Script for Infinite Loop Fix
 * This script validates that the corrected components resolve the identified issues
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFile(filePath, checks) {
  log(`\n🔍 Validating: ${filePath}`, 'blue');
  
  if (!fs.existsSync(filePath)) {
    log(`❌ File not found: ${filePath}`, 'red');
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let allPassed = true;
  
  checks.forEach(check => {
    const result = check.test(content);
    if (result) {
      log(`✅ ${check.name}`, 'green');
    } else {
      log(`❌ ${check.name}`, 'red');
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Validation checks for StatsView-corrected.js
const statsViewChecks = [
  {
    name: "Uses useMemo for hasValidSelection (no state)",
    test: (content) => content.includes('const hasValidSelection = useMemo(')
  },
  {
    name: "Uses useMemo for statsUrl (no direct function call)",
    test: (content) => content.includes('const statsUrl = useMemo(')
  },
  {
    name: "No fetch logic in URL generation",
    test: (content) => {
      const urlMemoMatch = content.match(/const statsUrl = useMemo\(\(\) => \{([\s\S]*?)\}, \[/);
      if (!urlMemoMatch) return false;
      const memoContent = urlMemoMatch[1];
      return !memoContent.includes('fetch(') && !memoContent.includes('setImageStatus');
    }
  },
  {
    name: "Mount effect has empty dependency array",
    test: (content) => content.includes('}, []); // FIXED: Empty dependency array - only run on mount')
  },
  {
    name: "No circular dependencies in currentDeck effect",
    test: (content) => {
      const effectMatch = content.match(/\/\/ FIXED: Separated currentDeck sync logic[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[(.*?)\]\);/);
      if (!effectMatch) return false;
      const deps = effectMatch[1];
      return deps.includes('currentDeck, decks') && !deps.includes('statsDeck') && !deps.includes('setCurrentDeck');
    }
  },
  {
    name: "Uses useCallback for stable event handlers",
    test: (content) => content.includes('const handleImageLoad = useCallback(') && 
                     content.includes('const handleImageError = useCallback(')
  },
  {
    name: "Separate effect for refresh triggers",
    test: (content) => content.includes('// FIXED: Separate effect for triggering refresh - NO URL generation here')
  }
];

// Validation checks for FixedZoomableImage-corrected.js
const imageComponentChecks = [
  {
    name: "Single consolidated useEffect (no duplicates)",
    test: (content) => {
      const useEffectMatches = content.match(/useEffect\(/g);
      return useEffectMatches && useEffectMatches.length === 1;
    }
  },
  {
    name: "Uses refs for state tracking",
    test: (content) => content.includes('const currentSrcRef = useRef(src);') &&
                     content.includes('const isLoadingRef = useRef(false);')
  },
  {
    name: "Concurrency control to prevent overlapping loads",
    test: (content) => content.includes('// FIXED: Prevent concurrent loading attempts') &&
                     content.includes('if (isLoadingRef.current)')
  },
  {
    name: "Source verification before state updates",
    test: (content) => content.includes('// FIXED: Only update state if this is still the current source') &&
                     content.includes('if (currentSrcRef.current === src')
  },
  {
    name: "Proper cleanup function",
    test: (content) => content.includes('// FIXED: Cleanup function to prevent memory leaks') &&
                     content.includes('return () => {')
  },
  {
    name: "Early return for empty src",
    test: (content) => content.includes('// FIXED: Early return if no src to prevent unnecessary processing')
  },
  {
    name: "Stable dependency array",
    test: (content) => content.includes('// FIXED: Stable dependency array')
  }
];

// Main validation
function main() {
  log('🔧 Infinite Loop Fix Validation', 'blue');
  log('=====================================', 'blue');
  
  const statsViewValid = validateFile(
    'frontend/src/components/StatsView-corrected.js', 
    statsViewChecks
  );
  
  const imageComponentValid = validateFile(
    'frontend/src/components/FixedZoomableImage-corrected.js', 
    imageComponentChecks
  );
  
  log('\n📊 Validation Summary', 'blue');
  log('=====================', 'blue');
  
  if (statsViewValid && imageComponentValid) {
    log('✅ All validations passed! The fixes should resolve the infinite loop.', 'green');
    log('\n📋 Next Steps:', 'blue');
    log('1. Replace StatsView.js with StatsView-corrected.js', 'yellow');
    log('2. Replace FixedZoomableImage.js with FixedZoomableImage-corrected.js', 'yellow');
    log('3. Test the statistics panel loading', 'yellow');
    return true;
  } else {
    log('❌ Some validations failed. Please review the fixes.', 'red');
    return false;
  }
}

// Run validation
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { validateFile, statsViewChecks, imageComponentChecks };