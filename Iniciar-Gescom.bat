@echo off
setlocal
echo ========================================================
echo   Iniciando Web-Gescom - PDV & Gestao Comercial
echo ========================================================
echo.

cd /d "%~dp0"

start /b npm run start

echo Aguardando inicializacao do servidor...
timeout /t 3 > nul

start msedge --app=http://localhost:3000 2>nul || start chrome --app=http://localhost:3000 2>nul || start http://localhost:3000

echo.
echo Sistema em execucao em http://localhost:3000
echo.
pause

