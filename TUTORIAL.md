# 📖 Tutoriel d'Installation : Remote WOL PC

Ce guide complet t'explique pas à pas comment installer tout le système pour déverrouiller, allumer, éteindre et verrouiller ton PC depuis ton iPhone (avec Face ID) de n'importe où dans le monde !

---

## 1️⃣ Configuration du Tunnel Cloudflare (sur le NAS)

Puisque le NAS n'est pas accessible directement par mot de passe pour des raisons de sécurité, voici comment tu dois procéder toi-même.

**Si ton NAS est sous TrueNAS SCALE :**
1. Ouvre l'interface Web de TrueNAS.
2. Va dans **Apps** (Applications) > **Discover Apps** (Découvrir).
3. Recherche **Cloudflare** ou **cloudflared**.
4. Lors de l'installation, on te demandera le **Tunnel Token**.
5. Va sur ton tableau de bord Cloudflare Zero Trust (Zero Trust > Networks > Tunnels).
6. Crée un nouveau tunnel Cloudflare (ex: `PC-Tunnel`).
7. Copie le **Token** fourni et colle-le dans la configuration de l'App TrueNAS.
8. Dans Cloudflare, configure la route : 
   - **Public Hostname** : `pc.mayoraz-net.ch` (par exemple)
   - **Service** : `http://TON_IP_LOCALE_DU_PC_WINDOWS:8080` (ex: `http://192.168.1.50:8080`)

*Félicitations, ton PC sera maintenant accessible de l'extérieur via `https://pc.mayoraz-net.ch` !*

---

## 2️⃣ Configuration du PC Windows (Le Serveur)

### Étape A : Lancer l'API C#
1. Ouvre un terminal sur ton PC.
2. Va dans le dossier du projet : `cd C:\Chemin\Vers\Remote_WOL_PC\windows-client`
3. Lance le serveur : `dotnet run` (Il démarrera sur le port 8080).
4. *(Bonus)* : Tu peux créer une tâche planifiée Windows (Task Scheduler) pour lancer `dotnet run` automatiquement au démarrage du PC.

### Étape B : Sauvegarder ton mot de passe Windows de façon sécurisée
Cette étape est vitale pour que le PC puisse se déverrouiller tout seul. L'API va chiffrer (avec le chiffrement militaire DPAPI de Windows) ton mot de passe.
1. Ouvre un autre terminal.
2. Tape cette commande en remplaçant `TonMotDePasse` par le vrai code PIN ou mot de passe de ta session Windows :
   ```bash
   curl -X POST http://localhost:8080/api/set-credentials -H "x-api-key: WOL-1234-ABCD-SECURE-KEY-2026" -H "Content-Type: application/json" -d "{\"password\": \"TonMotDePasse\"}"
   ```

### Étape C : Installer le "Déverrouilleur" (Credential Provider)
1. Va dans le dossier `windows-credential-provider`.
2. Fais un **clic droit sur `install.bat`** > **Exécuter en tant qu'administrateur**.
3. La DLL s'installe dans ton système Windows. (Pour la retirer, lance `Unregister.reg`).

---

## 3️⃣ Configuration de l'iPhone (Le Client Face ID)

Pour pouvoir tout contrôler depuis ton téléphone :

1. Sur ton PC, lance l'application Web React : 
   ```bash
   cd C:\Chemin\Vers\Remote_WOL_PC\frontend
   npm run dev
   ```
2. Ouvre `http://localhost:5173` dans ton navigateur.
3. Clique sur la roue crantée (Paramètres) pour configurer ton PC :
   - **Nom** : PC Maison
   - **IP** : L'adresse IP de ton PC (ex: `192.168.1.50`)
   - **Adresse MAC** : (Pour que l'iPhone puisse allumer le PC éteint).
   - **Clé API** : `WOL-1234-ABCD-SECURE-KEY-2026`
4. Clique sur **"Télécharger le Raccourci iOS"**.
5. Ouvre l'app **Raccourcis (Shortcuts)** sur ton iPhone.
6. Crée un nouveau raccourci (ou modifie celui téléchargé) pour faire ceci :
   - Demander Face ID.
   - Si Face ID valide : Envoyer une requête HTTP (POST) vers `https://pc.mayoraz-net.ch/api/unlock`.
   - Ne pas oublier de mettre le Header `x-api-key` avec la valeur `WOL-1234-ABCD-SECURE-KEY-2026`.

**Et voilà !**
Quand ton PC est éteint : le raccourci envoie un Magic Packet (WOL) à l'adresse MAC.
Quand ton PC est allumé mais verrouillé : Face ID s'active sur l'iPhone, envoie le signal `/api/unlock` à Cloudflare, qui le transmet à ton PC. Le PC déchiffre ton mot de passe, l'envoie au Credential Provider dans l'écran de verrouillage, et la session s'ouvre magiquement ! 🎉
