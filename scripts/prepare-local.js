/**
 * This script prepares the application for a local build.
 * It ensures the database is portable and the build is clean.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Preparing for local EXE build...');

// 1. Swap storage to SQLite
console.log('📦 Switching to SQLite storage...');
const storagePath = path.join(process.cwd(), 'server', 'storage.ts');
const sqliteStoragePath = path.join(process.cwd(), 'server', 'storage.sqlite.ts');

if (fs.existsSync(sqliteStoragePath)) {
  fs.copyFileSync(sqliteStoragePath, storagePath);
  console.log('✅ Storage swapped to SQLite.');
} else {
  console.error('❌ Could not find storage.sqlite.ts');
  process.exit(1);
}

// 2. Build the application
console.log('🏗️  Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully.');
} catch (error) {
  console.error('❌ Build failed.');
  process.exit(1);
}

console.log('\n--- NEXT STEPS FOR YOU ---');
console.log('1. Install Electron locally: npm install --save-dev electron electron-builder');
console.log('2. Create a basic main.js for Electron to load the ./dist/public folder.');
console.log('3. Run electron-builder to create your .exe file.');
console.log('--------------------------');
