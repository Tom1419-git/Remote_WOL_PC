const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const wol = require('wol');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8082;
const JWT_SECRET = 'remotewol-super-secret-2026';
const DATA_FILE = '/data/users.json';

app.use(cors());
app.use(express.json());

// ─── Data helpers ────────────────────────────────────────────────────────────
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = {
        users: [{
          id: uuidv4(),
          username: 'tom1419',
          password: bcrypt.hashSync('Coucou123', 10),
          role: 'admin',
          pcs: [],
          createdAt: new Date().toISOString()
        }]
      };
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Data load error:', e);
    return { users: [] };
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });

  const data = loadData();
  const user = data.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Identifiants incorrects' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, pcs: user.pcs } });
});

app.get('/auth/me', authMiddleware, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({ id: user.id, username: user.username, role: user.role, pcs: user.pcs });
});

// ─── PC management ────────────────────────────────────────────────────────────
app.get('/pcs', authMiddleware, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.id);
  res.json(user?.pcs || []);
});

app.post('/pcs', authMiddleware, (req, res) => {
  const { name, ip, mac, apiKey, wolIp, wolPort } = req.body;
  if (!name || !ip || !mac || !apiKey) return res.status(400).json({ error: 'Champs manquants' });
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const newPc = { id: uuidv4(), name, ip, mac, apiKey, wolIp, wolPort };
  user.pcs.push(newPc);
  saveData(data);
  res.json(newPc);
});



app.put('/pcs/:pcId', authMiddleware, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Non trouvé' });
  const pc = user.pcs.find(p => p.id === req.params.pcId);
  if (!pc) return res.status(404).json({ error: 'PC non trouvé' });
  Object.assign(pc, req.body);
  saveData(data);
  res.json(pc);
});

app.delete('/pcs/:pcId', authMiddleware, (req, res) => {
  const data = loadData();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Non trouvé' });
  user.pcs = user.pcs.filter(p => p.id !== req.params.pcId);
  saveData(data);
  res.json({ ok: true });
});

// ─── Admin routes ─────────────────────────────────────────────────────────────
app.get('/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const data = loadData();
  res.json(data.users.map(u => ({ id: u.id, username: u.username, role: u.role, pcCount: u.pcs.length, createdAt: u.createdAt })));
});

app.post('/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Champs manquants' });
  const data = loadData();
  if (data.users.find(u => u.username === username))
    return res.status(409).json({ error: 'Utilisateur déjà existant' });
  const newUser = {
    id: uuidv4(),
    username,
    password: bcrypt.hashSync(password, 10),
    role: role || 'user',
    pcs: [],
    createdAt: new Date().toISOString()
  };
  data.users.push(newUser);
  saveData(data);
  res.json({ id: newUser.id, username: newUser.username, role: newUser.role });
});

app.delete('/admin/users/:userId', authMiddleware, adminMiddleware, (req, res) => {
  const data = loadData();
  if (data.users.find(u => u.id === req.params.userId)?.role === 'admin')
    return res.status(400).json({ error: 'Impossible de supprimer un admin' });
  data.users = data.users.filter(u => u.id !== req.params.userId);
  saveData(data);
  res.json({ ok: true });
});

// ─── PC Commands relay ────────────────────────────────────────────────────────
async function reachPc(ip, apiKey, command) {
  const method = command === 'status' ? 'GET' : 'POST';
  const url = `http://${ip}:8085/api/${command}`;
  const response = await fetch(url, {
    method,
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(5000)
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  return { ok: response.ok, status: response.status, data };
}

app.post('/relay/:command', authMiddleware, async (req, res) => {
  const { command } = req.params;
  const { pcId } = req.body;

  const allowedCommands = ['lock', 'shutdown', 'sleep', 'unlock', 'status', 'wake'];
  if (!allowedCommands.includes(command))
    return res.status(400).json({ error: 'Commande non autorisée' });

  const data = loadData();
  const user = data.users.find(u => u.id === req.user.id);
  const pc = user?.pcs.find(p => p.id === pcId);
  if (!pc) return res.status(404).json({ error: 'PC non trouvé dans votre compte' });

  // ── Wake-on-LAN (géré ici, sans contacter l'API PC) ──────────────────────
  if (command === 'wake') {
    if (!pc.mac || pc.mac === '00:00:00:00:00:00')
      return res.status(400).json({ error: 'Adresse MAC non configuree. Modifiez votre PC et ajoutez l\'adresse MAC.' });
    
    const options = {};
    if (pc.wolIp) options.address = pc.wolIp;
    if (pc.wolPort) options.port = parseInt(pc.wolPort, 10);
    else options.port = 9;
    
    wol.wake(pc.mac, options, (err) => {
      if (err) {
        console.error('WOL error:', err);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du paquet Wake-on-LAN' });
      } else {
        res.json({ message: `Paquet Wake-on-LAN envoye a ${pc.mac} ! Le PC devrait demarrer.` });
      }
    });
    return;
  }

  // ── Commandes relayées vers le PC ─────────────────────────────────────────
  try {
    const result = await reachPc(pc.ip, pc.apiKey, command);

    // Cas spécial : unlock retourne 503 si le PC n'est pas verrouillé
    if (command === 'unlock' && result.status === 503) {
      return res.status(200).json({
        message: 'PC deja deverrouille ou pas encore sur l\'ecran de verrouillage. Attendez quelques secondes.'
      });
    }

    res.status(result.status).json(result.data);
  } catch (err) {
    if (err.name === 'TimeoutError')
      res.status(504).json({ error: 'Le PC ne repond pas. Est-il allume ?' });
    else
      res.status(502).json({ error: `Impossible de joindre le PC. Le service tourne-t-il ?` });
  }
});

app.listen(PORT, () => console.log(`RemoteWOL Relay v2 running on port ${PORT}`));
