# Guide: Convert Equipment History Sheet System to Windows EXE

Since you want to run this app completely offline as a standalone `.exe` file, follow these steps on your **Windows Computer**.

### Prerequisites
1.  **Install Node.js**: Download and install from [nodejs.org](https://nodejs.org/).
2.  **Download your code**: In Replit, click the project name at the top -> **Download as ZIP**. Extract it to a folder on your computer.

---

### Step 1: Set up the Project Locally
1.  Open **Command Prompt** or **PowerShell** in your extracted project folder.
2.  Install all dependencies:
    ```bash
    npm install
    ```
3.  Install Electron-related tools:
    ```bash
    npm install --save-dev electron electron-builder
    ```

### Step 2: Prepare for Local Storage (SQLite)
Run the script I created for you to swap the database from the web-based version to the local offline version:
```bash
node scripts/prepare-local.js
```
*This will create a `data` folder on your computer where all your records will be saved.*

### Step 3: Create the Electron Main Script
Create a new file named `main.js` in your root folder and paste this code:

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Equipment History Sheet Management System",
    webPreferences: {
      nodeIntegration: false
    }
  });

  // Start the backend server
  serverProcess = spawn('node', [path.join(__dirname, 'dist', 'index.cjs')], {
    env: { ...process.env, NODE_ENV: 'production', PORT: 5000 }
  });

  // Wait for server to start, then load the app
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
  }, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
  });
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### Step 4: Add Build Configuration
Open your `package.json` file and add this "build" section:

```json
"main": "main.js",
"build": {
  "appId": "com.dop.equipment-history",
  "productName": "Equipment History System",
  "directories": {
    "output": "build"
  },
  "files": [
    "dist/**/*",
    "main.js",
    "data/**/*"
  ],
  "win": {
    "target": "portable"
  }
}
```

### Step 5: Generate the EXE
Run this command to package everything into a single Windows executable:
```bash
npx electron-builder
```

---

### Where is my EXE?
After the command finishes, look inside the new `build` folder. You will find **Equipment History System.exe**. You can move this file anywhere (even to a USB drive) and run it without any internet or web link!
