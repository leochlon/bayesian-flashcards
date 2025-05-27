const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function testBuild() {
    console.log('🔨 Testing Tauri build process...\n');
    
    const rootDir = path.join(__dirname, '..');
    
    try {
        // Step 1: Install frontend dependencies
        console.log('📦 Installing frontend dependencies...');
        process.chdir(path.join(rootDir, 'frontend'));
        execSync('npm install', { stdio: 'inherit' });
        
        // Step 2: Build frontend
        console.log('\n🏗️  Building frontend...');
        execSync('npm run build', { stdio: 'inherit' });
        
        // Verify frontend build
        const buildDir = path.join(rootDir, 'frontend', 'build');
        if (!fs.existsSync(buildDir)) {
            throw new Error('Frontend build directory not found');
        }
        console.log('✅ Frontend build successful');
        
        // Step 3: Bundle Python backend
        console.log('\n🐍 Bundling Python backend...');
        process.chdir(rootDir);
        execSync('node scripts/bundle-python.js', { stdio: 'inherit' });
        
        // Verify Python bundle
        const pythonDistDir = path.join(rootDir, 'src-tauri', 'python-dist');
        if (!fs.existsSync(pythonDistDir)) {
            throw new Error('Python distribution directory not found');
        }
        console.log('✅ Python backend bundled successfully');
        
        // Step 4: Check Tauri configuration
        console.log('\n⚙️  Verifying Tauri configuration...');
        const tauriConfigPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
        if (!fs.existsSync(tauriConfigPath)) {
            throw new Error('Tauri configuration not found');
        }
        
        const tauriConfig = fs.readJsonSync(tauriConfigPath);
        console.log(`✅ Tauri configuration valid - App: ${tauriConfig.productName}`);
        
        // Step 5: Test Tauri build (debug mode for faster testing)
        console.log('\n🦀 Testing Tauri build (debug mode)...');
        process.chdir(path.join(rootDir, 'src-tauri'));
        execSync('cargo tauri build --debug', { stdio: 'inherit' });
        
        console.log('\n🎉 Build test completed successfully!');
        console.log('\nNext steps:');
        console.log('- Run `npm run tauri:build` for production build');
        console.log('- Run `npm run tauri:dev` to test in development mode');
        
    } catch (error) {
        console.error('\n❌ Build test failed:', error.message);
        console.error('\nTroubleshooting tips:');
        console.error('- Ensure Python 3.12 is installed');
        console.error('- Ensure Rust and Tauri CLI are installed');
        console.error('- Check that all dependencies are available');
        process.exit(1);
    }
}

testBuild();
