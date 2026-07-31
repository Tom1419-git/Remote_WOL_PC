@echo off
echo ========================================================
echo Installation du Credential Provider Remote WOL
echo ========================================================

net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Privileges Administrateur confirmes.
) else (
    echo [ERREUR] Ce script doit etre lance en tant qu'Administrateur !
    echo Faites un clic droit sur install.bat et choisissez "Exécuter en tant qu'administrateur".
    pause
    exit /b
)

echo Copie de la DLL dans System32...
copy /Y SampleHardwareEventCredentialProvider.dll C:\Windows\System32\SampleHardwareEventCredentialProvider.dll

echo Enregistrement dans le Registre Windows...
regedit /s Register.reg

echo Installation terminee avec succes !
pause
