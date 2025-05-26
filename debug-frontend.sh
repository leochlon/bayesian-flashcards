#!/bin/bash

echo "=== Frontend Debug Script ==="
echo "Timestamp: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking frontend build directory...${NC}"
cd frontend

if [ -d "build" ]; then
    echo -e "${GREEN}✓ Build directory exists${NC}"
    echo "Contents:"
    ls -la build/
    
    # Check critical files
    if [ -f "build/index.html" ]; then
        echo -e "${GREEN}✓ index.html exists${NC}"
        
        # Check if index.html has proper content
        if grep -q "root" build/index.html; then
            echo -e "${GREEN}✓ index.html contains root div${NC}"
        else
            echo -e "${RED}✗ index.html missing root div${NC}"
        fi
        
        # Check for JavaScript files
        if [ -d "build/static/js" ] && [ "$(ls -A build/static/js)" ]; then
            echo -e "${GREEN}✓ JavaScript files present${NC}"
            ls -la build/static/js/
        else
            echo -e "${RED}✗ JavaScript files missing${NC}"
        fi
        
        # Check for CSS files
        if [ -d "build/static/css" ] && [ "$(ls -A build/static/css)" ]; then
            echo -e "${GREEN}✓ CSS files present${NC}"
            ls -la build/static/css/
        else
            echo -e "${RED}✗ CSS files missing${NC}"
        fi
        
    else
        echo -e "${RED}✗ index.html missing${NC}"
    fi
else
    echo -e "${RED}✗ Build directory missing${NC}"
    echo "Attempting to build frontend..."
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✓ node_modules exists${NC}"
    else
        echo -e "${YELLOW}⚠ node_modules missing, installing...${NC}"
        npm install
    fi
    
    echo "Building frontend..."
    npm run build
fi

echo ""
echo -e "${YELLOW}2. Checking package.json and dependencies...${NC}"

if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json exists${NC}"
    
    # Check for required dependencies
    echo "Key dependencies:"
    grep -A 10 '"dependencies"' package.json | grep -E "(react|axios|react-quill)"
    
    # Check build script
    echo "Build script:"
    grep -A 5 '"scripts"' package.json | grep build
    
else
    echo -e "${RED}✗ package.json missing${NC}"
fi

echo ""
echo -e "${YELLOW}3. Checking for build errors...${NC}"

# Try to build and capture any errors
echo "Attempting clean build..."
rm -rf build/
npm run build 2>&1 | tee build.log

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build completed successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    echo "Build errors:"
    cat build.log | grep -i error | tail -10
fi

echo ""
echo -e "${YELLOW}4. Checking source files...${NC}"

if [ -f "src/App.js" ]; then
    echo -e "${GREEN}✓ App.js exists${NC}"
    
    # Check for common issues
    if grep -q "window.__TAURI__" src/App.js; then
        echo -e "${GREEN}✓ Tauri integration present${NC}"
    else
        echo -e "${YELLOW}⚠ Tauri integration might be missing${NC}"
    fi
    
    # Check API base URL
    echo "API configuration:"
    grep -n "API_BASE\|localhost" src/App.js | head -5
    
else
    echo -e "${RED}✗ App.js missing${NC}"
fi

if [ -f "src/index.js" ]; then
    echo -e "${GREEN}✓ index.js exists${NC}"
else
    echo -e "${RED}✗ index.js missing${NC}"
fi

echo ""
echo -e "${YELLOW}5. Testing development server (if possible)...${NC}"

# Check if we can start the dev server briefly
echo "Testing if dev server can start..."
timeout 10s npm start > dev-server.log 2>&1 &
DEV_PID=$!
sleep 5

if kill -0 $DEV_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Development server started successfully${NC}"
    kill $DEV_PID 2>/dev/null
else
    echo -e "${RED}✗ Development server failed to start${NC}"
    echo "Dev server errors:"
    cat dev-server.log | tail -10
fi

# Clean up
rm -f dev-server.log build.log

echo ""
echo -e "${GREEN}=== Frontend Debug Complete ===${NC}"
cd ..