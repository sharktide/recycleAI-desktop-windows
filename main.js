const { app, BrowserWindow } = require('electron');
const log = require('electron-log');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');
const os = require('os');
const { dialog } = require('electron');

// Store the current version of the app
const currentVersion = app.getVersion(); // This will return the version from your package.json

let mainWindow;

// Function to check for updates
async function checkForUpdates() {
  try {
    // Check if the status endpoint is working
    const statusResponse = await axios.get('https://sharktide-recyclesmart-latest-windows.hf.space/status');
    if (statusResponse.data.status !== 'working') {
      log.error('Update server is not working');
      return;
    }

    // Fetch the latest version from the server
    const latestResponse = await axios.get('https://sharktide-recyclesmart-latest-windows.hf.space/latest');
    const latestVersion = latestResponse.data.latest;

    // If the current version matches the latest version, no update is needed
    if (currentVersion === latestVersion) {
      log.info('App is up to date');
      return;
    }

    log.info(`New version available: ${latestVersion}`);

    // Get the download URL from the server
    const downloadResponse = await axios.get('https://sharktide-recyclesmart-latest-windows.hf.space/url');
    const downloadUrl = downloadResponse.data.url;

    // Get the filename from the server
    const filenameResponse = await axios.get('https://sharktide-recyclesmart-latest-windows.hf.space/filename');
    const filename = filenameResponse.data.filename;

    // Download the new version installer
    const downloadPath = path.join(os.tmpdir(), filename); // Temp folder to store the installer

    await downloadInstaller(downloadUrl, downloadPath);

    // Once downloaded, execute the installer
    execInstaller(downloadPath);
  } catch (error) {
    log.error('Error checking for updates:', error);
  }
}

// Function to download the installer
function downloadInstaller(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(`Failed to download: ${response.statusCode}`);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(`Error downloading file: ${err.message}`);
    });
  });
}

// Function to execute the installer
function execInstaller(installerPath) {
  log.info('Executing installer...');

  exec(installerPath, (err, stdout, stderr) => {
    if (err) {
      log.error('Error executing installer:', err);
      dialog.showErrorBox('Update Failed', 'An error occurred while updating the app.');
      return;
    }
    log.info('Installer executed successfully:', stdout);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: 'Update installed successfully! The app will restart now.',
    }).then(() => {
      app.relaunch();
      app.quit();
    });
  });
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle app startup
app.whenReady().then(() => {
  createWindow();

  // Check for updates on app startup
  checkForUpdates();

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
