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
$AppsettingsFile = Join-Path $AppDir "appsettings.json"

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

# 4. Compilation de l'application
Write-Host "Compilation de l'application en cours..." -ForegroundColor Yellow
$PublishDir = "C:\RemoteWOL_Service"
Remove-Item -Path $PublishDir -Recurse -Force -ErrorAction SilentlyContinue
Start-Process -FilePath "dotnet" -ArgumentList "publish `"$AppDir\PcRemoteClient.csproj`" -c Release -r win-x64 --self-contained -o `"$PublishDir`"" -Wait -NoNewWindow

if (!(Test-Path "$PublishDir\PcRemoteClient.exe")) {
    Write-Error "La compilation a echoue."
    Pause
    exit
}

# 5. Règle Pare-feu
Write-Host "Configuration du Pare-feu (Port 8085)..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "RemoteWOL_Client" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "RemoteWOL_Client" -Direction Inbound -LocalPort 8085 -Protocol TCP -Action Allow | Out-Null

# 6. Tâche Planifiée (Service en arrière-plan)
Write-Host "Creation du service (Tache Planifiee)..." -ForegroundColor Yellow
$TaskName = "RemoteWOL_Service"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction -Execute "$PublishDir\PcRemoteClient.exe" -WorkingDirectory $PublishDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Days 9999)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description "Service de controle a distance RemoteWOL" | Out-Null

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
