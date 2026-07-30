import { useState, useEffect } from 'react';
import { Power, Lock, MonitorSmartphone, Settings, Unlock, Fingerprint } from 'lucide-react';
import clsx from 'clsx';
import './index.css';

function App() {
  const [pcStatus, setPcStatus] = useState<'online' | 'offline'>('offline');
  const [ipAddress, setIpAddress] = useState('192.168.1.50');
  const [macAddress, setMacAddress] = useState('00:1A:2B:3C:4D:5E');
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Fake ping to check status
  useEffect(() => {
    // In a real app, this would ping the local API
    const interval = setInterval(() => {
      setPcStatus(prev => prev === 'online' ? 'offline' : 'online');
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendCommand = async (command: string) => {
    console.log(`Sending command: ${command} to ${ipAddress}`);
    // This will be replaced by actual local API calls or triggering shortcuts
    alert(`Command ${command} prepared for ${ipAddress}`);
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Mon PC</h1>
          <div className="status-indicator">
            <span className={clsx('status-dot', pcStatus === 'online' && 'online')}></span>
            {pcStatus === 'online' ? 'En ligne' : 'Hors ligne'}
          </div>
        </div>
        <button className="btn btn-icon secondary" onClick={() => setIsConfiguring(!isConfiguring)}>
          <Settings size={20} />
        </button>
      </header>

      {isConfiguring && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <h2>Configuration</h2>
          <p>Ces informations seront utilisées par les Raccourcis iOS pour envoyer les commandes sur votre réseau local.</p>
          
          <div className="input-group">
            <label className="input-label">Adresse IP Locale (PC)</label>
            <input 
              type="text" 
              className="apple-input" 
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="ex: 192.168.1.50"
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Adresse MAC (Wake-on-LAN)</label>
            <input 
              type="text" 
              className="apple-input" 
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              placeholder="ex: 00:1A:2B:3C:4D:5E"
            />
          </div>

          <button className="btn" style={{ width: '100%', marginTop: '16px' }} onClick={() => setIsConfiguring(false)}>
            Enregistrer
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <button className="glass-card btn-action" onClick={() => sendCommand('wake')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          <div style={{ padding: '16px', background: 'var(--success-color)', borderRadius: '50%', color: 'white' }}>
            <Power size={28} />
          </div>
          <span style={{ fontWeight: 600 }}>Allumer</span>
        </button>

        <button className="glass-card btn-action" onClick={() => sendCommand('shutdown')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          <div style={{ padding: '16px', background: 'var(--danger-color)', borderRadius: '50%', color: 'white' }}>
            <MonitorSmartphone size={28} />
          </div>
          <span style={{ fontWeight: 600 }}>Éteindre</span>
        </button>

        <button className="glass-card btn-action" onClick={() => sendCommand('lock')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          <div style={{ padding: '16px', background: 'var(--accent-color)', borderRadius: '50%', color: 'white' }}>
            <Lock size={28} />
          </div>
          <span style={{ fontWeight: 600 }}>Verrouiller</span>
        </button>

        <button className="glass-card btn-action" onClick={() => sendCommand('unlock')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          <div style={{ padding: '16px', background: 'rgba(120, 120, 128, 0.32)', borderRadius: '50%', color: 'var(--accent-color)' }}>
            <Unlock size={28} />
          </div>
          <span style={{ fontWeight: 600 }}>Déverrouiller</span>
        </button>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--accent-color)', borderRadius: '12px', color: 'white' }}>
            <Fingerprint size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px' }}>Déverrouillage Face ID</h3>
            <span style={{ fontSize: '13px', opacity: 0.6 }}>Configuration des Raccourcis</span>
          </div>
        </div>
        <p style={{ fontSize: '15px' }}>
          Pour que Face ID fonctionne, vous devez installer le Raccourci iOS natif qui communiquera de manière sécurisée avec votre PC.
        </p>
        <button className="btn secondary" style={{ width: '100%' }}>
          Installer le Raccourci iOS
        </button>
      </div>

    </div>
  );
}

export default App;
