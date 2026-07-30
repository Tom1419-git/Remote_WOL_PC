import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Power, Lock, MonitorSmartphone, Plus, Trash2, Server, LogOut, Shield, Eye, EyeOff, RefreshCw } from 'lucide-react';
import './index.css';

const API = '';  // same origin via nginx proxy

// ─── Types ────────────────────────────────────────────────────────────────────
interface PC {
  id: string;
  name: string;
  mac: string;
  ip: string;
  apiKey: string;
  wolIp?: string;
  wolPort?: string;
}
interface User { id: string; username: string; role: string; pcs: PC[]; }
interface AuthCtxType {
  user: User | null; token: string | null;
  login: (u: User, t: string) => void; logout: () => void;
}

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthCtxType>({ user: null, token: null, login: () => {}, logout: () => {} });
function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('rwol_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rwol_token'));

  const login = (u: User, t: string) => {
    setUser(u); setToken(t);
    localStorage.setItem('rwol_user', JSON.stringify(u));
    localStorage.setItem('rwol_token', t);
  };
  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('rwol_user'); localStorage.removeItem('rwol_token');
  };
  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

// ─── API helper ───────────────────────────────────────────────────────────────
function useApi() {
  const { token, logout } = useAuth();
  return useCallback(async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    if (res.status === 401) { logout(); throw new Error('Session expirée'); }
    return res;
  }, [token, logout]);
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion');
      login(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ justifyContent: 'center' }}>
      <div style={{ textAlign: 'left', marginBottom: '40px' }}>
        <h1 style={{ margin: 0 }}>Hey,<br/>Welcome<br/>Back</h1>
        <p className="subtitle" style={{ marginTop: '12px' }}>Sign in to RemoteWOL</p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="input-wrapper">
          <span className="input-icon"><Shield size={20} /></span>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" autoComplete="username" required />
        </div>
        <div className="input-wrapper">
          <span className="input-icon"><Lock size={20} /></span>
          <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required />
          <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        
        {error && <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: 'var(--danger-color)', marginBottom: '16px' }}>{error}</div>}
        
        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '24px' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}



// ─── PC Dashboard (Refactored PCCard) ───────────────────────────────────────────
function PCCard({ pc, onDelete, onEdit }: { pc: PC; onDelete: (id: string) => void; onEdit: (pc: PC) => void }) {
  const callApi = useApi();
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const checkStatus = useCallback(async () => {
    setStatus('checking');
    try {
      const res = await callApi(`/relay/status`, { method: 'POST', body: JSON.stringify({ pcId: pc.id }) });
      setStatus(res.ok ? 'online' : 'offline');
    } catch { setStatus('offline'); }
  }, [pc.id, callApi]);

  useEffect(() => { checkStatus(); const t = setInterval(checkStatus, 15000); return () => clearInterval(t); }, [checkStatus]);

  const sendCommand = async (cmd: string) => {
    setActionLoading(cmd); setFeedback(null);
    try {
      const endpoint = cmd === 'wake' ? '/relay/wake' : `/relay/${cmd}`;
      const res = await callApi(endpoint, { method: 'POST', body: JSON.stringify({ pcId: pc.id }) });
      const data = await res.json();
      if (res.ok) {
        const labels: Record<string, string> = { lock: '🔒 Locked', shutdown: '⚡ Shutting down', sleep: '😴 Sleeping', unlock: '🔓 Unlocked', wake: '🟢 WOL sent' };
        setFeedback({ msg: labels[cmd] || '✅ OK', ok: true });
        if (cmd === 'lock' || cmd === 'unlock') setTimeout(checkStatus, 3000);
      } else {
        setFeedback({ msg: data.error || 'Erreur inconnue', ok: false });
      }
    } catch (err: any) {
      setFeedback({ msg: err.message || 'Impossible de contacter le relay', ok: false });
    } finally {
      setActionLoading(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const actions = [
    { cmd: 'wake', icon: <Power size={24} />, label: 'Wake', color: '#ffffff' },
    { cmd: 'lock', icon: <Lock size={24} />, label: 'Lock', color: '#ffffff' },
    { cmd: 'shutdown', icon: <MonitorSmartphone size={24} />, label: 'Shutdown', color: '#ff3b30' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-color)' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} /> {pc.name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <span className={`status-dot status-${status}`} />
            {status === 'online' ? 'Online' : status === 'checking' ? 'Checking...' : 'Offline'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={checkStatus} style={{ background: 'var(--surface-light)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => onEdit(pc)} style={{ background: 'rgba(255,149,0,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FF9500' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button onClick={() => onDelete(pc.id)} style={{ background: 'rgba(255,59,48,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger-color)' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
      <div className="dashboard-grid" style={{ marginTop: '0' }}>
        {actions.map(({ cmd, icon, label, color }) => (
          <div key={cmd} className="card card-action" onClick={() => sendCommand(cmd)} style={{ opacity: actionLoading && actionLoading !== cmd ? 0.5 : 1 }}>
            <div className="card-icon-wrapper" style={{ color: color }}>
              {actionLoading === cmd ? <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
            </div>
            <div>
              <div className="card-title">{label}</div>
              <div className="card-status">{cmd === 'wake' ? 'Send packet' : 'Relay to PC'}</div>
            </div>
          </div>
        ))}
      </div>
      
      {feedback && (
        <div className="feedback-toast">
          {feedback.msg}
        </div>
      )}
    </div>
  );
}

// ─── PC Modal ─────────────────────────────────────────────────────────────
function PCModal({ onSave, onClose, pcToEdit }: { onSave: (pc: PC) => void; onClose: () => void; pcToEdit?: PC | null }) {
  const callApi = useApi();
  const [form, setForm] = useState(pcToEdit ? { ...pcToEdit } : { name: '', ip: '', mac: '', apiKey: 'WOL-1234-ABCD-SECURE-KEY-2026', wolIp: '', wolPort: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const url = pcToEdit ? `/pcs/${pcToEdit.id}` : '/pcs';
      const method = pcToEdit ? 'PUT' : 'POST';
      const res = await callApi(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSave(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, padding: '0' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', borderRadius: '24px 24px 0 0', borderBottom: 'none', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '20px' }}>{pcToEdit ? 'Edit PC' : 'Add PC'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'PC Name', key: 'name', placeholder: 'ex: My Desktop', required: true },
            { label: 'Local IP Address', key: 'ip', placeholder: 'ex: 192.168.1.140', required: true },
            { label: 'MAC Address', key: 'mac', placeholder: 'ex: AA:BB:CC:DD:EE:FF', required: true },
            { label: 'API Key', key: 'apiKey', placeholder: 'WOL-1234-ABCD-SECURE-KEY-2026', required: true },
            { label: 'Public IP / Router IP (Optional - for remote WOL)', key: 'wolIp', placeholder: 'ex: 82.123.X.X', required: false },
            { label: 'WOL Port (Optional)', key: 'wolPort', placeholder: 'ex: 9', required: false },
          ].map(({ label, key, placeholder, required }) => (
            <div key={key}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>{label}</label>
              <input className="input" style={{ paddingLeft: '20px' }} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} required={required} />
            </div>
          ))}
          {error && <div style={{ color: 'var(--danger-color)', fontSize: '13px' }}>{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Saving...' : (pcToEdit ? 'Save Changes' : 'Add PC')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ onBack }: { onBack: () => void }) {
  const callApi = useApi();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [addError, setAddError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await callApi('/admin/users');
      setUsers(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault(); setAddError('');
    try {
      const res = await callApi('/admin/users', { method: 'POST', body: JSON.stringify(newUser) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewUser({ username: '', password: '', role: 'user' });
      setShowAdd(false);
      fetchUsers();
    } catch (err: any) { setAddError(err.message); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await callApi(`/admin/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>← Back</button>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}><Shield size={20} /> Admin Panel</h2>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Users ({users.length})</h3>
          <button className="btn-secondary" onClick={() => setShowAdd(!showAdd)} style={{ padding: '8px 16px', fontSize: '13px', width: 'auto' }}>
            <Plus size={15} /> Create
          </button>
        </div>

        {showAdd && (
          <form onSubmit={addUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', padding: '16px', background: 'var(--surface-light)', borderRadius: 'var(--radius-card)' }}>
            <input className="input" style={{ paddingLeft: '20px' }} placeholder="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
            <input className="input" style={{ paddingLeft: '20px' }} placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
            <select className="input" style={{ paddingLeft: '20px' }} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            {addError && <div style={{ color: 'var(--danger-color)', fontSize: '13px' }}>{addError}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn-primary" type="submit" style={{ flex: 1 }}>Create</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Loading...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--surface-light)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                    {u.username}
                    {u.role === 'admin' && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>ADMIN</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{u.pcCount} PC(s)</div>
                </div>
                {u.role !== 'admin' && (
                  <button onClick={() => deleteUser(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { user, logout } = useAuth();
  const callApi = useApi();
  const [pcs, setPcs] = useState<PC[]>(user?.pcs || []);
  const [showAddPC, setShowAddPC] = useState(false);
  const [pcToEdit, setPcToEdit] = useState<PC | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedPC, setSelectedPC] = useState<PC | null>(pcs.length > 0 ? pcs[0] : null);

  const deletePC = async (id: string) => {
    if (!confirm('Supprimer ce PC ?')) return;
    await callApi(`/pcs/${id}`, { method: 'DELETE' });
    const newPcs = pcs.filter(p => p.id !== id);
    setPcs(newPcs);
    if (selectedPC?.id === id) setSelectedPC(newPcs.length > 0 ? newPcs[0] : null);
  };

  const handleSavePC = (savedPc: PC) => {
    if (pcToEdit) {
      setPcs(pcs.map(p => p.id === savedPc.id ? savedPc : p));
      if (selectedPC?.id === savedPc.id) setSelectedPC(savedPc);
    } else {
      setPcs([...pcs, savedPc]);
      setSelectedPC(savedPc);
    }
    setShowAddPC(false);
    setPcToEdit(null);
  };

  if (showAdmin) return <div className="container"><AdminPanel onBack={() => setShowAdmin(false)} /></div>;

  return (
    <div className="container" style={{ padding: '24px 24px 100px 24px', minHeight: '100vh', overflowY: 'auto' }}>
      
      <div className="profile-header">
        <div className="profile-info">
          <h2 style={{ margin: 0, fontSize: '28px' }}>Hello, {user?.username}</h2>
          <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>What you want do today?</span>
        </div>
        <div className="avatar">
          {user?.username.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="input-wrapper" style={{ marginTop: '16px' }}>
        <span className="input-icon"><Server size={20} /></span>
        <input className="input" placeholder="Search for PCs" />
      </div>

      <div className="category-pills">
        {pcs.map((pc) => (
          <div key={pc.id} className={`pill ${selectedPC?.id === pc.id ? 'active' : ''}`} onClick={() => setSelectedPC(pc)}>
            {pc.name}
          </div>
        ))}
        <div className="pill" onClick={() => setShowAddPC(true)} style={{ borderStyle: 'dashed' }}>
          + Add PC
        </div>
      </div>

      {pcs.length === 0 ? (
        <div className="card" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Server size={48} style={{ color: 'var(--border-strong)', marginBottom: '16px' }} />
          <div className="card-title">No PCs Configured</div>
          <div className="card-status" style={{ textAlign: 'center', marginBottom: '24px' }}>Add your first PC to control it remotely.</div>
          <button className="btn-primary" onClick={() => setShowAddPC(true)}>+ Add PC</button>
        </div>
      ) : (
        selectedPC && <PCCard pc={selectedPC} onDelete={deletePC} onEdit={(pc) => { setPcToEdit(pc); setShowAddPC(true); }} />
      )}

      {showAddPC && <PCModal pcToEdit={pcToEdit} onSave={handleSavePC} onClose={() => { setShowAddPC(false); setPcToEdit(null); }} />}

      <div className="bottom-nav-wrapper">
        <div className="bottom-nav">
          <div className="nav-item active"><Shield size={24} onClick={() => user?.role === 'admin' && setShowAdmin(true)} style={{ color: user?.role === 'admin' ? 'inherit' : 'var(--border-subtle)' }} /></div>
          <div className="nav-item"><MonitorSmartphone size={24} style={{ color: 'var(--text-primary)' }} /></div>
          <div className="nav-item"><LogOut size={24} onClick={logout} /></div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function AppContent() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
