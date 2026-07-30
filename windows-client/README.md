# PC Remote Control - Windows Client

Ce dossier contient l'API locale en C# qui doit tourner sur votre PC Windows. Elle permet de recevoir les commandes de l'iPhone (via Raccourcis ou PWA) pour verrouiller, éteindre ou mettre en veille le PC.

## Prérequis
- [SDK .NET 8.0](https://dotnet.microsoft.com/download/dotnet/8.0) installé sur le PC Windows.

## Installation et Lancement

1. Copiez ce dossier `windows-client` sur votre PC Windows.
2. Ouvrez un terminal (PowerShell ou CMD) dans ce dossier.
3. Modifiez le fichier `appsettings.json` pour définir votre propre `ApiKey` secrète.
4. Lancez l'application avec la commande :
   ```bash
   dotnet run
   ```
5. L'application écoutera sur le port `8080` de toutes les interfaces réseau (ex: `http://192.168.1.50:8080`).

## API Endpoints

Tous les endpoints sont protégés. Vous devez envoyer le header `x-api-key` avec votre clé secrète.

- `POST /api/lock` : Verrouille le PC.
- `POST /api/shutdown` : Éteint le PC.
- `POST /api/sleep` : Met le PC en veille.
- `GET /api/status` : Retourne l'état du serveur.

> **Note de Sécurité** : Cette application écoute sur le réseau local. Ne l'exposez jamais sur internet sans un proxy inverse sécurisé (HTTPS). Pour une utilisation "Local-First" à la maison, le réseau Wi-Fi local avec la clé d'API suffit.
