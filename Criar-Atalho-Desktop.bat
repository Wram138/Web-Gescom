@echo off
setlocal
echo ========================================================
echo   Criando Atalho do Web-Gescom na Area de Trabalho
echo ========================================================
echo.

set SCRIPT="%TEMP%\CriarAtalho_%RANDOM%.vbs"
set APP_DIR=%~dp0
set TARGET_EXE=%APP_DIR%Web-Gescom.exe

echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Web-Gescom PDV.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%TARGET_EXE%" >> %SCRIPT%
echo oLink.WorkingDirectory = "%APP_DIR%" >> %SCRIPT%
echo oLink.IconLocation = "%APP_DIR%Icon\pdv.ico, 0" >> %SCRIPT%
echo oLink.Description = "Web-Gescom - PDV e Gestao Comercial" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript //nologo %SCRIPT%
del %SCRIPT%

echo Atalho criado com sucesso na Area de Trabalho!
echo.
pause

