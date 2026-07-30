import { useState, useEffect } from 'react';
import { Power, Lock, MonitorSmartphone, Settings, Unlock, Fingerprint, Plus, Trash2, Server } from 'lucide-react';
import clsx from 'clsx';
import './index.css';

interface PC {
  id: string;
  name: string;
  ip: string;
  mac: string;
  apiKey: string;
}

function App() {
  const [pcs, setPcs] = useState<PC[]>(() => {
    const saved = localStorage.getItem('pcs');
    return saved ? JSON.parse(saved) : [{ id: '1', name: 'Mon PC Windows', ip: '192.168.1.140', mac: '00:00:00:00:00:00', apiKey: 'WOL-1234-ABCD-SECURE-KEY-2026' }];
  });
  
  const [selectedPcId, setSelectedPcId] = useState<string>(pcs[0]?.id || '');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [pcStatus, setPcStatus] = useState<'online' | 'offline'>('offline');

  const selectedPc = pcs.find(pc => pc.id === selectedPcId);

  useEffect(() => {
    localStorage.setItem('pcs', JSON.stringify(pcs));
  }, [pcs]);

  // Fake ping to check status
  useEffect(() => {
    const interval = setInterval(() => {
      setPcStatus(prev => prev === 'online' ? 'offline' : 'online');
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addPc = () => {
    const newPc: PC = {
      id: Date.now().toString(),
      name: `PC ${pcs.length + 1}`,
      ip: '192.168.1.x',
      mac: '00:00:00:00:00:00',
      apiKey: ''
    };
    setPcs([...pcs, newPc]);
    setSelectedPcId(newPc.id);
  };

  const updatePc = (id: string, field: keyof PC, value: string) => {
    setPcs(pcs.map(pc => pc.id === id ? { ...pc, [field]: value } : pc));
  };

  const deletePc = (id: string) => {
    const filtered = pcs.filter(pc => pc.id !== id);
    setPcs(filtered);
    if (selectedPcId === id && filtered.length > 0) setSelectedPcId(filtered[0].id);
  };

  const sendCommand = async (command: string) => {
    if (!selectedPc) return;
    console.log(`Sending command: ${command} to ${selectedPc.ip}`);
    alert(`Commande "${command}" préparée pour ${selectedPc.name} (${selectedPc.ip}).\nEn réalité, c'est le raccourci iOS qui enverra cette requête.`);
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Remote WOL PC</h1>
          {selectedPc && (
            <div className="status-indicator">
              <span className={clsx('status-dot', pcStatus === 'online' && 'online')}></span>
              {selectedPc.name} - {pcStatus === 'online' ? 'En ligne' : 'Hors ligne'}
            </div>
          )}
        </div>
        <button className="btn btn-icon secondary" onClick={() => setIsConfiguring(!isConfiguring)}>
          <Settings size={20} />
        </button>
      </header>

      {isConfiguring ? (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Configuration des PC</h2>
            <button className="btn btn-icon secondary" onClick={addPc}>
              <Plus size={20} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {pcs.map((pc) => (
              <div key={pc.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={16} /> Paramètres du PC
                  </h3>
                  <button className="btn btn-icon" style={{ color: 'var(--danger-color)', background: 'transparent' }} onClick={() => deletePc(pc.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="input-group">
                  <label className="input-label">Nom du PC</label>
                  <input type="text" className="apple-input" value={pc.name} onChange={(e) => updatePc(pc.id, 'name', e.target.value)} />
                </div>
                
                <div className="input-group">
                  <label className="input-label">Adresse IP Locale</label>
                  <input type="text" className="apple-input" value={pc.ip} onChange={(e) => updatePc(pc.id, 'ip', e.target.value)} />
                </div>
                
                <div className="input-group">
                  <label className="input-label">Adresse MAC (WOL)</label>
                  <input type="text" className="apple-input" value={pc.mac} onChange={(e) => updatePc(pc.id, 'mac', e.target.value)} />
                </div>

                <div className="input-group">
                  <label className="input-label">Clé API (Sécurité)</label>
                  <input type="password" className="apple-input" value={pc.apiKey} onChange={(e) => updatePc(pc.id, 'apiKey', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <button className="btn" style={{ width: '100%', marginTop: '24px' }} onClick={() => setIsConfiguring(false)}>
            Terminer la configuration
          </button>
        </div>
      ) : (
        <>
          {pcs.length > 1 && (
            <div style={{ marginBottom: '24px' }}>
              <select 
                className="apple-input" 
                value={selectedPcId} 
                onChange={(e) => setSelectedPcId(e.target.value)}
                style={{ appearance: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
              >
                {pcs.map(pc => (
                  <option key={pc.id} value={pc.id} style={{ color: 'black' }}>{pc.name} ({pc.ip})</option>
                ))}
              </select>
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
                <span style={{ fontSize: '13px', opacity: 0.6 }}>Configuration des Raccourcis iOS</span>
              </div>
            </div>
            <p style={{ fontSize: '15px' }}>
              Installez le raccourci iOS sur votre iPhone pour {selectedPc?.name || 'ce PC'}. Lors de l'installation, entrez l'adresse IP <strong>{selectedPc?.ip}</strong> et l'adresse MAC <strong>{selectedPc?.mac}</strong>.
            </p>
            <button className="btn secondary" style={{ width: '100%' }} onClick={() => window.open('https://www.icloud.com/shortcuts/', '_blank')}>
              Télécharger le Raccourci iOS
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
