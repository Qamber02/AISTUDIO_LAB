import React, { useState, useEffect } from 'react';
import type { Experiment, ComparisonModel } from '../types';
import { api } from '../api';
import { 
  BarChart3, 
  Trash2, 
  Trophy, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Layers,
  ArrowRight
} from 'lucide-react';

interface ExperimentsStudioProps {
  onSelectStudio: (studio: string) => void;
}

export const ExperimentsStudio: React.FC<ExperimentsStudioProps> = ({
  onSelectStudio,
}) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [comparisonMatrix, setComparisonMatrix] = useState<ComparisonModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchExperiments = () => {
    setIsLoading(true);
    setErrorMsg(null);
    api.getExperiments()
      .then((data) => {
        if (data) {
          setExperiments(Array.isArray(data.experiments) ? data.experiments : []);
          setComparisonMatrix(Array.isArray(data.comparison_matrix) ? data.comparison_matrix : []);
        } else {
          setExperiments([]);
          setComparisonMatrix([]);
        }
      })
      .catch((e) => {
        console.error('Failed to get experiments', e);
        setErrorMsg('Unable to load experiments data.');
        setExperiments([]);
        setComparisonMatrix([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteExperiment(id);
      fetchExperiments();
    } catch (e) {
      console.error('Failed to delete experiment', e);
    }
  };

  // Safe Top Performer calculation
  const topModel = (comparisonMatrix || []).reduce<ComparisonModel | null>((best, cur) => {
    if (!cur) return best;
    const curScore = (typeof cur.accuracy === 'number' && !isNaN(cur.accuracy))
      ? cur.accuracy
      : ((typeof cur.r2 === 'number' && !isNaN(cur.r2)) ? cur.r2 : -1);
    
    const bestScore = best
      ? ((typeof best.accuracy === 'number' && !isNaN(best.accuracy))
          ? best.accuracy
          : ((typeof best.r2 === 'number' && !isNaN(best.r2)) ? best.r2 : -1))
      : -1;

    return curScore > bestScore ? cur : best;
  }, null);

  // Formatting helpers
  const formatHyperparams = (hp: any): string => {
    if (!hp || typeof hp !== 'object') return '—';
    try {
      const entries = Object.entries(hp);
      if (entries.length === 0) return '—';
      return entries
        .slice(0, 3)
        .map(([k, v]) => `${k}:${Array.isArray(v) ? `[${v.join(',')}]` : v}`)
        .join(', ');
    } catch {
      return '—';
    }
  };

  const formatTimestamp = (ts: any): string => {
    if (!ts) return '—';
    try {
      const d = new Date(String(ts).replace(' ', 'T'));
      return isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
    } catch {
      return String(ts);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Experiment Workspace & Model Comparison</h1>
          <span className="badge badge-cyan">{comparisonMatrix.length} Trained Models</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
          Compare performance, training speed, and hyperparameters across up to 10 independent model instances.
        </p>
      </div>

      {errorMsg && (
        <div className="glass-panel" style={{ padding: '12px 18px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '8px', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Top Performer Card if models exist */}
      {topModel && (
        <div className="glass-panel" style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }} className="badge badge-green">
              <Trophy size={13} />
              <span>Workspace Top Performer</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{topModel.name || 'Top Model'}</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Algorithm: <strong style={{ color: '#fff' }}>{(topModel.model_type || '').replace(/_/g, ' ')}</strong> on dataset <strong style={{ color: '#fff' }}>{topModel.dataset_name || 'Dataset'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {typeof topModel.accuracy === 'number' && !isNaN(topModel.accuracy) && (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                  {(topModel.accuracy * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {typeof topModel.r2 === 'number' && !isNaN(topModel.r2) && (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>R² Score</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                  {topModel.r2.toFixed(3)}
                </div>
              </div>
            )}
            {typeof topModel.loss === 'number' && !isNaN(topModel.loss) && (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loss</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {topModel.loss.toFixed(4)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10-Model Side-by-Side Comparison Matrix */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>Workspace Side-by-Side Matrix</h3>

        {comparisonMatrix.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No trained models available in workspace yet. Train models in Training Lab to see side-by-side benchmarks here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px' }}>Model</th>
                  <th style={{ padding: '10px 14px' }}>Algorithm</th>
                  <th style={{ padding: '10px 14px' }}>Dataset</th>
                  <th style={{ padding: '10px 14px' }}>Primary Score</th>
                  <th style={{ padding: '10px 14px' }}>Loss</th>
                  <th style={{ padding: '10px 14px' }}>Total Steps</th>
                  <th style={{ padding: '10px 14px' }}>Hyperparameters</th>
                </tr>
              </thead>
              <tbody>
                {comparisonMatrix.map((m) => {
                  const isTop = topModel?.model_id === m.model_id;
                  const hasAcc = typeof m.accuracy === 'number' && !isNaN(m.accuracy);
                  const hasR2 = typeof m.r2 === 'number' && !isNaN(m.r2);
                  const hasLoss = typeof m.loss === 'number' && !isNaN(m.loss);
                  const hasMse = typeof m.mse === 'number' && !isNaN(m.mse);

                  return (
                    <tr key={m.model_id} style={{ borderBottom: '1px solid var(--border-subtle)', background: isTop ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: isTop ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isTop && <Trophy size={14} color="#10b981" />}
                          <span>{m.name || 'Unnamed Model'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="badge badge-violet">{(m.model_type || '').replace(/_/g, ' ')}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>{m.dataset_name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {hasAcc ? `${(m.accuracy! * 100).toFixed(1)}%` : (hasR2 ? `R² ${m.r2!.toFixed(3)}` : '—')}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
                        {hasLoss ? m.loss!.toFixed(4) : (hasMse ? `MSE ${m.mse!.toFixed(4)}` : '—')}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {m.duration ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {formatHyperparams(m.hyperparameters)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Experiment Run History */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>Experiment Run History ({experiments.length})</h3>

        {experiments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            No recorded experiment runs.
          </div>
        ) : (
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 12px' }}>Timestamp</th>
                  <th style={{ padding: '8px 12px' }}>Model</th>
                  <th style={{ padding: '8px 12px' }}>Dataset</th>
                  <th style={{ padding: '8px 12px' }}>Steps</th>
                  <th style={{ padding: '8px 12px' }}>Duration</th>
                  <th style={{ padding: '8px 12px' }}>Results</th>
                  <th style={{ padding: '8px 12px', width: '50px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp) => {
                  const m = exp.metrics || {};
                  const hasAcc = typeof m.accuracy === 'number' && !isNaN(m.accuracy);
                  const hasR2 = typeof m.r2 === 'number' && !isNaN(m.r2);
                  const hasLoss = typeof m.loss === 'number' && !isNaN(m.loss);

                  return (
                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {formatTimestamp(exp.created_at)}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{exp.model_name || 'Model'}</td>
                      <td style={{ padding: '8px 12px' }}>{exp.dataset_name || 'Dataset'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{exp.total_steps ?? '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{exp.duration_seconds ?? '—'}s</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                        {hasAcc 
                          ? `Acc: ${(m.accuracy! * 100).toFixed(1)}%` 
                          : (hasR2 
                              ? `R²: ${m.r2!.toFixed(3)}` 
                              : (hasLoss 
                                  ? `Loss: ${m.loss!.toFixed(4)}` 
                                  : '—'))}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="btn btn-danger"
                          style={{ padding: '4px', borderRadius: '4px' }}
                          title="Delete run"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
