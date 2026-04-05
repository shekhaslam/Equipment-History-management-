/**
 * EQUIPMENT-DOP ASSETS REPORT: Cloud Bridge Script
 * 100% Free 24/7 Connectivity
 */

const SPREADSHEET_NAME = "EQUIPMENT-DOP_ASSETS REPORT";

/**
 * Setup: Create Sheet structure if not exists
 */
function setup() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Equipment List Tab
  let eqSheet = ss.getSheetByName("EQUIPMENT_LIST");
  if (!eqSheet) {
    eqSheet = ss.insertSheet("EQUIPMENT_LIST");
    eqSheet.appendRow(["ID", "Name", "S/N", "Office", "Model", "Division", "Area", "Pincode", "InstalledAt", "InstallDate", "Verified Office ID", "Last Sync"]);
    eqSheet.getRange("A1:L1").setFontWeight("bold").setBackground("#f3f3f3");
  }
  
  // 2. Reports Tab
  let repSheet = ss.getSheetByName("REPORTS");
  if (!repSheet) {
    repSheet = ss.insertSheet("REPORTS");
    repSheet.appendRow(["ID", "TicketNo", "EquipmentID", "Reporter", "Branch", "Mobile", "Fault", "Details", "Timestamp", "SyncStatus", "ResDate", "ResNature", "ResVendor", "ResRemarks"]);
    repSheet.getRange("A1:N1").setFontWeight("bold").setBackground("#D41217").setFontColor("white");
  }
}

/**
 * Handle GET Requests (Dashboard Sync & Cloud Form Fetch)
 */
function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "get_equipment") {
    const id = e.parameter.id;
    return get_equipment(id); // Call the new robust get_equipment function
  }
  
  if (action === "get_latest_ticket") {
    const equipId = e.parameter.equipmentId;
    const reporter = e.parameter.reporter;
    const sheet = ss.getSheetByName("REPORTS");
    const data = sheet.getDataRange().getValues();
    
    // Find the latest ticket for this specific report (Bottom up)
    for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][2].toString() === equipId.toString() && data[i][3].toString() === reporter.toString()) {
            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                ticketNo: data[i][1]
            })).setMimeType(ContentService.MimeType.JSON);
        }
    }
  }

  if (action === "get_all_tickets") {
    const sheet = ss.getSheetByName("REPORTS");
    const data = sheet.getDataRange().getValues();
    let tickets = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i][1]) tickets.push(data[i][1].toString());
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, tickets })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "fetch_for_sync") {
    const sheet = ss.getSheetByName("REPORTS");
    const data = sheet.getDataRange().getValues();
    let unsynced = [];
    
    for (let i = 1; i < data.length; i++) {
        const status = data[i][9];
        if (status === "REPORTER_SYNC_PENDING" || status === "PENDING") {
            unsynced.push({
                row: i + 1,
                ticketNo: data[i][1],
                equipmentId: data[i][2],
                reporterName: data[i][3],
                branchName: data[i][4],
                mobile: data[i][5],
                fault: data[i][6], // Column G
                details: data[i][7], // Column H
                timestamp: data[i][8]
            });
        }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, reports: unsynced })).setMimeType(ContentService.MimeType.JSON);
  }

  // New Action for Deletion Sync
  if (action === "get_all_tickets") {
    const sheet = ss.getSheetByName("REPORTS");
    const data = sheet.getDataRange().getValues();
    const tickets = [];
    for (let i = 1; i < data.length; i++) {
        const status = data[i][9];
        if (status === "PENDING" || status === "PROCESSING") {
            tickets.push(data[i][1].toString());
        }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, tickets })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "get_status") {
    const ticketNo = e.parameter.ticket;
    const sheet = ss.getSheetByName("REPORTS");
    const data = sheet.getDataRange().getValues();
    const eqSheet = ss.getSheetByName("EQUIPMENT_LIST");
    const eqData = eqSheet.getDataRange().getValues();
    
    for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][1].toString() === ticketNo.toString()) {
            // Find equipment name
            let eqName = "DOP Asset";
            const eqId = data[i][2].toString();
            for (let j = 1; j < eqData.length; j++) {
                if (eqData[j][0].toString() === eqId) {
                    eqName = eqData[j][1];
                    break;
                }
            }

            return ContentService.createTextOutput(JSON.stringify({
                success: true,
                status: data[i][9], // PENDING / SYCHED / RESOLVED
                equipmentName: eqName,
                lastUpdate: data[i][8],
                ticketNo: data[i][1]
            })).setMimeType(ContentService.MimeType.JSON);
        }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Ticket not found" })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("DOP Cloud Bridge Active").setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handle POST Requests (Report Submission & Admin Sync-Up)
 */
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "submit_report") {
    const sheet = ss.getSheetByName("REPORTS");
    const timestamp = new Date().toLocaleString('en-IN');
    
    if (body.ticketNo) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
          if (data[i][1].toString() === body.ticketNo) {
              sheet.getRange(i + 1, 4).setValue(body.reporterName);
              sheet.getRange(i + 1, 5).setValue(body.branchName);
              sheet.getRange(i + 1, 6).setValue(body.mobile);
              sheet.getRange(i + 1, 7).setValue(body.issueType);
              sheet.getRange(i + 1, 8).setValue(body.issueDescription);
              sheet.getRange(i + 1, 9).setValue(timestamp);
              sheet.getRange(i + 1, 10).setValue("REPORTER_SYNC_PENDING");
              return ContentService.createTextOutput(JSON.stringify({ success: true, ticketNo: body.ticketNo })).setMimeType(ContentService.MimeType.JSON);
          }
      }
    }
    
    const ticketNo = generateShortID();
    const faultDomain = body.faultDomain || body.assetType || body.domain || "";
    const combinedFault = faultDomain ? `${faultDomain}: ${body.issueType}` : body.issueType;
    
    sheet.appendRow([
      Date.now(), // Unique Record ID
      ticketNo,
      body.equipmentId,
      body.reporterName,
      body.branchName,
      body.mobile,
      combinedFault,
      body.issueDescription,
      timestamp,
      "REPORTER_SYNC_PENDING"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, ticketNo })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "sync_equipment_up") {
    const sheet = ss.getSheetByName("EQUIPMENT_LIST");
    const list = body.list; // Array of equipment
    
    // ✅ ATOMIC UPDATE: Use setValues to prevent duplicates from overlapping syncs
    sheet.clear();
    const header = ["ID", "Name", "S/N", "Office", "Model", "Division", "Area", "Pincode", "InstalledAt", "InstallDate", "Verified Office ID", "Last Sync"];
    const now = new Date().toLocaleString('en-IN');
    
    const rows = [header];
    list.forEach(eq => {
        rows.push([eq.id, eq.name, eq.sn, eq.office, eq.model, eq.division, eq.area, eq.pincode, eq.installedAt, eq.installDate, eq.userId || "Local", now]);
    });
    
    if (rows.length > 0) {
        sheet.getRange(1, 1, rows.length, 12).setValues(rows);
        sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#f3f3f3");
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "mark_synced") {
     const sheet = ss.getSheetByName("REPORTS");
     const rows = body.rows; // Array of row numbers to mark as synced
     rows.forEach(row => {
         sheet.getRange(row, 10).setValue("SYCHED");
     });
     return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "update_ticket_status") {
    const sheet = ss.getSheetByName("REPORTS");
    const ticketNo = body.ticketNo;
    const status = body.status; // RESOLVED
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][1].toString() === ticketNo.toString()) {
            const oldStatus = data[i][9];
            sheet.getRange(i + 1, 10).setValue(status);
            
            // If resolution data is provided, fill the log columns (K to N)
            if (status === "RESOLVED") {
                if (body.date) sheet.getRange(i + 1, 11).setValue(body.date);
                if (body.nature) sheet.getRange(i + 1, 12).setValue(body.nature);
                if (body.vendorName) sheet.getRange(i + 1, 13).setValue(body.vendorName);
                if (body.remarks) sheet.getRange(i + 1, 14).setValue(body.remarks);
            }
            
            return ContentService.createTextOutput(JSON.stringify({ 
                success: true, 
                message: `Status updated from ${oldStatus} to ${status}` 
            })).setMimeType(ContentService.MimeType.JSON);
        }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Ticket not found" })).setMimeType(ContentService.MimeType.JSON);
  }
}

function generateShortID() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking chars
  let result = "ER-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Robustly find equipment by ID in the Sheet
 */
function get_equipment(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("EQUIPMENT_LIST");
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Sheet not found" })).setMimeType(ContentService.MimeType.JSON);
  
  const data = sheet.getDataRange().getValues();
  const searchId = id.toString();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Check ID (Column A)
    if (row[0].toString() === searchId) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: {
          id: row[0],
          name: row[1],
          sn: row[2],
          office: row[3],
          model: row[4],
          division: row[5],
          area: row[6],
          pincode: row[7],
          installedAt: row[8],
          installDate: row[9]
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Machine ID not found in Cloud Database" })).setMimeType(ContentService.MimeType.JSON);
}
