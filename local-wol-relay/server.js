const express = require('express');
const wol = require('wake_on_lan');
const app = express();
const port = 3000;

// Configurations :
// Il faudra remplacer par l'adresse MAC réelle de ton PC Windows (ex: "A1:B2:C3:D4:E5:F6")
const MAC_ADDRESS = process.env.MAC_ADDRESS || '00:00:00:00:00:00'; 
const API_KEY = process.env.API_KEY || 'WOL-1234-ABCD-SECURE-KEY-2026';

app.use(express.json());

// Middleware d'authentification (même clé que pour le client Windows)
app.use((req, res, next) => {
    const providedApiKey = req.headers['x-api-key'];
    if (!providedApiKey || providedApiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
    }
    next();
});

// Endpoint pour allumer le PC
app.post('/api/wake', (req, res) => {
    // wol.wake() envoie le "Magic Packet" en broadcast (par défaut 255.255.255.255 sur le port 9)
    wol.wake(MAC_ADDRESS, function(error) {
        if (error) {
            console.error('Erreur WOL:', error);
            return res.status(500).json({ error: 'Failed to send Wake-on-LAN packet.' });
        } else {
            console.log(`Paquet magique WOL envoyé avec succès à l'adresse MAC : ${MAC_ADDRESS}`);
            return res.status(200).json({ message: 'Wake-on-LAN magic packet sent.' });
        }
    });
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', service: 'wol-relay' });
});

app.listen(port, () => {
    console.log(`Relais WOL démarré sur http://localhost:${port}`);
    console.log(`En attente de requêtes POST sur /api/wake pour réveiller : ${MAC_ADDRESS}`);
});
