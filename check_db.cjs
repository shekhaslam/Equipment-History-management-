const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join('data', 'sqlite.db'));

console.log("Retrying ticketNo migration...");
try {
  db.exec("ALTER TABLE repair_requests ADD COLUMN ticketNo TEXT;");
  console.log("✅ Added ticketNo column");
} catch(e) {
  console.log("❌ Error adding ticketNo:", e.message);
}

const columns = db.prepare("PRAGMA table_info(repair_requests)").all();
console.log("Final Schema:", JSON.stringify(columns, null, 2));
