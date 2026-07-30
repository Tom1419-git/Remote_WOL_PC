# RemoteWOL V1.0.0 🚀

RemoteWOL est une solution complète (Client + Serveur + Interface Web) permettant d'allumer (Wake-On-LAN), éteindre, mettre en veille et verrouiller un ou plusieurs PC Windows à distance depuis n'importe où, via une application web moderne (PWA) optimisée pour mobile et bureau.

## ✨ Fonctionnalités
- **Wake on LAN (WOL)** : Allumez votre PC via un paquet magique envoyé sur le réseau local (ou via votre adresse IP Publique depuis l'extérieur).
- **Contrôle d'alimentation** : Éteignez, mettez en veille ou verrouillez votre PC à distance.
- **Support Multi-PC & Multi-Utilisateurs** : Ajoutez autant de PC que vous le souhaitez. Une interface administrateur permet de créer plusieurs comptes utilisateurs isolés (parfait pour partager avec un ami ou la famille sans mélanger les PC).
- **Interface PWA (Mobile-first)** : Interface sombre (dark mode), animations fluides, boutons de verrouillage/extinction clairs, ajoutable sur l'écran d'accueil comme une application native.
- **Sécurité** : Authentification par login/mot de passe sur l'interface web, et communication sécurisée (Clé API) entre le relais (NAS/Serveur) et le PC client. Compatible toutes versions de Windows (Home et Pro) via les tâches planifiées interactives.

## 🏗 Architecture
L'application fonctionne en trois parties :
1. **Frontend Web (React/Vite)** : L'interface utilisateur à laquelle on accède depuis son téléphone ou PC.
2. **NAS Relay (Node.js)** : Un serveur relais (généralement hébergé sur un NAS Synology ou un Raspberry Pi via Docker) qui garde une base de données des utilisateurs/PC, envoie les paquets WOL, et relaie les commandes au PC client.
3. **Windows Client (C# .NET)** : Un service très léger qui tourne en arrière-plan sur le PC Windows et écoute les commandes (Extinction, Veille, Verrouillage) sur le port `8085`.

## 🛠 Prérequis
- Un PC sous **Windows 10 ou 11** (Home ou Pro).
- Un serveur/NAS (ex: Synology) compatible Docker pour héberger le serveur et l'interface web.
- Le WOL (Wake on LAN) activé dans le BIOS et dans les paramètres de la carte réseau du PC Windows.

## 📥 Installation

### 1. Installation sur le PC Windows (Le Client)
1. Téléchargez (via le bouton vert Code -> Download ZIP) ce dépôt sur le PC Windows que vous souhaitez contrôler.
2. Décompressez le dossier.
3. Allez dans le dossier `windows-client`.
4. Faites un clic droit sur le fichier **`Install.ps1`** et choisissez **Exécuter avec PowerShell**.
5. Une invite vous demandera de créer une **Clé API**. Entrez un mot de passe de votre choix (ex: `MaCleSecrete123`).
6. Le script va s'occuper de tout : créer l'application, ouvrir le port 8085 dans le pare-feu, et créer les tâches en arrière-plan.

### 2. Hébergement Web & Relais (Le Serveur - Docker)
L'interface et le relais peuvent être déployés avec Docker.
Un fichier `docker-compose.yml` (à configurer selon votre environnement) ou le script de déploiement `deploy_v2.py` (pour un transfert SSH direct) sont à votre disposition.

- Le **Relais (Backend)** écoute par défaut sur le port interne `8082`.
- Le **Frontend (Web)** écoute par défaut sur le port `80` du container (qui peut être mappé sur `8081`).

*Astuce Synology* : Utilisez le "Reverse Proxy" (Portail de connexion > Avancé) pour lier un domaine HTTPS vers le port 8081 de l'interface web.

## 📱 Utilisation
1. Accédez à l'URL de votre interface web (ex: `https://wol.mon-domaine.com`).
2. Connectez-vous avec vos identifiants (le compte par défaut se crée au premier démarrage si la base est vide, pensez à ajouter votre propre admin).
3. Cliquez sur **+ Add PC** et renseignez :
   - Le nom (ex: Mon PC Fixe)
   - L'adresse IP Locale (ex: 192.168.1.100)
   - L'adresse MAC de la carte réseau
   - La clé API (la même que vous avez tapée lors de l'exécution de `Install.ps1`)
   - (Optionnel) L'IP Publique si vous accédez depuis l'extérieur et que vous avez fait les redirections de port sur votre routeur (ports 9 et 8085 pointant vers l'IP Locale du PC).

🎉 **Et voilà ! Vous pouvez allumer, éteindre ou verrouiller votre PC d'un simple clic !**
