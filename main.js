const { app, BrowserWindow, dialog } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const log = require('electron-log');

// Keep track of the current version of the app
const currentVersion = app.getVersion(); // Assuming version is defined in `package.json`

let mainWindow;

// Function to create the main window
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

// Function to download the installer without triggering the save dialog
async function downloadInstaller(url, destination) {
  try {
    const writer = fs.createWriteStream(destination);
    const response = await axios.get(url, { responseType: 'stream' });

    // Pipe the stream directly to a file
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        resolve();
      });

      writer.on('error', (err) => {
        fs.unlink(destination, () => {}); // Clean up in case of error
        reject(`Download failed: ${err.message}`);
      });
    });
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

// Function to execute the installer once downloaded
function execInstaller(installerPath) {
  log.info('Executing installer...');

  exec(installerPath, (err, stdout, stderr) => {
    if (err) {
      log.error('Error executing installer:', err);
      dialog.showErrorBox('Update Failed', 'An error occurred while updating the app.');
      return;
    }
    log.info('Installer executed successfully:', stdout);

    // Show success dialog and relaunch app
    dialog.showMessageBox({
      type: 'info',
      message: 'Update installed successfully! The app will restart now.',
    }).then(() => {
      app.relaunch();
      app.quit();
    });
  });
}



// Function to check for updates
async function checkForUpdates() {
  try {
    // Fetch the status of the update server
    const statusResponse = await axios.get('https://sharktide-recycleai-latest-windows.hf.space/status');
    if (statusResponse.data.status !== 'working') {
      log.error('Update server is not working');
      return;
    }

    // Fetch the latest version from the server
    const latestResponse = await axios.get('https://sharktide-recycleai-latest-windows.hf.space/latest');
    const latestVersion = latestResponse.data.latest;

    if (currentVersion === latestVersion) {
      log.info('App is up to date');
      return;
    }

    log.info(`New version available: ${latestVersion}`);
    // Fetch the download URL for the latest version from your /url endpoint
    const urlResponse = await axios.get('https://sharktide-recycleai-latest-windows.hf.space/url');
    const downloadUrl = urlResponse.data.url; // This is the URL to the .exe installer

    // Get the filename for the installer
    const filenameResponse = await axios.get('https://sharktide-recycleai-latest-windows.hf.space/filename');
    const filename = filenameResponse.data.filename;

    // Define the temporary path where the installer will be saved
    const installerPath = path.join(os.tmpdir(), filename); // Save to the system's temporary directory

    // Download the installer
    await downloadInstaller(downloadUrl, installerPath);

    // Execute the installer after the download is complete
    execInstaller(installerPath);
  } catch (error) {
    log.error('Error checking for updates:', error);
  }
}

// When the app is ready, check for updates and create the main window
app.whenReady().then(() => {
  createWindow();

  // Check for updates after the window is created
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
