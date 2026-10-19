import React, { useState, useEffect } from 'react';
import type { Dataset } from '../types';
import { api } from '../api';
import { 
  Database, 
  Plus, 
  Upload, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Sliders, 
  Sparkles, 
  BarChart2, 
  Table, 
  FileText,
  AlertCircle
} from 'lucide-react';

interface DatasetStudioProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onRefreshDatasets: () => void;
}

export const DatasetStudio: React.FC<DatasetStudioProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onRefreshDatasets,
}) => {
  // Synthetic generator state
  const [name, setName] = useState('Synthetic Moons');
  const [preset, setPreset] = useState('moons');
  const [taskType, setTaskType] = useState<'classification' | 'regression' | 'clustering'>('classification');
  const [nSamples, setNSamples] = useState(600);
  const [nFeatures, setNFeatures] = useState(2);
  const [noise, setNoise] = useState(0.18);
  const [nClasses, setNClasses] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);

  // CSV upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadTargetCol, setUploadTargetCol] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Preview state
  const [previewData, setPreviewData] = useState<{ total_rows: number; rows: any[]; features: string[]; target_name: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Preset change
  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    if (['moons', 'circles', 'blobs', 'xor'].includes(newPreset)) {
      setTaskType('classification');
      setName(`Synthetic ${newPreset.charAt(0).toUpperCase() + newPreset.slice(1)}`);
      if (newPreset === 'moons' || newPreset === 'circles' || newPreset === 'xor') {
        setNClasses(2);
        setNFeatures(2);
      } else if (newPreset === 'blobs') {
        setNClasses(3);
        setNFeatures(2);
      }
    } else if (['linear', 'polynomial', 'friedman'].includes(newPreset)) {
      setTaskType('regression');
      setName(`Synthetic ${newPreset.charAt(0).toUpperCase() + newPreset.slice(1)} Curve`);
      setNFeatures(newPreset === 'polynomial' ? 1 : 2);
    } else if (newPreset === 'clusters') {
      setTaskType('clustering');
      setName('Synthetic Gaussian Clusters');
      setNClasses(3);
      setNFeatures(2);
    }
  };

  // Generate Synthetic Dataset
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const newDs = await api.createSyntheticDataset({
        name,
        preset,
        task_type: taskType,
        n_samples: nSamples,
        n_features: nFeatures,
        noise,
        n_classes: nClasses,
        random_state: 42,
      });
      onRefreshDatasets();
      onSelectDataset(newDs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate dataset');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle CSV Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      const newDs = await api.uploadCsvDataset(uploadFile, uploadName || undefined, uploadTargetCol || undefined);
      setUploadFile(null);
      setUploadName('');
      setUploadTargetCol('');
      onRefreshDatasets();
      onSelectDataset(newDs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload CSV dataset');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Dataset
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this dataset? Associated models will lose their data reference.')) {
      try {
        await api.deleteDataset(id);
        onRefreshDatasets();
        if (selectedDataset?.id === id) {
          const remaining = datasets.filter((d) => d.id !== id);
          if (remaining.length > 0) onSelectDataset(remaining[0]);
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    }
  };

  // Fetch preview when selected dataset changes
  useEffect(() => {
    if (!selectedDataset) {
      setPreviewData(null);
      return;
    }
    let isMounted = true;
    setIsLoadingPreview(true);
    api.getDatasetPreview(selectedDataset.id, 50)
      .then((data) => {
        if (isMounted) setPreviewData(data);
      })
      .catch((err) => {
        console.error('Failed to preview dataset', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPreview(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedDataset]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Studio Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Dataset Studio</h1>
            <span className="badge badge-cyan">Synthetic Generator & Ingestion</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Generate synthetic datasets with customizable noise, feature counts, and distributions, or upload CSV files.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Creation Split: Synthetic Generator & CSV Upload */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* Synthetic Generator Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Synthetic Data Generator</h3>
          </div>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">Dataset Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Presets */}
            <div>
              <label className="form-label">Preset Distribution</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'moons', label: 'Moons', type: 'classification' },
                  { id: 'circles', label: 'Circles', type: 'classification' },
                  { id: 'blobs', label: 'Blobs', type: 'classification' },
                  { id: 'xor', label: 'XOR', type: 'classification' },
                  { id: 'linear', label: 'Linear', type: 'regression' },
                  { id: 'polynomial', label: 'Polynomial', type: 'regression' },
                  { id: 'friedman', label: 'Friedman', type: 'regression' },
                  { id: 'clusters', label: 'Clusters', type: 'clustering' },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: preset === p.id ? 600 : 400,
                      border: preset === p.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      background: preset === p.id ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
                      color: preset === p.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Samples, Features, Noise, Classes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Samples (N)</label>
                  <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{nSamples}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="50"
                  value={nSamples}
                  onChange={(e) => setNSamples(parseInt(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Features (D)</label>
                  <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{nFeatures}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={nFeatures}
                  onChange={(e) => setNFeatures(parseInt(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Noise Level</label>
                  <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{noise}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.02"
                  value={noise}
                  onChange={(e) => setNoise(parseFloat(e.target.value))}
                />
              </div>

              {taskType !== 'regression' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Classes / Centers</label>
                    <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{nClasses}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="5"
                    step="1"
                    value={nClasses}
                    onChange={(e) => setNClasses(parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="btn btn-primary"
              style={{ marginTop: '8px' }}
            >
              <Sparkles size={16} />
              <span>{isGenerating ? 'Generating Dataset in Python...' : 'Generate Synthetic Dataset'}</span>
            </button>
          </form>
        </div>

        {/* CSV File Upload Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <Upload size={18} color="var(--accent-violet)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Upload CSV Dataset</h3>
          </div>

          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Dataset Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Leave blank to use filename"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Target Column Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 'target', 'label', 'price' (defaults to last column)"
                value={uploadTargetCol}
                onChange={(e) => setUploadTargetCol(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, background: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px' }}>
              ℹ️ Clean formatting: Missing values will be imputed with median/mode. Categorical targets are auto-encoded.
            </div>

            <button
              type="submit"
              disabled={isUploading || !uploadFile}
              className="btn btn-secondary"
              style={{ marginTop: '8px' }}
            >
              <Upload size={16} />
              <span>{isUploading ? 'Parsing & Saving CSV...' : 'Import CSV Dataset'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Datasets Selection Bar */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Available Datasets ({datasets.length})</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {datasets.map((ds) => {
            const isSelected = selectedDataset?.id === ds.id;
            return (
              <div
                key={ds.id}
                onClick={() => onSelectDataset(ds)}
                className="glass-panel"
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-glass-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {ds.name}
                    </h4>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <span className={`badge ${ds.task_type === 'classification' ? 'badge-cyan' : (ds.task_type === 'regression' ? 'badge-violet' : 'badge-amber')}`}>
                        {ds.task_type}
                      </span>
                      <span className="badge badge-green">{ds.source_type}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(ds.id, e)}
                    className="btn btn-danger"
                    style={{ padding: '4px', borderRadius: '6px' }}
                    title="Delete dataset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>{ds.row_count} rows</span>
                  <span>{ds.feature_count} features</span>
                  <span>Target: {ds.target_name || 'None'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Dataset Details & Preview */}
      {selectedDataset && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Table size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Dataset Preview & Summary: {selectedDataset.name}</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-cyan">{selectedDataset.row_count} Total Rows</span>
              <span className="badge badge-violet">{selectedDataset.feature_count} Input Features</span>
            </div>
          </div>

          {/* Statistical Metrics Breakdown */}
          {selectedDataset.summary_stats && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Feature Statistical Summary (Strictly Raw Units)
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 12px' }}>Feature</th>
                      <th style={{ padding: '8px 12px' }}>Min</th>
                      <th style={{ padding: '8px 12px' }}>Mean</th>
                      <th style={{ padding: '8px 12px' }}>Std</th>
                      <th style={{ padding: '8px 12px' }}>Median</th>
                      <th style={{ padding: '8px 12px' }}>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedDataset.summary_stats.feature_stats || {}).map(([feat, s]) => (
                      <tr key={feat} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accent-cyan)' }}>{feat}</td>
                        <td style={{ padding: '8px 12px' }}>{s.min.toFixed(3)}</td>
                        <td style={{ padding: '8px 12px' }}>{s.mean.toFixed(3)}</td>
                        <td style={{ padding: '8px 12px' }}>{s.std.toFixed(3)}</td>
                        <td style={{ padding: '8px 12px' }}>{s.median.toFixed(3)}</td>
                        <td style={{ padding: '8px 12px' }}>{s.max.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Live Data Preview Table */}
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              First 50 Rows Sample
            </h4>
            {isLoadingPreview ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading dataset rows...</div>
            ) : previewData ? (
              <div style={{ maxHeight: '350px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 2 }}>
                    <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 12px', width: '50px' }}>#</th>
                      {previewData.features.map((f) => (
                        <th key={f} style={{ padding: '8px 12px' }}>{f}</th>
                      ))}
                      {previewData.target_name && (
                        <th style={{ padding: '8px 12px', color: 'var(--accent-emerald)' }}>{previewData.target_name} (Target)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        {previewData.features.map((f) => (
                          <td key={f} style={{ padding: '6px 12px' }}>
                            {typeof row[f] === 'number' ? row[f].toFixed(3) : String(row[f])}
                          </td>
                        ))}
                        {previewData.target_name && (
                          <td style={{ padding: '6px 12px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                            {String(row[previewData.target_name])}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

        </div>
      )}

    </div>
  );
};
