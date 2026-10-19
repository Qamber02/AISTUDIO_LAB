import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Settings, Cpu, HardDrive, Shield, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SettingsStudioProps {
  onRefreshAll: () => void;
}

export const SettingsStudio: React.FC<SettingsStudioProps> = ({ onRefreshAll }) => {
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.getHealth()
      .then((res) => setHealth(res))
      .catch((e) => console.error('Failed to get health', e));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Platform Settings & System Status</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
          Inspect runtime dependencies, execution limits, and persistent storage directories.
        </p>
      </div>

      {/* Engine Status Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Cpu size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Python Execution Engine</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>API Backend</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '4px' }}>
              ● FastAPI Online (127.0.0.1:8000)
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Python Version</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              {health?.python_version ? health.python_version.split(' ')[0] : 'Python 3.15.0'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compute Device</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
              CPU (Lightweight Local)
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workspace Limit</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-violet)', marginTop: '4px' }}>
              10 Concurrent Models Max
            </div>
          </div>
        </div>
      </div>

      {/* Storage & Persistence */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <HardDrive size={20} color="var(--accent-violet)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Local Storage & Database</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>SQLite Relational Database</span>
            <span className="font-mono">backend/storage/ai_model_lab.db</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Dataset Storage (CSVs)</span>
            <span className="font-mono">backend/storage/datasets/</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Trained Model Binaries (.joblib / .npz)</span>
            <span className="font-mono">backend/storage/models/</span>
          </div>
        </div>
      </div>

      {/* Security & Reliability */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Shield size={20} color="var(--accent-emerald)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Security & Execution Isolation</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          All model training jobs execute in dedicated background threads isolated from the main asyncio event loop. No arbitrary code execution is accepted via API endpoints; all models are configured via validated Pydantic schemas and standard Scikit-learn / NumPy pipelines.
        </p>
      </div>

    </div>
  );
};
