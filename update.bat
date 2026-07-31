@echo off
title Mise a jour de RemoteWOL
color 0B

echo ==================================================
echo   Mise a jour automatique de RemoteWOL
echo ==================================================
echo.

echo [1/4] Recuperation des dernieres modifications (Git Pull)...
git pull origin main

echo.
echo [2/4] Arret de l'ancienne version...
taskkill /F /IM PcRemoteClient.exe 2>nul

echo.
echo [3/4] Compilation et installation de la nouvelle version...
:: Sauvegarde de la configuration (API Key) de Dragnir
copy /Y "%LOCALAPPDATA%\RemoteWOL\appsettings.json" "%TEMP%\appsettings_backup.json" 2>nul

cd windows-client
dotnet publish -c Release -r win-x64 --self-contained false -o "%LOCALAPPDATA%\RemoteWOL"
cd ..

:: Restauration de la configuration
copy /Y "%TEMP%\appsettings_backup.json" "%LOCALAPPDATA%\RemoteWOL\appsettings.json" 2>nul
del "%TEMP%\appsettings_backup.json" 2>nul

echo.
echo [4/4] Relance du client en arriere-plan...
start "" "%LOCALAPPDATA%\RemoteWOL\PcRemoteClient.exe"

echo.
echo ==================================================
echo   Mise a jour terminee et fonctionnelle !
echo ==================================================
echo.
pause
