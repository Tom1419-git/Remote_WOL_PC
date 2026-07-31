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
cd windows-client
dotnet publish -c Release -r win-x64 --self-contained false -o "%LOCALAPPDATA%\RemoteWOL"
cd ..

echo.
echo [4/4] Relance du client en arriere-plan...
start "" "%LOCALAPPDATA%\RemoteWOL\PcRemoteClient.exe"

echo.
echo ==================================================
echo   Mise a jour terminee et fonctionnelle !
echo ==================================================
echo.
pause
