import React, { useState, useEffect } from 'react';
import type { Model, Dataset } from '../types';
import { api } from '../api';
import { 
  Sparkles, 
  Play, 
  Download, 
  Copy, 
  Check, 
  BarChart2, 
  Table, 
  Code, 
  Zap, 
  Layers,
  Activity
} from 'lucide-react';

interface ModelPlaygroundProps {
  activeModel: Model | null;
  datasets: Dataset[];
  onSelectStudio: (studio: string) => void;
}

export const ModelPlayground: React.FC<ModelPlaygroundProps> = ({
  activeModel,
  datasets,
  onSelectStudio,
}) => {
  const currentDataset = datasets.find((d) => d.id === activeModel?.dataset_id);

  // Single inference state
  const [featureInputs, setFeatureInputs] = useState<Record<string, number>>({});
  const [predictionResult, setPredictionResult] = useState<{
    prediction: string | number;
    probabilities?: Record<string, number>;
    latency_ms: number;
  } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Batch evaluation state
  const [batchResult, setBatchResult] = useState<{
    metrics: Record<string, number>;
    confusion_matrix?: number[][];
    classes?: string[];
    classification_report?: any;
    predictions_preview?: any[];
  } | null>(null);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);

  // Export code state
  const [exportCode, setExportCode] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);

  // Initialize input fields in raw physical units
  useEffect(() => {
    if (!currentDataset || !activeModel || activeModel.status !== 'trained') return;

    const initialInputs: Record<string, number> = {};
    currentDataset.features.forEach((feat) => {
      const stats = currentDataset.summary_stats?.feature_stats?.[feat];
      initialInputs[feat] = stats ? stats.median : 0.0;
    });
    setFeatureInputs(initialInputs);

    // Fetch export code
    api.getExportCode(activeModel.id)
      .then((res) => setExportCode(res.code))
      .catch((e) => console.error('Failed to get code', e));

    // Auto-run initial prediction
    triggerPrediction(initialInputs);
  }, [activeModel?.id, activeModel?.status]);

  const triggerPrediction = async (inputs: Record<string, number>) => {
    if (!activeModel || activeModel.status !== 'trained') return;
    setIsPredicting(true);
    try {
      const res = await api.predictSingle(activeModel.id, inputs);
      setPredictionResult(res);
    } catch (e) {
      console.error('Failed to predict', e);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleInputChange = (feat: string, val: number) => {
    const updated = { ...featureInputs, [feat]: val };
    setFeatureInputs(updated);
    triggerPrediction(updated);
  };

  const handleRunBatchEvaluation = async () => {
    if (!activeModel) return;
    setIsLoadingBatch(true);
    try {
      const res = await api.batchEvaluate(activeModel.id);
      setBatchResult(res);
    } catch (e) {
      console.error('Failed batch evaluation', e);
    } finally {
      setIsLoadingBatch(false);
    }
  };

  const handleCopyCode = () => {
    if (!exportCode) return;
    navigator.clipboard.writeText(exportCode);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (!activeModel || activeModel.status !== 'trained') {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '30px' }} className="glass-panel">
        <Sparkles size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Model Not Trained Yet</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Please train this model in the Training Lab first before testing live predictions and generating reports.
        </p>
        <button onClick={() => onSelectStudio('training')} className="btn btn-primary">
          Open Training Lab
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Studio Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Model Playground</h1>
            <span className="badge badge-green">Ready for Inference</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Test interactive single-sample predictions with physical raw units, evaluate test splits, and export standalone Python scripts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={api.getDownloadArtifactUrl(activeModel.id)}
            download
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <Download size={15} />
            <span>Download Model Weights</span>
          </a>
        </div>
      </div>

      {/* Main Dual Pane: Interactive Sliders & Live Prediction Gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.2fr) minmax(320px, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* Sliders Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Interactive Input Sliders (Raw Physical Units)</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-scaled via Pipeline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {currentDataset?.features.map((feat) => {
              const stats = currentDataset.summary_stats?.feature_stats?.[feat] || { min: -3, max: 3, mean: 0, median: 0 };
              const currentVal = featureInputs[feat] ?? stats.mean;
              const step = (stats.max - stats.min) / 100 || 0.01;

              return (
                <div key={feat} style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{feat}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        step={step}
                        value={currentVal}
                        onChange={(e) => handleInputChange(feat, parseFloat(e.target.value) || 0)}
                        style={{ width: '80px', padding: '3px 6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--accent-cyan)', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={stats.min}
                    max={stats.max}
                    step={step}
                    value={currentVal}
                    onChange={(e) => handleInputChange(feat, parseFloat(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Min: {stats.min.toFixed(2)}</span>
                    <span>Median: {stats.median.toFixed(2)}</span>
                    <span>Max: {stats.max.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Prediction Output & Probabilities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Real-Time Model Inference</h3>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                Latency: {predictionResult?.latency_ms ?? 0} ms
              </span>
            </div>

            {/* Big Prediction Callout */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
              border: '1px solid var(--border-highlight)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeModel.task_type === 'classification' ? 'Predicted Class Label' : 'Predicted Target Output'}
              </span>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '6px', color: '#ffffff' }} className="gradient-text-cyan">
                {predictionResult?.prediction ?? '—'}
              </div>
            </div>

            {/* Softmax Probability Gauges for Classification */}
            {predictionResult?.probabilities && (
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                  Class Probability Distribution
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(predictionResult.probabilities).map(([cls, prob]) => (
                    <div key={cls}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{cls}</span>
                        <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{(prob * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${prob * 100}%`, background: 'linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Standalone Python Inference Code Snippet */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={16} color="var(--accent-violet)" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Standalone Python Code</h4>
              </div>
              <button
                onClick={handleCopyCode}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {hasCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{hasCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <div style={{ background: '#050811', borderRadius: '8px', padding: '12px', maxHeight: '180px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5, border: '1px solid var(--border-subtle)' }}>
              <pre>{exportCode || '# Generating standalone code snippet...'}</pre>
            </div>
          </div>

        </div>

      </div>

      {/* Batch Test Evaluation & Confusion Matrix Report */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Comprehensive Test Split Evaluation</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Evaluate trained pipeline on unseen test data with Confusion Matrix and classification reports.
            </p>
          </div>
          <button
            onClick={handleRunBatchEvaluation}
            disabled={isLoadingBatch}
            className="btn btn-primary"
            style={{ padding: '8px 16px' }}
          >
            <Play size={15} />
            <span>{isLoadingBatch ? 'Running Evaluation...' : 'Run Test Split Evaluation'}</span>
          </button>
        </div>

        {batchResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Metric Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              {Object.entries(batchResult.metrics).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {typeof v === 'number' ? (k === 'accuracy' ? `${(v * 100).toFixed(1)}%` : v.toFixed(3)) : String(v)}
                  </div>
                </div>
              ))}
            </div>

            {/* Confusion Matrix Heatmap */}
            {batchResult.confusion_matrix && batchResult.classes && (
              <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                  Confusion Matrix Heatmap
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', margin: '0 auto' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>Actual \ Pred</th>
                        {batchResult.classes.map((c) => (
                          <th key={c} style={{ padding: '8px 14px', color: 'var(--accent-cyan)' }}>Class {c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batchResult.confusion_matrix.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--accent-violet)' }}>
                            Class {batchResult.classes?.[rIdx]}
                          </td>
                          {row.map((cell, cIdx) => {
                            const isCorrect = rIdx === cIdx;
                            return (
                              <td
                                key={cIdx}
                                style={{
                                  padding: '12px 18px',
                                  textAlign: 'center',
                                  background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid var(--border-subtle)',
                                  fontWeight: 700,
                                  color: isCorrect ? '#34d399' : '#fca5a5',
                                }}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Predictions Preview Table */}
            {batchResult.predictions_preview && (
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  Sample Predictions on Test Data
                </h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)' }}>
                      <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px 12px' }}>Input Features</th>
                        <th style={{ padding: '8px 12px' }}>Actual</th>
                        <th style={{ padding: '8px 12px' }}>Predicted</th>
                        <th style={{ padding: '8px 12px' }}>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResult.predictions_preview.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>
                            {Object.entries(p.features).map(([k, v]) => `${k}:${v}`).join(', ')}
                          </td>
                          <td style={{ padding: '6px 12px' }}>{p.actual}</td>
                          <td style={{ padding: '6px 12px', fontWeight: 600 }}>{p.predicted}</td>
                          <td style={{ padding: '6px 12px' }}>
                            <span className={`badge ${p.match ? 'badge-green' : 'badge-amber'}`}>
                              {p.match ? 'MATCH' : 'MISMATCH'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
};
