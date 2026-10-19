import React, { useState } from 'react';
import type { Model, Dataset, ModelType, TaskType } from '../types';
import { api } from '../api';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Copy, 
  Play, 
  Eye, 
  Network, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Binary,
  TreeDeciduous,
  Activity
} from 'lucide-react';

interface ModelStudioProps {
  models: Model[];
  datasets: Dataset[];
  activeModel: Model | null;
  onSelectModel: (model: Model) => void;
  onSelectStudio: (studio: string) => void;
  onRefreshModels: () => void;
}

export const ModelStudio: React.FC<ModelStudioProps> = ({
  models,
  datasets,
  activeModel,
  onSelectModel,
  onSelectStudio,
  onRefreshModels,
}) => {
  const [name, setName] = useState('My Neural Classifier');
  const [description, setDescription] = useState('Inspectable multi-layer perceptron');
  const [modelType, setModelType] = useState<ModelType>('neural_network');
  const [selectedDatasetId, setSelectedDatasetId] = useState(datasets[0]?.id || '');
  
  // Algorithm-specific hyperparams
  const [solverMode, setSolverMode] = useState<'exact' | 'iterative'>('iterative');
  const [regType, setRegType] = useState('ridge');
  const [alpha, setAlpha] = useState(0.01);
  const [cParam, setCParam] = useState(1.0);
  const [maxDepth, setMaxDepth] = useState<number | undefined>(5);
  const [nEstimators, setNEstimators] = useState(30);
  const [nNeighbors, setNNeighbors] = useState(5);
  const [nClusters, setNClusters] = useState(3);
  
  // Neural Net params
  const [hiddenLayers, setHiddenLayers] = useState<number[]>([12, 6]);
  const [activation, setActivation] = useState('relu');
  const [optimizer, setOptimizer] = useState('adam');
  const [learningRate, setLearningRate] = useState(0.01);

  // Common training params
  const [epochs, setEpochs] = useState(100);
  const [batchSize, setBatchSize] = useState(32);
  const [valSplit, setValSplit] = useState(0.15);
  const [scalerType, setScalerType] = useState('standard');

  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected dataset object
  const currentDs = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (models.length >= 10) {
      setErrorMsg('Workspace limit reached (10 models max). Please delete an existing model first.');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');

    // Determine task_type from dataset or model
    const taskType: TaskType = currentDs ? currentDs.task_type : (modelType === 'kmeans' ? 'clustering' : (modelType === 'linear_regression' ? 'regression' : 'classification'));

    // Construct hyperparameters payload
    const hyperparams: Record<string, any> = {
      solver_mode: solverMode,
    };

    if (modelType === 'linear_regression') {
      hyperparams.reg_type = regType;
      hyperparams.alpha = alpha;
      hyperparams.learning_rate = learningRate;
    } else if (modelType === 'logistic_regression') {
      hyperparams.C = cParam;
      hyperparams.learning_rate = learningRate;
    } else if (modelType === 'decision_tree') {
      hyperparams.max_depth = maxDepth;
      hyperparams.min_samples_split = 2;
    } else if (modelType === 'random_forest') {
      hyperparams.n_estimators = nEstimators;
      hyperparams.max_depth = maxDepth;
    } else if (modelType === 'knn') {
      hyperparams.n_neighbors = nNeighbors;
      hyperparams.weights = 'uniform';
    } else if (modelType === 'kmeans') {
      hyperparams.n_clusters = nClusters;
    } else if (modelType === 'neural_network') {
      hyperparams.hidden_layers = hiddenLayers;
      hyperparams.activation = activation;
      hyperparams.optimizer = optimizer;
      hyperparams.learning_rate = learningRate;
    }

    try {
      const newModel = await api.createModel({
        name,
        description,
        model_type: modelType,
        task_type: taskType,
        dataset_id: currentDs?.id,
        hyperparameters: hyperparams,
        training_params: {
          epochs,
          batch_size: batchSize,
          learning_rate: learningRate,
          val_split: valSplit,
          scaler_type: scalerType,
        },
      });
      onRefreshModels();
      onSelectModel(newModel);
      // Reset name for next creation
      setName(`Model #${models.length + 2}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create model');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClone = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const cloned = await api.cloneModel(modelId);
      onRefreshModels();
      onSelectModel(cloned);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this model and its saved artifacts?')) {
      try {
        await api.deleteModel(modelId);
        onRefreshModels();
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Studio Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Model Studio</h1>
            <span className="badge badge-cyan">{models.length} / 10 Models in Workspace</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Configure traditional Scikit-Learn models and inspectable NumPy Neural Networks with transparent parameters.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Split: Model Creator & Active Models Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.2fr) minmax(320px, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* Model Creator Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <Plus size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Create New Model Architecture</h3>
          </div>

          <form onSubmit={handleCreateModel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Model Name & Dataset */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Model Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Training Dataset</label>
                <select
                  className="form-select"
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.task_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Algorithm Selector Cards */}
            <div>
              <label className="form-label">Algorithm Architecture</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                {[
                  { id: 'neural_network', label: 'Neural Network', sub: 'Inspectable MLP' },
                  { id: 'random_forest', label: 'Random Forest', sub: 'warm_start trees' },
                  { id: 'decision_tree', label: 'Decision Tree', sub: 'Interactive SVG' },
                  { id: 'logistic_regression', label: 'Logistic Reg.', sub: 'Exact / SGD' },
                  { id: 'linear_regression', label: 'Linear Reg.', sub: 'OLS / SGD' },
                  { id: 'knn', label: 'K-Nearest N.', sub: 'Dynamic links' },
                  { id: 'kmeans', label: 'K-Means', sub: 'Centroid paths' },
                ].map((algo) => (
                  <button
                    type="button"
                    key={algo.id}
                    onClick={() => setModelType(algo.id as ModelType)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      border: modelType === algo.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      background: modelType === algo.id ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-secondary)',
                      color: modelType === algo.id ? 'var(--accent-cyan)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{algo.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{algo.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Algorithm Hyperparameters */}
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {modelType.replace('_', ' ').toUpperCase()} Hyperparameters
              </div>

              {/* Neural Network Specific Controls */}
              {modelType === 'neural_network' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label className="form-label">Hidden Layers Architecture</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {hiddenLayers.map((size, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>L{idx + 1}:</span>
                          <input
                            type="number"
                            min="2"
                            max="24"
                            value={size}
                            onChange={(e) => {
                              const copy = [...hiddenLayers];
                              copy[idx] = Math.min(24, Math.max(2, parseInt(e.target.value) || 2));
                              setHiddenLayers(copy);
                            }}
                            style={{ width: '45px', padding: '2px 4px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '0.8rem' }}
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>neurons</span>
                          {hiddenLayers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setHiddenLayers(hiddenLayers.filter((_, i) => i !== idx))}
                              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {hiddenLayers.length < 4 && (
                        <button
                          type="button"
                          onClick={() => setHiddenLayers([...hiddenLayers, 8])}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          + Add Layer
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label">Activation Function</label>
                      <select className="form-select" value={activation} onChange={(e) => setActivation(e.target.value)}>
                        <option value="relu">ReLU (Recommended)</option>
                        <option value="tanh">Tanh</option>
                        <option value="sigmoid">Sigmoid</option>
                        <option value="linear">Linear</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Optimizer</label>
                      <select className="form-select" value={optimizer} onChange={(e) => setOptimizer(e.target.value)}>
                        <option value="adam">Adam (Adaptive Momentum)</option>
                        <option value="sgd">SGD (Gradient Descent)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Linear / Logistic Regression Controls */}
              {(modelType === 'linear_regression' || modelType === 'logistic_regression') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="form-label">Optimization Solver Mode</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setSolverMode('iterative')}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: solverMode === 'iterative' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                          background: solverMode === 'iterative' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                          color: solverMode === 'iterative' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        ⚡ Iterative SGD (Live Epoch Loss)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSolverMode('exact')}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: solverMode === 'exact' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                          background: solverMode === 'exact' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                          color: solverMode === 'exact' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        📐 Exact Closed-Form (OLS / L-BFGS)
                      </button>
                    </div>
                  </div>

                  {modelType === 'linear_regression' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label">Regularizer</label>
                        <select className="form-select" value={regType} onChange={(e) => setRegType(e.target.value)}>
                          <option value="ridge">L2 Ridge</option>
                          <option value="lasso">L1 Lasso</option>
                          <option value="ols">None (Ordinary Least Squares)</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Alpha Penalty: {alpha}</label>
                        <input type="range" min="0.0001" max="1.0" step="0.005" value={alpha} onChange={(e) => setAlpha(parseFloat(e.target.value))} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Random Forest Controls */}
              {modelType === 'random_forest' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Number of Estimators (Trees): {nEstimators}</label>
                    <input type="range" min="5" max="80" step="5" value={nEstimators} onChange={(e) => setNEstimators(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <label className="form-label">Max Tree Depth: {maxDepth || 'Unlimited'}</label>
                    <input type="range" min="2" max="15" step="1" value={maxDepth || 5} onChange={(e) => setMaxDepth(parseInt(e.target.value))} />
                  </div>
                </div>
              )}

              {/* Decision Tree Controls */}
              {modelType === 'decision_tree' && (
                <div>
                  <label className="form-label">Max Tree Depth: {maxDepth || 'Unlimited'}</label>
                  <input type="range" min="1" max="12" step="1" value={maxDepth || 4} onChange={(e) => setMaxDepth(parseInt(e.target.value))} />
                </div>
              )}

              {/* KNN Controls */}
              {modelType === 'knn' && (
                <div>
                  <label className="form-label">K Neighbors: {nNeighbors}</label>
                  <input type="range" min="1" max="25" step="1" value={nNeighbors} onChange={(e) => setNNeighbors(parseInt(e.target.value))} />
                </div>
              )}

              {/* K-Means Controls */}
              {modelType === 'kmeans' && (
                <div>
                  <label className="form-label">Clusters (K): {nClusters}</label>
                  <input type="range" min="2" max="8" step="1" value={nClusters} onChange={(e) => setNClusters(parseInt(e.target.value))} />
                </div>
              )}

            </div>

            {/* Training Defaults Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
              <div>
                <label className="form-label">Epochs</label>
                <input type="number" min="5" max="500" className="form-input" value={epochs} onChange={(e) => setEpochs(parseInt(e.target.value) || 100)} />
              </div>
              <div>
                <label className="form-label">Batch Size</label>
                <input type="number" min="8" max="256" className="form-input" value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value) || 32)} />
              </div>
              <div>
                <label className="form-label">Learning Rate</label>
                <input type="number" step="0.001" className="form-input" value={learningRate} onChange={(e) => setLearningRate(parseFloat(e.target.value) || 0.01)} />
              </div>
              <div>
                <label className="form-label">Feature Scaler</label>
                <select className="form-select" value={scalerType} onChange={(e) => setScalerType(e.target.value)}>
                  <option value="standard">StandardScaler</option>
                  <option value="minmax">MinMaxScaler</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating || models.length >= 10}
              className="btn btn-primary"
              style={{ marginTop: '8px' }}
            >
              <Plus size={16} />
              <span>{isCreating ? 'Provisioning Model...' : 'Add Model to Workspace'}</span>
            </button>
          </form>
        </div>

        {/* Workspace Models List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Workspace Models ({models.length}/10)</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Up to 10 active slots</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {models.map((m) => {
              const isSelected = activeModel?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectModel(m)}
                  className="glass-panel"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-glass-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                          {m.name}
                        </h4>
                        <span className={`badge ${m.status === 'trained' ? 'badge-green' : (m.status === 'training' ? 'badge-cyan animate-pulse-glow' : 'badge-amber')}`}>
                          {m.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <span className="badge badge-violet">{m.model_type.replace('_', ' ')}</span>
                        <span className="badge badge-cyan">{m.dataset_name || 'No Dataset'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={(e) => handleClone(m.id, e)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        title="Duplicate model"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(m.id, e)}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        title="Delete model"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Metrics preview if trained */}
                  {m.metrics && Object.keys(m.metrics).length > 0 && (
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', marginTop: '8px' }}>
                      {m.metrics.accuracy !== undefined && <span>Acc: {(m.metrics.accuracy * 100).toFixed(1)}%</span>}
                      {m.metrics.r2 !== undefined && <span>R²: {m.metrics.r2.toFixed(3)}</span>}
                      {m.metrics.loss !== undefined && <span>Loss: {m.metrics.loss.toFixed(4)}</span>}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectModel(m);
                        onSelectStudio('training');
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      <Play size={13} />
                      <span>Train in Lab</span>
                    </button>
                    {m.status === 'trained' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectModel(m);
                          onSelectStudio('visualizer');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        <Network size={13} />
                        <span>Visualizer</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
