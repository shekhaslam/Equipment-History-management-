const electron = require('electron');
console.log('require("electron") type:', typeof electron);
try {
    const builtinElectron = require('node:electron');
    console.log('require("node:electron") type:', typeof builtinElectron);
    console.log('app in builtin:', !!builtinElectron.app);
} catch (e) {
    console.log('require("node:electron") failed:', e.message);
}
process.exit(0);


