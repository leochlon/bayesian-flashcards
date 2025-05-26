const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function bundlePython() {
    console.log('Bundling Python distribution...');
    
    const srcDir = path.join(__dirname, '..', 'backend');
    const distDir = path.join(__dirname, '..', 'src-tauri', 'python-dist');
    
    // Clean previous bundle
    if (fs.existsSync(distDir)) {
        fs.removeSync(distDir);
    }
    
    fs.ensureDirSync(distDir);
    
    try {
        // Create a virtual environment
        console.log('Creating virtual environment...');
        execSync('python -m venv python-venv', { cwd: distDir });
        
        const venvPath = path.join(distDir, 'python-venv');
        const pythonExe = process.platform === 'win32' 
            ? path.join(venvPath, 'Scripts', 'python.exe')
            : path.join(venvPath, 'bin', 'python');
        
        // Install dependencies
        console.log('Installing Python dependencies...');
        execSync(`"${pythonExe}" -m pip install -r "${path.join(srcDir, 'requirements.txt')}"`, {
            stdio: 'inherit'
        });
        
        // Copy backend files
        console.log('Copying backend files...');
        fs.copySync(srcDir, path.join(distDir, 'backend'));
        
        // Create a wrapper script
        const wrapperScript = process.platform === 'win32' ? `
@echo off
cd /d "%~dp0"
set PYTHONPATH=%~dp0\\backend
python-venv\\Scripts\\python.exe backend\\app.py %*
` : `#!/bin/bash
cd "$(dirname "$0")"
export PYTHONPATH="$(pwd)/backend"
./python-venv/bin/python backend/app.py "$@"
`;
        
        const wrapperName = process.platform === 'win32' ? 'python-backend.bat' : 'python-backend';
        fs.writeFileSync(path.join(distDir, wrapperName), wrapperScript);
        
        if (process.platform !== 'win32') {
            execSync(`chmod +x "${path.join(distDir, wrapperName)}"`);
        }
        
        console.log('Python bundle created successfully!');
    } catch (error) {
        console.error('Error bundling Python:', error);
        process.exit(1);
    }
}

bundlePython();
