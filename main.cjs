const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// --- LOAD .ENV MANUALLY ---
// --- LOAD .ENV MANUALLY ---
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envData = fs.readFileSync(envPath, 'utf8');
    envData.split(/\r?\n/).forEach(line => {
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim();
        if (key) process.env[key] = value;
      }
    });
    console.log("✅ Environment Variables Loaded from:", envPath);
  } else {
    console.warn("⚠️ Warning: .env file not found at:", envPath);
  }
}
loadEnv();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  mainWindow.loadURL("http://127.0.0.1:5001");

  mainWindow.webContents.on('did-fail-load', () => {
    console.log("Waiting for server...");
    setTimeout(() => mainWindow.loadURL("http://127.0.0.1:5001"), 2000);
  });

  // --- GOOGLE OAUTH CONFIGURATION ---
  // IMPORTANT: Replace these with your real credentials from Google Cloud Console
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'REPLACE_WITH_YOUR_CLIENT_ID';
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'REPLACE_WITH_YOUR_CLIENT_SECRET';
  const REDIRECT_URI = 'http://localhost:5005';

  // --- LOCAL REDIRECT SERVER (Port 5005) ---
  // This server listens for the OAuth redirect from Google
  const authServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h1 style="color: red;">Auth Error: ${error}</h1>`);
        return;
      }

      if (code) {
        console.log(`✅ Received Auth Code from Google: ${code.substring(0, 10)}...`);
        
        try {
          // 1. Exchange Code for Tokens
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              redirect_uri: REDIRECT_URI,
              grant_type: 'authorization_code'
            })
          });
          
          const tokens = await tokenRes.json();
          if (tokens.error) throw new Error(tokens.error_description || tokens.error);

          // 2. Get User Info
          const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
          });
          const user = await userRes.json();

          console.log(`👤 User Authenticated: ${user.email}`);
          
          // Notify ALL windows (for multi-window testing/usage)
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('google-auth-success', user);
          });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #1a73e8;">✓ Login Successful</h1>
              <p>You have signed in as <b>${user.email}</b>. You can now close this tab.</p>
              <script>setTimeout(() => window.close(), 3000);</script>
            </div>
          `);
        } catch (err) {
          console.error("Token exchange failed:", err);
          res.writeHead(500);
          res.end(`Auth Failed: ${err.message}`);
        }
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  authServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log("⚠️ Port 5005 already in use. Likely another window is handling the redirect.");
    } else {
      console.error("Auth Server Error:", err);
    }
  });

  authServer.listen(5005, '127.0.0.1', () => {
    console.log("🚀 OAuth Redirect Server active on port 5005");
  });

  // --- GOOGLE SYNC HANDLERS ---

  ipcMain.handle('initiate-google-login', async () => {
    try {
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'REPLACE_WITH_YOUR_CLIENT_ID') {
            console.error("❌ Error: Google Client ID is missing in .env");
            // We still try to open, but it will show Google's error page which is better than a generic app error
        }

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
                        `client_id=${GOOGLE_CLIENT_ID}&` +
                        `redirect_uri=${REDIRECT_URI}&` +
                        `response_type=code&` +
                        `scope=https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/drive.file&` +
                        `prompt=select_account`;
        
        console.log("🚀 Launching Official Google OAuth:", authUrl);
        await shell.openExternal(authUrl);
        return { success: true };
    } catch (err) {
        console.error("❌ IPC Handler initiate-google-login failed:", err);
        throw err;
    }
  });

  ipcMain.handle('send-disclosure-email', async (event, email) => {
      console.log(`📑 Sending Data Usage Disclosure to: ${email}`);
      const mailOptions = {
          from: '"DOP E-History System" <admin@dop.gov.in>',
          to: email,
          subject: "Information: Data Access for Cloud Sync",
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 2px solid #red;">
              <h3>Notice: Google ID Usage</h3>
              <p>Hello,</p>
              <p>Your Gmail ID <b>${email}</b> has been linked to the Equipment History Management System.</p>
              <p><b>Purpose:</b> This ID will be used only to create and manage backups in your <b>Google Drive</b>. This ensures that machine repair records are never lost.</p>
              <p>If you did not authorize this, please logout from the application immediately.</p>
              <br>
              <p>Regards,<br>Admin, Dept. of Posts</p>
            </div>
          `
      };
      return { success: true };
  });

  ipcMain.handle('save-google-session', async (event, user) => {
    console.log("Saving official session for:", user.email);
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
      fs.writeFileSync(path.join(dataDir, 'auth.json'), JSON.stringify(user));
      return { success: true };
    } catch (e) { 
      console.error("Session save failed:", e); 
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('load-session', async () => {
    try {
      const authPath = path.join(process.cwd(), 'data', 'auth.json');
      if (fs.existsSync(authPath)) {
        const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        return { success: true, email: data.email };
      }
    } catch (e) { console.error("Session load failed:", e); }
    return { success: false };
  });

  ipcMain.handle('google-logout', async () => {
    try {
      const authPath = path.join(process.cwd(), 'data', 'auth.json');
      if (fs.existsSync(authPath)) fs.unlinkSync(authPath);
    } catch (e) { console.error("Session logout failed:", e); }
    return { success: true };
  });

  ipcMain.handle('get-app-path', async () => {
    return process.cwd();
  });

  ipcMain.handle('sync-to-cloud', async () => {
    const dbPath = path.join(process.cwd(), 'data', 'sqlite.db');
    if (fs.existsSync(dbPath)) {
      console.log("☁️ SYNCING SQLITE TO CLOUD...");
      // In a real app, this would upload to Google Drive/Firebase
      return { success: true, timestamp: new Date().toISOString() };
    }
    return { success: false, error: "DB not found" };
  });

  // --- 24/7 CLOUD BRIDGE SYNC LOGIC ---
  const CLOUD_BRIDGE_URL = process.env.CLOUD_BRIDGE_URL;

  async function syncEquipmentUp() {
    if (!CLOUD_BRIDGE_URL || CLOUD_BRIDGE_URL.includes("PASTE_YOUR")) {
        console.warn("⚠️ Sync Aborted: CLOUD_BRIDGE_URL is not set.");
        return;
    }
    try {
      console.log("📤 Pushing Equipment List to Cloud Bridge...");
      const res = await fetch("http://localhost:5001/api/equipment", {
        headers: { "x-employee-identity": "CLOUD_SYNC_INTERNAL" }
      });
      const equipments = await res.json();
      if (!Array.isArray(equipments)) throw new Error("Local API returned non-array data");
      
      const list = equipments.map(e => ({
        id: e.id, 
        name: e.equipmentName, 
        sn: e.serialNumber, 
        office: e.officeName,
        model: e.modelNumber || e.model,
        division: e.division,
        area: e.area,
        pincode: e.pincode,
        installedAt: e.installedAt,
        installDate: e.installationDate,
        userId: e.userId || e.userid || e.user_id || "MISSING" // ✅ Bulletproof Verified Office ID
      }));

      if (list.length > 0) {
        console.log("🔍 [DEBUG] First Sync Row:", JSON.stringify(list[0], null, 2));
      }

      const cloudRes = await fetch(CLOUD_BRIDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_equipment_up", list, syncSource: "LOCAL_ELECTRON" })
      });
      
      if (!cloudRes.ok) throw new Error(`Cloud returned HTTP ${cloudRes.status}`);
      console.log(`✅ Cloud Equipment Synced UP: ${list.length} units pushed.`);
    } catch (e) { 
        console.error("❌ Cloud Sync UP failed:", e.message); 
        throw e; // Re-throw for parent handler
    }
  }

  async function syncReportsDown() {
    if (!CLOUD_BRIDGE_URL || CLOUD_BRIDGE_URL.includes("PASTE_YOUR")) return;
    try {
      const res = await fetch(`${CLOUD_BRIDGE_URL}?action=fetch_for_sync`);
      const data = await res.json();
      
      if (data.success && data.reports.length > 0) {
        console.log(`☁️ Found ${data.reports.length} new reports in cloud. Processing locally...`);
        
        let successCount = 0;
        for (const report of data.reports) {
            try {
                const saveRes = await fetch("http://localhost:5001/api/public/report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        equipmentId: report.equipmentId,
                        reporterName: report.reporterName,
                        reporterMobile: report.mobile,
                        reporterBranch: report.branchName,
                        issueDescription: report.details,
                        fault: report.fault || report.domain || "", 
                        priority: "medium",
                        ticketNo: report.ticketNo
                    })
                });
                if (saveRes.ok) successCount++;
                else console.warn(`⚠️ Failed to save ticket ${report.ticketNo} locally: ${saveRes.status}`);
            } catch (err) {
                console.error(`❌ Error saving ticket ${report.ticketNo}:`, err.message);
            }
        }

        console.log(`✅ ${successCount}/${data.reports.length} cloud reports saved to local database.`);

        await fetch(CLOUD_BRIDGE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_synced", rows: data.reports.map(r => r.row) })
        });
        console.log("☁️ Cloud status updated to 'SYCHED' for processed rows.");
      } else {
        console.log("☁️ No new reporter sync pending tickets found in cloud.");
      }

      // Sync DELETIONS: Remove any pending tickets locally that were deleted in the cloud
      try {
        const delRes = await fetch(`${CLOUD_BRIDGE_URL}?action=get_all_tickets`);
        const delData = await delRes.json();
        if (delData.success && Array.isArray(delData.tickets)) {
            await fetch("http://localhost:5001/api/admin/tickets/sync-deletions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ validTickets: delData.tickets })
            });
        }
      } catch (err) {
        // Fallback or ignore if the Google App script is not updated yet
      }

    } catch (e) { console.error("Cloud Sync DOWN failed:", e.message); }
  }

  // Initial Sync and Intervals
  setTimeout(() => {
    syncEquipmentUp();
    syncReportsDown();
  }, 10000); 

  setInterval(syncEquipmentUp, 10 * 1000); 
  setInterval(syncReportsDown, 10 * 1000); 

  ipcMain.handle('manual-cloud-sync', async () => {
    try {
        await syncEquipmentUp();
        await syncReportsDown();
        return { success: true };
    } catch (err) {
        console.error("❌ Manual Sync Trigger failed:", err.message);
        return { success: false, error: err.message };
    }
  });

  ipcMain.handle('update-cloud-ticket-status', async (event, data) => { // Data contains ticketNo, status, nature, amount, vendorName, remarks, date
    if (!CLOUD_BRIDGE_URL || CLOUD_BRIDGE_URL.includes("PASTE_YOUR")) return { success: false };
    try {
        const res = await fetch(CLOUD_BRIDGE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update_ticket_status", ...data })
        });
        const data = await res.json();
        return data;
    } catch (e) {
        console.error("Cloud Status Update failed:", e.message);
        return { success: false, error: e.message };
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Server ko chalte rakhne ke liye quit nahi karenge
});