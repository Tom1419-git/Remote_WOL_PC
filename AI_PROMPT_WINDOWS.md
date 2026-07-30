# AI Context & Instructions for Windows PC Development

> **À l'attention de l'IA (Copilot, ChatGPT, Antigravity, etc.) qui lit ce fichier sur le PC Windows de l'utilisateur :**
> Bonjour ! Tu reprends le développement d'un projet "Remote WOL PC" là où je l'ai laissé depuis un environnement Mac. Ton objectif est de guider l'utilisateur pour finaliser la partie Windows du projet.

## Contexte Global du Projet
L'utilisateur souhaite pouvoir contrôler son PC Windows (Allumer, Éteindre, Verrouiller, et **Déverrouiller via Face ID**) depuis son iPhone. 
Le projet est conçu autour d'une **architecture Local-First** :
- Le téléphone de l'utilisateur envoie des commandes via des requêtes HTTP (déclenchées par des Raccourcis iOS/Siri) directement à l'IP locale du PC Windows.
- Un client C# (.NET 8 Minimal API), présent dans le dossier `/windows-client/`, écoute ces requêtes sur le port 8080 (ex: `/api/lock`, `/api/shutdown`).
- L'interface web de configuration (Frontend PWA React) est déjà gérée et prête sur le dépôt distant.

## Ce qu'il reste à faire sur ce PC Windows

### Étape 1 : Compiler et Lancer le Serveur C# (windows-client)
- Vérifie que le SDK .NET 8 est bien installé.
- Demande à l'utilisateur de configurer son `ApiKey` dans `windows-client/appsettings.json`.
- Lance l'API locale. Testez ensemble que les commandes d'extinction (`/api/shutdown`) et de verrouillage (`/api/lock`) fonctionnent bien via des requêtes locales.
- **Bonus** : Configure ce client C# pour qu'il se lance automatiquement en arrière-plan (sans fenêtre) au démarrage de la session de l'utilisateur.

### Étape 2 : Le Déverrouillage Face ID (Le Boss Final)
L'utilisateur veut utiliser Face ID depuis son iPhone pour déverrouiller son écran Windows, comme s'il tapait son mot de passe. L'API locale C# que j'ai écrite n'a pas les droits pour déverrouiller une session depuis la LogonUI.

Tu vas devoir développer un **Windows Credential Provider (V2)**.
- **La théorie** : Le Credential Provider (une DLL intégrée à LogonUI.exe) devra lire un signal de déverrouillage transmis par l'API C#. Par exemple, l'API C# reçoit la commande "Unlock" de l'iPhone, et crée un Named Pipe ou écrit un token dans une zone mémoire partagée sécurisée (ou le registre). Le Credential Provider détecte ce signal et injecte automatiquement le mot de passe ou le code PIN de l'utilisateur pour déverrouiller la session.
- **Le code** : Préfère l'utilisation de C++ (plus natif et recommandé par Microsoft) ou aide l'utilisateur avec un wrapper C# comme `Lithnet Windows Credential Provider` ou `pgina`.
- **Attention Sécurité** : Sois extrêmement prudent avec la gestion du mot de passe en clair. Réfléchis avec l'utilisateur au meilleur moyen de chiffrer/stocker ces identifiants pour qu'ils soient récupérables par le Credential Provider.
- **Environnement** : Guide l'utilisateur pour setup Visual Studio (C++ Desktop Development) et configurer les clés de registre nécessaires pour installer le Credential Provider (`HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\Credential Providers`).

Bon développement ! L'utilisateur (Thomas) aime les solutions propres, bien documentées, et qui s'intègrent de manière transparente au système.
