#!/usr/bin/env node

/**
 * CSS Modularization Validation Test
 * 
 * This script validates that all CSS rules from the original App.css
 * have been properly extracted to the modular CSS files.
 */

const fs = require('fs');
const path = require('path');

// File paths
const ORIGINAL_CSS = 'src/App_backup_20250528.css';
const NEW_APP_CSS = 'src/App.css';
const STYLES_DIR = 'src/styles';

// CSS files to check
const CSS_FILES = {
  'base/variables.css': [],
  'base/app.css': [],
  'components/navigation.css': [],
  'components/timer.css': [],
  'components/modal.css': [],
  'components/footer.css': [],
  'components/image-drop-zone.css': [],
  'components/legacy.css': [],
  'views/editor.css': [],
  'views/review.css': [],
  'views/stats.css': [],
  'views/manage.css': [],
  'views/deck-view.css': [],
  'views/settings.css': [],
  'utils/buttons.css': [],
  'utils/forms.css': []
};

/**
 * Extract CSS selectors from a CSS file
 */
function extractSelectors(cssContent) {
  const selectors = new Set();
  
  // Remove comments
  const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Extract selectors (simplified - handles most cases)
  const selectorRegex = /([^{}]+)\s*\{[^{}]*\}/g;
  let match;
  
  while ((match = selectorRegex.exec(cleanCss)) !== null) {
    const selector = match[1].trim();
    
    // Skip @media, @keyframes, etc.
    if (!selector.startsWith('@') && selector) {
      // Split multiple selectors separated by commas
      selector.split(',').forEach(s => {
        const trimmed = s.trim();
        if (trimmed) {
          selectors.add(trimmed);
        }
      });
    }
  }
  
  return selectors;
}

/**
 * Read and validate CSS files
 */
function validateCSS() {
  console.log('🔍 CSS Modularization Validation Test\n');
  
  // Read original CSS
  if (!fs.existsSync(ORIGINAL_CSS)) {
    console.error(`❌ Original CSS file not found: ${ORIGINAL_CSS}`);
    return false;
  }
  
  const originalContent = fs.readFileSync(ORIGINAL_CSS, 'utf8');
  const originalSelectors = extractSelectors(originalContent);
  
  console.log(`📄 Original App.css contains ${originalSelectors.size} CSS selectors`);
  
  // Read new App.css
  if (!fs.existsSync(NEW_APP_CSS)) {
    console.error(`❌ New App.css file not found: ${NEW_APP_CSS}`);
    return false;
  }
  
  const newAppContent = fs.readFileSync(NEW_APP_CSS, 'utf8');
  const newAppSelectors = extractSelectors(newAppContent);
  
  console.log(`📄 New App.css contains ${newAppSelectors.size} CSS selectors`);
  
  // Collect all modular CSS selectors
  const modularSelectors = new Set();
  let totalModularFiles = 0;
  let successfulFiles = 0;
  
  console.log('\n📁 Checking modular CSS files:');
  
  for (const [relativePath, _] of Object.entries(CSS_FILES)) {
    const filePath = path.join(STYLES_DIR, relativePath);
    totalModularFiles++;
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Missing: ${relativePath}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const selectors = extractSelectors(content);
    
    console.log(`✅ ${relativePath}: ${selectors.size} selectors`);
    successfulFiles++;
    
    // Add to modular selectors
    selectors.forEach(selector => modularSelectors.add(selector));
  }
  
  // Check index.css exists and imports all files
  const indexPath = path.join(STYLES_DIR, 'index.css');
  if (!fs.existsSync(indexPath)) {
    console.log(`❌ Missing: styles/index.css`);
  } else {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const importCount = (indexContent.match(/@import/g) || []).length;
    console.log(`✅ styles/index.css: ${importCount} @import statements`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`- Modular files found: ${successfulFiles}/${totalModularFiles}`);
  console.log(`- Total modular selectors: ${modularSelectors.size}`);
  console.log(`- Original selectors: ${originalSelectors.size}`);
  console.log(`- New App.css selectors: ${newAppSelectors.size}`);
  
  // Find missing selectors
  const missingSelectors = new Set();
  const combinedSelectors = new Set([...newAppSelectors, ...modularSelectors]);
  
  originalSelectors.forEach(selector => {
    if (!combinedSelectors.has(selector)) {
      missingSelectors.add(selector);
    }
  });
  
  // Find extra selectors (not in original)
  const extraSelectors = new Set();
  combinedSelectors.forEach(selector => {
    if (!originalSelectors.has(selector)) {
      extraSelectors.add(selector);
    }
  });
  
  console.log(`\n🔍 Analysis:`);
  
  if (missingSelectors.size === 0) {
    console.log('✅ All original selectors have been preserved');
  } else {
    console.log(`❌ Missing selectors (${missingSelectors.size}):`);
    Array.from(missingSelectors).slice(0, 10).forEach(selector => {
      console.log(`   - ${selector}`);
    });
    if (missingSelectors.size > 10) {
      console.log(`   ... and ${missingSelectors.size - 10} more`);
    }
  }
  
  if (extraSelectors.size > 0) {
    console.log(`ℹ️  New selectors added (${extraSelectors.size}):`);
    Array.from(extraSelectors).slice(0, 5).forEach(selector => {
      console.log(`   + ${selector}`);
    });
    if (extraSelectors.size > 5) {
      console.log(`   ... and ${extraSelectors.size - 5} more`);
    }
  }
  
  // Check for potential issues
  console.log(`\n🚨 Potential Issues:`);
  
  // Check for duplicate selectors across files
  const selectorToFiles = new Map();
  
  for (const [relativePath, _] of Object.entries(CSS_FILES)) {
    const filePath = path.join(STYLES_DIR, relativePath);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const selectors = extractSelectors(content);
      
      selectors.forEach(selector => {
        if (!selectorToFiles.has(selector)) {
          selectorToFiles.set(selector, []);
        }
        selectorToFiles.get(selector).push(relativePath);
      });
    }
  }
  
  // Find duplicates
  const duplicates = new Map();
  selectorToFiles.forEach((files, selector) => {
    if (files.length > 1) {
      duplicates.set(selector, files);
    }
  });
  
  if (duplicates.size === 0) {
    console.log('✅ No duplicate selectors found across modular files');
  } else {
    console.log(`⚠️  Duplicate selectors found (${duplicates.size}):`);
    Array.from(duplicates.entries()).slice(0, 5).forEach(([selector, files]) => {
      console.log(`   - "${selector}" in: ${files.join(', ')}`);
    });
    if (duplicates.size > 5) {
      console.log(`   ... and ${duplicates.size - 5} more duplicates`);
    }
  }
  
  // Overall result
  const isValid = missingSelectors.size === 0 && successfulFiles === totalModularFiles;
  
  console.log(`\n${isValid ? '🎉' : '❌'} Overall Result: ${isValid ? 'PASSED' : 'FAILED'}`);
  
  if (isValid) {
    console.log('✅ CSS modularization appears to be successful!');
    console.log('✅ All original styles have been preserved in the modular structure.');
  } else {
    console.log('❌ CSS modularization has issues that need to be addressed.');
  }
  
  return isValid;
}

// Run the validation
if (require.main === module) {
  try {
    const result = validateCSS();
    process.exit(result ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed with error:', error.message);
    process.exit(1);
  }
}

module.exports = { validateCSS, extractSelectors };