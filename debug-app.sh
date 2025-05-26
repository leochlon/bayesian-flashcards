#!/bin/bash

echo "=== Bayesian Flashcards Debug Script ==="
echo "Timestamp: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking project structure...${NC}"
echo "Current directory: $(pwd)"
echo "Contents:"
ls -la

echo ""
echo -e "${YELLOW}2. Checking frontend build...${NC}"
if [ -d "frontend/build" ]; then
    echo -e "${GREEN}✓ Frontend build directory exists${NC}"
    echo "Build contents:"
    ls -la frontend/build/
    
    if [ -f "frontend/build/index.html" ]; then
        echo -e "${GREEN}✓ index.html exists${NC}"
        echo "Index.html content preview:"
        head -20 frontend/build/index.html
    else
        echo -e "${RED}✗ index.html missing${NC}"
    fi
else
    echo -e "${RED}✗ Frontend build directory missing${NC}"
fi

echo ""
echo -e "${YELLOW}3. Checking Tauri configuration...${NC}"
if [ -f "src-tauri/tauri.conf.json" ]; then
    echo -e "${GREEN}✓ Tauri config exists${NC}"
    echo "frontendDist setting:"
    grep -A 1 -B 1 "frontendDist" src-tauri/tauri.conf.json
else
    echo -e "${RED}✗ Tauri config missing${NC}"
fi

echo ""
echo -e "${YELLOW}4. Checking backend bundle...${NC}"
if [ -d "src-tauri/python-dist/backend" ]; then
    echo -e "${GREEN}✓ Backend bundle exists${NC}"
    ls -la src-tauri/python-dist/backend/
    
    if [ -f "src-tauri/python-dist/backend/app.py" ]; then
        echo -e "${GREEN}✓ Backend app.py exists${NC}"
    else
        echo -e "${RED}✗ Backend app.py missing${NC}"
    fi
else
    echo -e "${RED}✗ Backend bundle missing${NC}"
fi

echo ""
echo -e "${YELLOW}5. Checking release build...${NC}"
if [ -d "src-tauri/target/release" ]; then
    echo -e "${GREEN}✓ Release build exists${NC}"
    
    # Check if the app bundle exists
    if [ -d "src-tauri/target/release/bundle/macos" ]; then
        echo -e "${GREEN}✓ macOS bundle exists${NC}"
        find src-tauri/target/release/bundle/macos -name "*.app" -type d | head -5
    else
        echo -e "${RED}✗ macOS bundle missing${NC}"
    fi
    
    # Check if resources are properly bundled
    if [ -d "src-tauri/target/release/bundle/macos/Bayesian Flashcards.app/Contents/Resources" ]; then
        echo -e "${GREEN}✓ App resources directory exists${NC}"
        echo "Resources contents:"
        ls -la "src-tauri/target/release/bundle/macos/Bayesian Flashcards.app/Contents/Resources/"
    else
        echo -e "${RED}✗ App resources missing${NC}"
    fi
else
    echo -e "${RED}✗ Release build missing${NC}"
fi

echo ""
echo -e "${YELLOW}6. Testing backend connectivity (if available)...${NC}"
if pgrep -f "python.*app.py" > /dev/null; then
    echo -e "${GREEN}✓ Python backend process running${NC}"
    echo "Testing health endpoint..."
    if curl -s http://localhost:5002/api/health > /dev/null; then
        echo -e "${GREEN}✓ Backend health check passed${NC}"
        curl -s http://localhost:5002/api/health | jq . 2>/dev/null || curl -s http://localhost:5002/api/health
    else
        echo -e "${RED}✗ Backend health check failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No Python backend process detected${NC}"
fi

echo ""
echo -e "${YELLOW}7. Checking for common issues...${NC}"

# Check for Node.js and npm
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js available: $(node --version)${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓ npm available: $(npm --version)${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
fi

# Check for Python
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✓ Python3 available: $(python3 --version)${NC}"
else
    echo -e "${RED}✗ Python3 not found${NC}"
fi

# Check for Rust/Cargo
if command -v cargo &> /dev/null; then
    echo -e "${GREEN}✓ Cargo available: $(cargo --version)${NC}"
else
    echo -e "${RED}✗ Cargo not found${NC}"
fi

echo ""
echo -e "${YELLOW}8. Checking console logs for errors...${NC}"

# Check if there are any build logs
if [ -f "src-tauri/target/release/build.log" ]; then
    echo "Recent build log entries:"
    tail -20 "src-tauri/target/release/build.log"
fi

echo ""
echo -e "${GREEN}=== Debug Complete ===${NC}"
echo "Run this script with: chmod +x debug-app.sh && ./debug-app.sh"