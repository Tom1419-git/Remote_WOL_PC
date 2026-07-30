# 🚀 RemoteWOL v2.0 - Le Panneau de Contrôle PC Ultime

Bienvenue sur le projet **RemoteWOL v2.0** ! 

Cette application vous permet d'allumer (Wake On LAN), verrouiller, et éteindre n'importe quel PC sous Windows depuis une magnifique interface web (optimisée pour iPhone/mobile). 

**Ce qui change dans la V2 (Sleek Dark Mode) :**
- 🎨 Design entièrement revu (mode sombre complet, boutons "Pillules").
- ⚡ **Zéro mot de passe sur Windows** : Le script d'installation installe un service ultra-léger et ne nécessite plus aucun mot de passe.
- 🌍 **Support Multi-Réseaux** : Vous pouvez allumer, verrouiller et éteindre un PC situé sur *un autre réseau internet* !
- 👥 Multi-Comptes : Un système d'administration permet de créer des comptes pour vos amis, chacun gérant ses propres PC.

---

## 🏗 Architecture du Projet

Le projet est divisé en deux grandes parties :

1. **Le Serveur Central (NAS ou VPS)** :
   - Un **Relais (Backend Node.js)** qui stocke les comptes, envoie les paquets magiques de Wake On LAN, et sert de relais pour les commandes vers les PC.
   - Un **Frontend (React)**, l'interface graphique sombre, design et responsive.
2. **Le Client PC (Windows)** :
   - Un micro-service Windows en C# (`PcRemoteClient`) qui écoute en arrière-plan sur le port 8085. Il exécute instantanément les ordres "Verrouiller" et "Éteindre" de manière sécurisée (protégé par clé API).

---

## 📖 Tutoriel d'Installation Complet

### Étape 1 : Déployer le Serveur Central (avec Docker)

Si vous installez ça sur votre NAS (ex: Synology avec Container Manager) ou un serveur Linux :

1. Compilez l'interface web (Dossier `frontend`) :
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Sur votre serveur, créez un dossier `remotewol_relay` avec le contenu du dossier `nas-relay` et construisez l'image Docker :
   ```bash
   cd nas-relay
   docker build -t remotewol-relay .
   docker run -d --name remotewol-relay --network host -v /volume1/docker/remotewol_data:/data --restart unless-stopped remotewol-relay
   ```
3. Configurez un reverse proxy (ex: Nginx) pour exposer :
   - `http://votre-nas/` vers les fichiers statiques du frontend (`frontend/dist/`).
   - `http://votre-nas/relay/`, `/auth/`, `/pcs/`, `/admin/` vers `http://localhost:8082/` (le port du serveur Node).

*Note : Dès le premier lancement, l'application crée automatiquement un compte `admin` avec le mot de passe `admin` (à changer immédiatement).*

### Étape 2 : Connecter votre PC Windows (Client)

Installation ultra-simple en **1 clic**.

1. Déplacez le dossier `windows-client` sur le bureau de votre PC Windows.
2. Faites un clic droit sur le fichier **`Install.ps1`** -> **Exécuter avec PowerShell**.
3. (Si une fenêtre rouge apparaît, cliquez sur "Oui" pour les droits administrateur).
4. Le script va vous demander de coller votre **Clé API**. 
   *(C'est la clé que vous avez inventée lors de l'ajout de votre PC dans l'interface web)*.
5. Et c'est tout ! Le script télécharge, compile, crée la règle Pare-feu et lance le service automatiquement. 

### Étape 3 : Gérer un PC à distance (Réseau d'un ami)

L'un des gros avantages de la V2 est de pouvoir contrôler des PC distants !
Si votre ami veut ajouter son PC sur votre serveur :

1. Allez dans le **Panel Admin** de l'application et créez-lui un compte utilisateur.
2. Demandez à votre ami d'aller sur l'interface, de cliquer sur "+ Ajouter PC" et de remplir ses infos.
3. **Important pour les amis hors du réseau** : 
   - Dans le champ "IP Locale / Publique", votre ami doit mettre **son IP Publique internet** (ou une adresse DDNS).
   - Dans sa box internet, il doit ouvrir/rediriger le port TCP `8085` vers l'IP locale de son PC.
4. **Pour le Wake On LAN à distance** :
   - Il doit aussi ajouter son IP Publique dans le champ "Public IP" et ouvrir le port UDP `9` sur sa box (et le rediriger en "Subnet Directed Broadcast", ex: vers `192.168.1.255`).

Et voilà, tout fonctionne ! 🎉
Appuyez sur `Partager -> Sur l'écran d'accueil` sur votre iPhone pour profiter de l'expérience Full Screen.
