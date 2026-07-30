# Remote WOL PC (Face ID Unlock & Control)

Ce projet permet de contrôler un PC Windows à distance depuis un iPhone (PWA, Siri, Raccourcis iOS) en utilisant une architecture **Local-First**. Il permet d'allumer (Wake-on-LAN), d'éteindre, de verrouiller et surtout de déverrouiller son PC Windows via Face ID.

## 🏗 Architecture "Local-First"

L'architecture est pensée pour être sécurisée et fonctionner sans serveur distant qui aurait accès au PC. Le flux se déroule de la manière suivante :

1. **La PWA (Frontend)** : Hébergée sur un serveur web public (ex: Cloudflare Tunnel, VPS) développé en React (Vite). Elle sert de tableau de bord de configuration. Son design "Apple-like" permet de l'installer comme une vraie application native sur l'iPhone.
2. **Le Client Windows (API C#)** : Une petite application tournant en tâche de fond sur le PC Windows. Elle écoute sur le réseau local et expose une API REST (ex: `http://192.168.1.X:8080/api/shutdown`) sécurisée par une `ApiKey`.
3. **Les Raccourcis iOS** : Pour contourner les restrictions de sécurité du navigateur (qui empêchent l'envoi de requêtes HTTP locales depuis un site HTTPS ou de paquets UDP), nous utilisons l'application "Raccourcis" native d'iOS. Les raccourcis communiquent directement depuis l'iPhone vers le PC sur le même réseau Wi-Fi local.
4. **Credential Provider (Phase 4)** : Pour le déverrouillage biométrique, un Custom Credential Provider (DLL) sera intégré à l'écran de verrouillage Windows.

## 📂 Structure du projet

- `/frontend` : Code source de l'application Web PWA (React + Vite). UI designée avec du CSS natif (Glassmorphism, SF Fonts).
- `/windows-client` : Code source du client API en C# (.NET 8). Contient la logique d'exécution des commandes système Windows.
- `AI_PROMPT_WINDOWS.md` : Fichier de contexte pour aider une IA (Copilot, ChatGPT, etc.) à reprendre le développement sur un environnement Windows (particulièrement pour le Credential Provider).

## 🚀 Installation & Utilisation

### Étape 1 : Interface Web
```bash
cd frontend
npm install
npm run dev
```

### Étape 2 : API Locale (Sur le PC Windows)
1. Installez le [SDK .NET 8](https://dotnet.microsoft.com/download/dotnet/8.0).
2. Configurez votre `ApiKey` dans `windows-client/appsettings.json`.
3. Dans un terminal, lancez le client : `dotnet run`.

### Étape 3 : Raccourcis iOS
Créez un raccourci sur votre iPhone effectuant une requête `POST` vers l'IP locale de votre PC, par exemple `http://192.168.X.X:8080/api/lock`, en incluant l'en-tête `x-api-key: VOTRE_CLE_SECRETE`.
