@echo off
title Criar Instalador Web-Gescom
cd /d "%~dp0"

echo ========================================================
echo        Web-Gescom - Gerador do Instalador EXE          
echo ========================================================
echo.
echo Gerando o instalador completo (Next.js + Standalone + Node Portatil + Icone)...
echo Por favor, aguarde alguns instantes...
echo.

powershell -ExecutionPolicy Bypass -File scripts\build-installer.ps1

echo.
pause
