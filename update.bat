@echo off
setlocal enabledelayedexpansion
title Mise a jour de RemoteWOL
color 0B

echo ==================================================
echo   Mise a jour automatique de RemoteWOL
echo ==================================================
echo.

:: Verification de Git
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ATTENTION] Git n'est pas installe sur cet ordinateur.
    set /p "install_git=Voulez-vous installer Git automatiquement ? (O/N) : "
    if /i "!install_git!"=="O" (
        echo Installation de Git en cours... patientez.
        winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
        echo Git a ete installe. Veuillez fermer cette fenetre et relancer update.bat !
        pause
        exit /b
    ) else (
        echo Mise a jour annulee car Git est requis.
        pause
        exit /b
    )
)

:: Verification de Dotnet SDK
where dotnet >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ATTENTION] Le SDK .NET 8 n'est pas installe sur cet ordinateur.
    set /p "install_dotnet=Voulez-vous installer le SDK .NET 8 automatiquement ? (O/N) : "
    if /i "!install_dotnet!"=="O" (
        echo Installation de .NET 8 SDK en cours... patientez.
        winget install --id Microsoft.DotNet.SDK.8 -e --silent --accept-package-agreements --accept-source-agreements
        echo Le SDK .NET 8 a ete installe. Veuillez fermer cette fenetre et relancer update.bat !
        pause
        exit /b
    ) else (
        echo Mise a jour annulee car le SDK .NET 8 est requis pour la compilation.
        pause
        exit /b
    )
)

if not exist ".git" (
    echo [ERREUR] Ce dossier n'est pas un depot Git valide. 
    echo Veuillez telecharger le projet en utilisant "git clone" pour que la mise a jour auto fonctionne.
    pause
    exit /b
)

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
