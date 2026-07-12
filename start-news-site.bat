@echo off
setlocal
cd /d "%~dp0"
echo.
echo Kaoyan News Site
echo URL: http://localhost:8787
echo Keep this window open while using the website.
echo.
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "$until=(Get-Date).AddSeconds(20); while((Get-Date) -lt $until){ try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://localhost:8787/' | Out-Null; Start-Process 'http://localhost:8787/'; exit } catch { Start-Sleep -Milliseconds 250 } }"
"C:\Program Files\nodejs\node.exe" server.mjs
echo.
echo Server stopped. Press any key to close.
pause >nul
