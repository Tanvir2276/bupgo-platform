@echo off
title BUPGO - Ride Sharing Platform Server
cd /d "%~dp0"
echo ====================================================
echo    Starting BUPGO Server (ICE-3206 Web Tech Lab)
echo ====================================================
echo.
echo Opening BUPGO on your laptop...
start http://localhost:3000
echo.
echo [!] Mobile Phone Access:
echo     Ensure phone and laptop are on the same Wi-Fi network.
echo     Open on Mobile Browser: http://192.168.0.104:3000
echo.
npm start
pause
