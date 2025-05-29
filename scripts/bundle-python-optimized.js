const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function bundlePythonOptimized() {
    console.log('Bundling optimized Python distribution...');
    
    const srcDir = path.join(__dirname, '..', 'backend');
    const distDir = path.join(__dirname, '..', 'src-tauri', 'python-dist');
    
    // Clean previous bundle
    if (fs.existsSync(distDir)) {
        fs.removeSync(distDir);
    }
    
    // Also clean python-portable since we'll create a unified environment
    const portableDir = path.join(__dirname, '..', 'src-tauri', 'python-portable');
    if (fs.existsSync(portableDir)) {
        fs.removeSync(portableDir);
    }
    
    fs.ensureDirSync(distDir);
    
    try {
        // Create a single virtual environment
        console.log('Creating virtual environment...');
        execSync('python -m venv python-venv', { cwd: distDir });
        
        const venvPath = path.join(distDir, 'python-venv');
        const pythonExe = process.platform === 'win32' 
            ? path.join(venvPath, 'Scripts', 'python.exe')
            : path.join(venvPath, 'bin', 'python');
        
        // Install minimal dependencies
        console.log('Installing minimal Python dependencies...');
        execSync(`"${pythonExe}" -m pip install -r "${path.join(srcDir, 'requirements-minimal.txt')}"`, {
            stdio: 'inherit'
        });
        
        // Copy backend files but exclude development venv and other unnecessary files
        console.log('Copying backend files (excluding dev venv)...');
        const backendDestDir = path.join(distDir, 'backend');
        fs.ensureDirSync(backendDestDir);
        
        // Copy files and folders selectively
        const itemsToCopy = [
            'app.py',
            'config.py', 
            'db_init.py',
            'models.py',
            'requirements.txt',
            'requirements-minimal.txt',
            'run.py',
            'bayesian',
            'routes',
            'services',
            'utils',
            'migrations',
            'flashcards.db' // Include the cleaned database
        ];
        
        for (const item of itemsToCopy) {
            const srcPath = path.join(srcDir, item);
            const destPath = path.join(backendDestDir, item);
            
            if (fs.existsSync(srcPath)) {
                fs.copySync(srcPath, destPath);
                console.log(`Copied ${item}`);
            } else {
                console.log(`Skipping ${item} (not found)`);
            }
        }
        
        // Create a seed_data directory for initial database content
        console.log('Setting up seed database...');
        const seedDir = path.join(backendDestDir, 'seed_data');
        fs.ensureDirSync(seedDir);
        fs.copySync(
            path.join(srcDir, 'flashcards.db'),
            path.join(seedDir, 'flashcards.db')
        );
        
        // Create a wrapper script that uses the bundled Python
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
        
        // Create symlinks for Tauri compatibility
        console.log('Creating portable Python symlinks...');
        fs.ensureDirSync(portableDir);
        fs.symlinkSync(
            path.join(distDir, 'python-venv', 'bin'),
            path.join(portableDir, 'bin')
        );
        fs.symlinkSync(
            path.join(distDir, 'python-venv', 'lib'),
            path.join(portableDir, 'lib')
        );
        fs.symlinkSync(
            path.join(distDir, 'python-venv', 'include'),
            path.join(portableDir, 'include')
        );
        fs.copySync(
            path.join(distDir, 'python-venv', 'pyvenv.cfg'),
            path.join(portableDir, 'pyvenv.cfg')
        );
        
        console.log('Optimized Python bundle created successfully!');
        
        // Report size savings
        const bundleSize = execSync(`du -sh "${distDir}"`, { encoding: 'utf8' }).trim();
        console.log(`Bundle size: ${bundleSize}`);
        
    } catch (error) {
        console.error('Error bundling Python:', error);
        process.exit(1);
    }
}

bundlePythonOptimized();
