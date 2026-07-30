# 📖 Tutoriel d'Installation : Remote WOL PC

Ce guide complet t'explique pas à pas comment installer tout le système pour déverrouiller, allumer, éteindre et verrouiller ton PC depuis ton iPhone (avec Face ID) de n'importe où dans le monde !

---

## 1️⃣ Configuration du Tunnel Cloudflare (sur le NAS)

Puisque le site Web est maintenant hébergé sur ton NAS, le tunnel va le rendre accessible publiquement !

**Sur ton NAS TrueNAS SCALE :**
1. Ouvre l'interface Web de TrueNAS.
2. Va dans **Apps** (Applications) > **Discover Apps** (Découvrir).
3. Recherche **Cloudflare** ou **cloudflared**.
4. Va sur ton tableau de bord Cloudflare Zero Trust (Zero Trust > Networks > Tunnels).
5. Crée un nouveau tunnel Cloudflare (ex: `PC-Tunnel`) et copie le **Token** pour l'App TrueNAS.
6. Dans Cloudflare, configure deux routes ("Public Hostnames") : 
   - **L'Application Web** : `app.mayoraz-net.ch` -> pointe vers `http://192.168.1.61:8081` (C'est le site web NAS).
   - **L'API Windows** : `api.mayoraz-net.ch` -> pointe vers `http://TON_IP_LOCALE_DU_PC_WINDOWS:8085` (L'API PC).

---

## 2️⃣ Configuration du PC Windows (Le Serveur API)

J'ai préparé un dossier prêt à l'emploi sur ton Bureau Windows : **`RemoteWOL_Release`**.

### Étape A : Lancer l'API C#
1. Ouvre le dossier **`RemoteWOL_Release`** sur ton Bureau.
2. Double-clique sur **`PcRemoteClient.exe`**.
3. Une fenêtre noire (console) va s'ouvrir. Garde-la ouverte en arrière-plan (elle écoute sur le port libre **`8085`**).
*(Bonus)* : Tu pourras plus tard configurer Windows pour lancer ce `.exe` automatiquement au démarrage.

### Étape B : Sauvegarder ton mot de passe Windows de façon sécurisée
L'API va chiffrer (avec le chiffrement militaire DPAPI de Windows) ton mot de passe sur le PC.
1. Ouvre un terminal PowerShell.
2. Tape cette commande en remplaçant `TonMotDePasse` par le vrai code PIN ou mot de passe de ta session Windows :
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8085/api/set-credentials" -Method Post -Headers @{ "x-api-key" = "WOL-1234-ABCD-SECURE-KEY-2026" } -ContentType "application/json" -Body '{"password": "TonMotDePasse"}'
   ```

### Étape C : Installer le "Déverrouilleur" (Credential Provider)
1. Va toujours dans le dossier **`RemoteWOL_Release`** sur ton Bureau.
2. Fais un **clic droit sur `install.bat`** > **Exécuter en tant qu'administrateur**.
3. Un message confirmera la copie et l'éditeur de registre demandera l'autorisation. Accepte (Oui).
4. La DLL est installée !

---

## 3️⃣ Configuration de l'iPhone (Le Client Face ID)

Pour pouvoir tout contrôler depuis ton téléphone, c'est très simple :

1. Ouvre Safari sur ton iPhone et va sur l'adresse publique de ton app (ex: `https://app.mayoraz-net.ch` ou l'adresse IP locale `http://192.168.1.61:8081` si tu es en Wi-Fi).
2. Clique sur la roue crantée (Paramètres) pour configurer ton PC :
   - **Nom** : PC Maison
   - **IP** : `https://api.mayoraz-net.ch` (Ton URL Cloudflare qui pointe vers le PC)
   - **Adresse MAC** : L'adresse MAC de ton PC (pour le Wake-on-LAN).
   - **Clé API** : `WOL-1234-ABCD-SECURE-KEY-2026`
3. Clique sur **"Télécharger le Raccourci iOS"**.
4. Ouvre le fichier téléchargé avec l'app **Raccourcis (Shortcuts)** sur ton iPhone et enregistre-le.

**Et voilà !**
Quand ton PC est allumé mais verrouillé : Lance le raccourci, Face ID te reconnaît, envoie le signal à ton API, qui le transmet à ton PC. La session s'ouvre magiquement ! 🎉
