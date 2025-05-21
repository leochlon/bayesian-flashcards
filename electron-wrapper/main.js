const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';
const waitOn = require('wait-on');
const fs = require('fs');

// Keep a reference to prevent garbage collection
let mainWindow;
let flaskProcess;
let flaskPort = 5001;

// Initialize Flask backend
function startFlaskServer() {
  // Path to the Python executable - detect if we're in packaged app or development
  let pythonPath;
  let appPath;
  
  if (app.isPackaged) {
    appPath = path.join(process.resourcesPath, 'app', 'backend');
    pythonPath = path.join(process.resourcesPath, 'app', 'python', 'bin', 'python3');
  } else {
    appPath = path.join(__dirname, '..', 'backend');
    pythonPath = 'python3'; // assuming python3 is in PATH for development
  }

  console.log('Starting Flask backend at:', appPath);

  // Ensure the database directory exists
  const dbDir = path.join(app.getPath('userData'), 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Database path
  const dbPath = path.join(dbDir, 'flashcards.db');

  // Create environment variables for the Flask app
  const env = { 
    ...process.env,
    FLASK_APP: path.join(appPath, 'app.py'),
    DATABASE_URL: `sqlite:///${dbPath}`
  };

  // Start Flask process
  flaskProcess = spawn(pythonPath, ['-m', 'flask', 'run', '--port', flaskPort], {
    cwd: appPath,
    env: env
  });

  flaskProcess.stdout.on('data', (data) => {
    console.log(`Flask: ${data}`);
  });

  flaskProcess.stderr.on('data', (data) => {
    console.error(`Flask error: ${data}`);
  });

  flaskProcess.on('close', (code) => {
    console.log(`Flask process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'Bayesian Flashcards'
  });

  // Set app menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About Bayesian Flashcards',
          click: async () => {
            await shell.openExternal('https://github.com/leochlon/bayesian-flashcards');
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  // Check if we're running in development or production
  if (isDev) {
    // In development, load from React dev server
    waitOn({ resources: [`http://localhost:3000`] }, function(err) {
      if (err) { console.log(err); return; }
      mainWindow.loadURL('http://localhost:3000');
    });
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startFlaskServer();
  
  // Wait for Flask to start before creating the window
  waitOn({ resources: [`http-get://localhost:${flaskPort}/api/decks`] }, function(err) {
    if (err) { 
      console.log('Flask server failed to start:', err); 
      app.quit();
      return; 
    }
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (flaskProcess) {
    flaskProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});