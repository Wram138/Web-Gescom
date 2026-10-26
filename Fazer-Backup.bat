@echo off
setlocal
echo ========================================================
echo   Web-Gescom - Backup do Banco de Dados
echo ========================================================
echo.

set APP_DIR=%~dp0
set DB_FILE=%APP_DIR%prisma\gescom.db
set BACKUP_DIR=%APP_DIR%Backups

if not exist "%DB_FILE%" (
    echo [ERRO] Banco de dados nao encontrado em: %DB_FILE%
    pause
    exit /b
)

if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set DEST_FILE=%BACKUP_DIR%\gescom_backup_%TIMESTAMP%.db

copy /y "%DB_FILE%" "%DEST_FILE%" > nul

echo Backup concluido com sucesso!
echo Arquivo salvo em:
echo %DEST_FILE%
echo.
pause

