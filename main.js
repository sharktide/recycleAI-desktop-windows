const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const log = require('electron-log');

// Set up logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Variables
let mainWindow;

// Function to create the main window
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,  // Allows Node.js APIs in the renderer
      contextIsolation: false  // Necessary for `require()` to work in the renderer
    },
  });

  // Load your HTML file
  mainWindow.loadFile('index.html');

  // Open DevTools (optional)
  // mainWindow.webContents.openDevTools();

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Function to check for updates
function checkForUpdates() {
  autoUpdater.checkForUpdatesAndNotify();

  // Set event listeners for the update process
  autoUpdater.on('update-available', () => {
    console.log('Update available');
    mainWindow.webContents.send('update-available');
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });

  autoUpdater.on('error', (error) => {
    console.error('Error in auto-updater:', error);
    dialog.showErrorBox('Update Error', 'Failed to check for updates.');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded');
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version has been downloaded. It will be installed now.',
      buttons: ['Restart', 'Later']
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}

// App ready event
app.whenReady().then(() => {
  createWindow();

  // Check for updates when the app starts
  checkForUpdates();

  // For macOS: when no windows are open, create a new window when the app is activated
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except for macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
