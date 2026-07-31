param()

# 1. Vérification des droits administrateur
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Ce script doit etre lance en tant qu'Administrateur."
    Write-Warning "Faites un clic droit sur Install.ps1 -> Executer avec PowerShell."
    Pause
    exit
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Installation de RemoteWOL (PC Client)  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 2. Demander la Clé API
$ApiKey = Read-Host "Entrez votre Cle API (ex: WOL-1234-ABCD...)"
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Error "La Cle API ne peut pas etre vide."
    Pause
    exit
}

# 3. Mettre à jour appsettings.json
$AppDir = $PSScriptRoot
$DistDir = Join-Path $AppDir "dist"
$ZipFile = Join-Path $AppDir "dist.zip"

if (!(Test-Path $DistDir)) {
    if (Test-Path $ZipFile) {
        Write-Host "Extraction de l'application..." -ForegroundColor Yellow
        Expand-Archive -Path $ZipFile -DestinationPath $AppDir -Force
    } else {
        Write-Error "Le dossier 'dist' contenant l'application compilee est introuvable."
        Pause
        exit
    }
}

$AppsettingsFile = Join-Path $DistDir "appsettings.json"

$config = @{
    "Logging" = @{
        "LogLevel" = @{
            "Default" = "Information"
            "Microsoft.AspNetCore" = "Warning"
        }
    }
    "AllowedHosts" = "*"
    "ApiKey" = $ApiKey
}

$config | ConvertTo-Json -Depth 5 | Out-File -FilePath $AppsettingsFile -Encoding utf8

# 4. Installation des fichiers
Write-Host "Installation des fichiers en cours..." -ForegroundColor Yellow
$PublishDir = "C:\RemoteWOL_Service"
Remove-Item -Path $PublishDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $PublishDir | Out-Null
Copy-Item -Path "$DistDir\*" -Destination $PublishDir -Recurse -Force

if (!(Test-Path "$PublishDir\PcRemoteClient.exe")) {
    Write-Error "L'installation a echoue, fichier executable manquant."
    Pause
    exit
}

# 5. Règle Pare-feu
Write-Host "Configuration du Pare-feu (Port 8085)..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "RemoteWOL_Client" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "RemoteWOL_Client" -Direction Inbound -LocalPort 8085 -Protocol TCP -Action Allow | Out-Null

# 6. Tâche Planifiée (Lancement en session utilisateur au démarrage/logon)
Write-Host "Creation de la tache planifiee (Session utilisateur)..." -ForegroundColor Yellow
$TaskName = "RemoteWOL_Service"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$LoggedUser = (Get-CimInstance Win32_ComputerSystem).UserName
if ([string]::IsNullOrWhiteSpace($LoggedUser)) {
    $LoggedUser = $env:USERNAME
}

try {
    $UserSID = (New-Object System.Security.Principal.NTAccount($LoggedUser)).Translate([System.Security.Principal.SecurityIdentifier]).Value
} catch {
    $UserSID = $LoggedUser
}

$Action = New-ScheduledTaskAction -Execute "$PublishDir\PcRemoteClient.exe" -WorkingDirectory $PublishDir
$Trigger = New-ScheduledTaskTrigger -AtLogon
$Principal = New-ScheduledTaskPrincipal -UserId $UserSID -LogonType Interactive -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description "Tache de controle interactif RemoteWOL" | Out-Null

# Nettoyage de l'ancienne tâche de lock devenue inutile
Unregister-ScheduledTask -TaskName "RemoteWOL_Lock" -Confirm:$false -ErrorAction SilentlyContinue

# 7. Lancement
Write-Host "Lancement du service..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $TaskName

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Installation terminee avec succes !      " -ForegroundColor Green
Write-Host " Le PC peut maintenant etre verrouille ou " -ForegroundColor Green
Write-Host " eteint a distance depuis votre iPhone.   " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Pause
