@echo off
title Enviar Web-Gescom para o GitHub
cd /d "%~dp0"

echo ========================================================
echo        Web-Gescom - Enviar Atualizacoes ao GitHub       
echo ========================================================
echo.
echo Repositorio: https://github.com/Wram138/Web-Gescom.git
echo Branch: main
echo.
echo Executando: git push -u origin main
echo (Se for a primeira vez, uma janela do navegador podera se abrir para login do GitHub)
echo.

"C:\Program Files\Git\cmd\git.exe" push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   [SUCESSO] Codigo enviado com sucesso para o GitHub!   
    echo ========================================================
) else (
    echo ========================================================
    echo   [AVISO] Ocorreu uma pendencia de autenticacao.       
    echo   Verifique as mensagens acima.                        
    echo ========================================================
)
echo.
pause
