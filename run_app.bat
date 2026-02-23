@echo off
title India Post Equipment System - Starter
color 0A

echo [1/2] Starting Backend Server...
:: Naya window khol kar server chalu karega
start cmd /k "cd /d C:\Equipment-History && npx tsx server/index.ts"

echo Waiting for server to initialize...
:: 5 second ka wait taaki server chalu ho jaye
timeout /t 5 /nobreak > nul

echo [2/2] Starting Electron App...
:: Electron app launch karega
npm run electron

echo System is running. Do not close the server window.
pause