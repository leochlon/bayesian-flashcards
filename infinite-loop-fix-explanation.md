# Infinite Loop and Image Loading Fix - Complete Solution

## Root Cause Analysis

After comprehensive analysis, I identified **2 primary sources** causing the infinite loop and image loading failure:

### 1. **Direct invocation of getStatsUrl() on every render** (Priority 1)
- **Location**: [`StatsView.js:145`](frontend/src/components/StatsView.js:145)
- **Issue**: `const statsUrl = getStatsUrl();` called directly in render function
- **Impact**: Bypasses React optimization, triggers fetch on every component update
- **Loop pattern**: Component renders → getStatsUrl() called → fetch triggers → state update → re-render → repeat

### 2. **Duplicate useEffect handlers in FixedZoomableImage** (Priority 2)  
- **Location**: [`FixedZoomableImage.js:18-26`](frontend/src/components/FixedZoomableImage.js:18) and [`lines 28-41`](frontend/src/components/FixedZoomableImage.js:28)
- **Issue**: Two separate useEffect blocks both reset state when src changes
- **Impact**: State conflicts between loading attempts and retry logic
- **Loop pattern**: Src change → double state reset → interference between loading states → retry loops

## Fixed Solution

### StatsView Component Fixes

#### **Key Change 1: Memoized URL Generation**
```javascript
// BEFORE (Problematic):
const getStatsUrl = useCallback(() => {
  // Fetch logic embedded here - called on every render
}, [dependencies]);
const statsUrl = getStatsUrl(); // ❌ Direct invocation

// AFTER (Fixed):
const statsUrl = useMemo(() => {
  // Pure URL generation only - no side effects
  if (!localStatsType || !hasValidSelection) return null;
  // ... generate URL
  return url;
}, [refreshKey, localStatsType, statsDeck, selectedSession, decks, hasValidSelection]);
```

#### **Key Change 2: Separated State Validation**
```javascript
// BEFORE (Problematic):
const validateSelections = () => {
  // Called synchronously in useEffect, causing loops
};

// AFTER (Fixed):
const hasValidSelection = useMemo(() => {
  // Pure computation, no side effects
  if (localStatsType === 'user') return true;
  // ... validation logic
  return isValid;
}, [localStatsType, statsDeck, decks, selectedSession]);
```

#### **Key Change 3: Controlled Refresh Trigger**
```javascript
// BEFORE (Problematic):
useEffect(() => {
  const isValid = validateSelections(); // ❌ Side effects in validation
  if (isValid) {
    setRefreshKey(rk => rk + 1);
    fetch(url); // ❌ Fetch in URL generation
  }
}, [localStatsType, statsDeck, selectedSession]);

// AFTER (Fixed):
useEffect(() => {
  if (hasValidSelection && isMounted) {
    setRefreshKey(rk => rk + 1); // ✅ Only trigger refresh
    setImageStatus({loading: true, error: null, success: false});
  }
}, [localStatsType, statsDeck, selectedSession, hasValidSelection, isMounted]);
```

### FixedZoomableImage Component Fixes

#### **Key Change 1: Single useEffect for Image Loading**
```javascript
// BEFORE (Problematic):
useEffect(() => {
  // Reset state when source changes
}, [src]);

useEffect(() => {
  // Also reset state when source changes - CONFLICT
}, [src]);

// AFTER (Fixed):
useEffect(() => {
  // Single comprehensive effect handling all image loading logic
  if (!src) {
    // Reset states
    return;
  }
  
  const loadImage = (srcToLoad, attempt = 0) => {
    // Consolidated loading logic with retry
  };
  
  loadImage(src);
  
  return () => {
    // Proper cleanup
  };
}, [src, onLoad, onError, maxRetries, retryDelay]);
```

#### **Key Change 2: Refs to Prevent State Loops**
```javascript
// BEFORE (Problematic):
const [imgSrc, setImgSrc] = useState(src); // ❌ State changes trigger loops

// AFTER (Fixed):
const currentSrcRef = useRef(src); // ✅ Ref doesn't trigger re-renders
const isLoadingRef = useRef(false); // ✅ Prevent concurrent loads
```

## Why This Resolves the Issues

### **Infinite Loop Resolution:**
1. **URL generation is memoized** - only recalculates when dependencies actually change
2. **No fetch calls in render cycle** - image loading handled by FixedZoomableImage component
3. **Single source of truth for state** - eliminates conflicting useEffect handlers
4. **Controlled refresh triggers** - state changes only happen when intended

### **Image Loading Resolution:**
1. **Consolidated loading logic** - single useEffect prevents state conflicts  
2. **Proper retry handling** - uses refs to avoid triggering new render cycles
3. **Cache-busting for failures** - ensures fresh attempts without state loops
4. **Concurrent load prevention** - isLoadingRef prevents multiple simultaneous attempts

## Implementation Steps

1. **Replace StatsView.js** with [`StatsView-fixed.js`](frontend/src/components/StatsView-fixed.js)
2. **Replace FixedZoomableImage.js** with [`FixedZoomableImage-fixed.js`](frontend/src/components/FixedZoomableImage-fixed.js)
3. **Test the user statistics tab** - should load immediately without infinite loop
4. **Verify other tabs work** - deck and session statistics should be unaffected

## Expected Behavior After Fix

### **User Statistics Tab:**
- ✅ Loads immediately upon selection
- ✅ Shows precomputed user statistics image
- ✅ No infinite loading loops
- ✅ Proper error handling if image fails

### **Performance Improvements:**
- ✅ Reduced unnecessary re-renders
- ✅ Controlled API calls (only when needed)
- ✅ Stable component state management
- ✅ Proper React optimization patterns

This solution addresses both the infinite loop and image loading failure by implementing proper React patterns and eliminating the circular dependencies that were causing the issue.