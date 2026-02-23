const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { google } = require('googleapis'); 
const fs = require('fs');
const http = require('http');
const path = require('path');

// ✅ Configuration
const TOKEN_PATH = path.join(app.getPath('userData'), 'token.json');
const DB_PATH = "C:\\Equipment-History\\server\\sqlite.db"; 

const CLIENT_ID = '638073198209-a4koue50avr0cfnqn7b3c22soc6r4akt.apps.googleusercontent.com'; 
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:4242'; 

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
let mainWindow;

// ✅ Optimized Sync Logic
async function syncDatabaseToCloud() {
  try {
    if (fs.existsSync(TOKEN_PATH) && fs.existsSync(DB_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const media = { body: fs.createReadStream(DB_PATH) };
      await drive.files.create({
        resource: { 'name': `Backup_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.db` },
        media: media
      });
      console.log("Cloud Backup Created Successfully");
    }
  } catch (e) {
    console.log("Sync skipped: Device is offline or token issue.");
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false, sandbox: false }
  });

  // ✅ Isse window.print() browser preview dikhayega
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'allow' };
  });

  mainWindow.loadURL("http://127.0.0.1:5001");

  // ✅ FIX: Ye block hamesha createWindow ke ANDAR hona chahiye
  mainWindow.webContents.on('did-finish-load', () => {
    syncDatabaseToCloud();
    if (fs.existsSync(TOKEN_PATH)) {
      try {
        const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oauth2Client.setCredentials(tokens);
        google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get()
          .then(res => {
            if(mainWindow) mainWindow.webContents.send('auth-success', res.data.email);
          }).catch(() => console.log("Token expired"));
      } catch (err) { console.log("Token file error"); }
    }
  });
}

// ✅ Logout Handle
ipcMain.handle('google-logout', async () => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH); 
    }
    oauth2Client.setCredentials({}); 
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ✅ Exit hone par sync
app.on('before-quit', () => { syncDatabaseToCloud(); });

// ✅ Direct Login
let server;
ipcMain.handle('google-signin', async () => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', prompt: 'select_account consent', 
    scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.email'],
  });
  shell.openExternal(authUrl);

  return new Promise((resolve) => {
    if (server) server.close();
    server = http.createServer(async (req, res) => {
      if (req.url.indexOf('/?code=') !== -1) {
        const code = new URL(req.url, 'http://localhost:4242').searchParams.get('code');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<h1>Login Successful!</h1>");
        server.close();
        
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens)); 
        
        const userInfo = await google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get();
        if(mainWindow) mainWindow.webContents.send('auth-success', userInfo.data.email);
        resolve({ success: true, email: userInfo.data.email });
      }
    }).listen(4242);
  });
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });