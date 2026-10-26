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
echo Escolha uma opcao:
echo  [1] Enviar sobrescrevendo inicializacao vazia do GitHub (Recomendado para repo novo: git push -u origin main --force)
echo  [2] Puxar e mesclar alteracoes remotas primeiro (git pull --rebase e git push)
echo.
set /p opt="Digite 1 ou 2 (Padrao: 1): "

if "%opt%"=="2" (
    echo.
    echo Puxando alteracoes remotas...
    "C:\Program Files\Git\cmd\git.exe" pull origin main --rebase
)

echo.
echo Enviando para o GitHub...
if "%opt%"=="2" (
    "C:\Program Files\Git\cmd\git.exe" push -u origin main
) else (
    "C:\Program Files\Git\cmd\git.exe" push -u origin main --force
)

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   [SUCESSO] Codigo enviado com sucesso para o GitHub!   
    echo ========================================================
) else (
    echo ========================================================
    echo   [AVISO] Verifique as mensagens de erro acima.         
    echo ========================================================
)
echo.
pause


