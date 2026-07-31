@echo off
setlocal enabledelayedexpansion
title Mise a jour de RemoteWOL
color 0B

:: S'assurer que le script s'execute dans son propre dossier (utile si lance en tant qu'Admin)
cd /d "%~dp0"

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
dotnet --list-sdks | findstr /C:"8." >nul 2>nul
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

set "SCRIPT_UPDATED=0"
if not exist ".git" (
    echo Initialisation du depot Git local...
    git init
    git remote add origin https://github.com/Tom1419-git/Remote_WOL_PC.git
    git fetch
    git reset --hard origin/main
    set "SCRIPT_UPDATED=1"
) else (
    git fetch
    for /f %%i in ('git rev-list HEAD...origin/main --count') do set "COMMITS_BEHIND=%%i"
    if "!COMMITS_BEHIND!" NEQ "0" (
        git pull origin main
        set "SCRIPT_UPDATED=1"
    )
)

if "!SCRIPT_UPDATED!"=="1" (
    echo.
    echo Le script de mise a jour a ete modifie. Relancement automatique...
    start "" cmd /c "%~dp0update.bat"
    exit /b
)

echo.
echo [2/4] Arret de l'ancienne version...
taskkill /F /IM PcRemoteClient.exe 2>nul

echo.
echo [3/4] Compilation et installation de la nouvelle version...

:: Sauvegarde de la configuration locale si elle existe
if exist "%LOCALAPPDATA%\RemoteWOL\appsettings.json" (
    echo Sauvegarde de appsettings.json...
    copy /Y "%LOCALAPPDATA%\RemoteWOL\appsettings.json" "%TEMP%\appsettings_backup.json" >nul
)

cd windows-client
dotnet publish -c Release -r win-x64 --self-contained false -o "%LOCALAPPDATA%\RemoteWOL"
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] La compilation a echoue. Veuillez lire l'erreur ci-dessus.
    pause
    exit /b
)
cd ..

:: Restauration de la configuration locale
if exist "%TEMP%\appsettings_backup.json" (
    echo Restauration de appsettings.json...
    copy /Y "%TEMP%\appsettings_backup.json" "%LOCALAPPDATA%\RemoteWOL\appsettings.json" >nul
    del "%TEMP%\appsettings_backup.json"
)

echo.
echo [4/4] Relance du client en arriere-plan...
start "" "%LOCALAPPDATA%\RemoteWOL\PcRemoteClient.exe"

echo.
echo ==================================================
echo   Mise a jour terminee et fonctionnelle !
echo ==================================================
echo.
pause
