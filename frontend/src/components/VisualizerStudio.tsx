import React, { useState, useEffect, useRef } from 'react';
import type { Model, Dataset, BoundarySliceData, TreeNode, KNNQueryData } from '../types';
import { api } from '../api';
import { 
  Network, 
  Layers, 
  Sliders, 
  Eye, 
  Sparkles, 
  Activity, 
  Compass, 
  GitCommit, 
  BarChart2, 
  HelpCircle,
  Play
} from 'lucide-react';

interface VisualizerStudioProps {
  activeModel: Model | null;
  datasets: Dataset[];
  onSelectStudio: (studio: string) => void;
}

export const VisualizerStudio: React.FC<VisualizerStudioProps> = ({
  activeModel,
  datasets,
  onSelectStudio,
}) => {
  // Neural Net state
  const [neuralWeights, setNeuralWeights] = useState<{
    layers: Array<{ layer_index: number; name: string; size: number; biases: number[] }>;
    weight_matrices: number[][][];
  } | null>(null);
  const [hoveredNeuron, setHoveredNeuron] = useState<{ layer: number; index: number; bias: number } | null>(null);
  const [isSimulatingPulse, setIsSimulatingPulse] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Decision Boundary state (D >= 2 Hyperplane Slicing)
  const [featureX, setFeatureX] = useState('');
  const [featureY, setFeatureY] = useState('');
  const [fixedFeatures, setFixedFeatures] = useState<Record<string, number>>({});
  const [boundaryData, setBoundaryData] = useState<BoundarySliceData | null>(null);
  const [isLoadingBoundary, setIsLoadingBoundary] = useState(false);
  const boundaryCanvasRef = useRef<HTMLCanvasElement>(null);

  // Decision Tree state
  const [treeHierarchy, setTreeHierarchy] = useState<TreeNode | null>(null);

  // KNN Dynamic Neighbors state
  const [knnData, setKnnData] = useState<KNNQueryData | null>(null);
  const [knnQueryPoint, setKnnQueryPoint] = useState<Record<string, number>>({});

  // Feature Importances
  const [featureImportances, setFeatureImportances] = useState<Array<{ feature: string; importance: number }>>([]);

  const currentDataset = datasets.find((d) => d.id === activeModel?.dataset_id);
  const isNeuralNet = activeModel?.model_type === 'neural_network';
  const isTreeOrForest = activeModel?.model_type === 'decision_tree' || activeModel?.model_type === 'random_forest';
  const isKNN = activeModel?.model_type === 'knn';

  // Initialize axes and load model visualizations
  useEffect(() => {
    if (!activeModel || activeModel.status !== 'trained') return;

    if (currentDataset && currentDataset.features.length >= 2) {
      setFeatureX(currentDataset.features[0]);
      setFeatureY(currentDataset.features[1]);
      
      // Initialize fixed features for D > 2
      const fixed: Record<string, number> = {};
      currentDataset.features.forEach((f, idx) => {
        if (idx >= 2) {
          fixed[f] = currentDataset.summary_stats?.feature_stats?.[f]?.mean || 0.0;
        }
      });
      setFixedFeatures(fixed);

      // Default KNN query point
      const q: Record<string, number> = {};
      currentDataset.features.forEach((f) => {
        q[f] = currentDataset.summary_stats?.feature_stats?.[f]?.mean || 0.0;
      });
      setKnnQueryPoint(q);
    }

    if (isNeuralNet) {
      api.getNeuralWeights(activeModel.id)
        .then((weights) => setNeuralWeights(weights))
        .catch((e) => console.error('Failed to get neural weights', e));
    } else if (isTreeOrForest) {
      api.getTreeHierarchy(activeModel.id)
        .then((res) => setTreeHierarchy(res.hierarchy))
        .catch((e) => console.error('Failed to get tree hierarchy', e));

      api.getFeatureImportances(activeModel.id)
        .then((res) => setFeatureImportances(res.importances))
        .catch((e) => console.error('Failed to get importances', e));
    } else if (activeModel.model_type === 'random_forest') {
      api.getFeatureImportances(activeModel.id)
        .then((res) => setFeatureImportances(res.importances))
        .catch((e) => console.error('Failed to get importances', e));
    }
  }, [activeModel?.id, activeModel?.status]);

  // Fetch 2D Boundary slice whenever axes or fixed background features change
  useEffect(() => {
    if (!activeModel || activeModel.status !== 'trained' || !featureX || !featureY) return;

    setIsLoadingBoundary(true);
    api.getBoundarySlice(activeModel.id, {
      feature_x: featureX,
      feature_y: featureY,
      resolution: 50,
      fixed_features: fixedFeatures,
    })
      .then((data) => setBoundaryData(data))
      .catch((e) => console.error('Failed to get boundary slice', e))
      .finally(() => setIsLoadingBoundary(false));
  }, [activeModel?.id, featureX, featureY, fixedFeatures]);

  // Render Hybrid Neural Network Canvas Synapses
  useEffect(() => {
    if (!isNeuralNet || !neuralWeights || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const layers = neuralWeights.layers;
    const numLayers = layers.length;
    const layerSpacing = (w - 120) / Math.max(1, numLayers - 1);

    // Calculate node coordinates
    const nodeCoords: Array<Array<{ x: number; y: number }>> = [];
    layers.forEach((layer, lIdx) => {
      const layerNodes = [];
      const x = 60 + lIdx * layerSpacing;
      const count = layer.size;
      const nodeSpacing = (h - 80) / Math.max(1, count - 1);
      for (let nIdx = 0; nIdx < count; nIdx++) {
        const y = count === 1 ? h / 2 : 40 + nIdx * nodeSpacing;
        layerNodes.push({ x, y });
      }
      nodeCoords.push(layerNodes);
    });

    // Draw Synapses
    neuralWeights.weight_matrices.forEach((matrix, lIdx) => {
      const fromNodes = nodeCoords[lIdx];
      const toNodes = nodeCoords[lIdx + 1];

      for (let i = 0; i < fromNodes.length; i++) {
        for (let j = 0; j < toNodes.length; j++) {
          const weight = matrix[i]?.[j] ?? 0;
          const from = fromNodes[i];
          const to = toNodes[j];

          // Determine color & thickness
          const isPositive = weight >= 0;
          const absWeight = Math.abs(weight);
          const alpha = Math.min(0.9, Math.max(0.15, absWeight * 0.8));
          ctx.strokeStyle = isPositive ? `rgba(6, 182, 212, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = Math.min(5, Math.max(0.6, absWeight * 2.2));

          // Highlight hovered connections
          if (hoveredNeuron) {
            const isConn = (hoveredNeuron.layer === lIdx && hoveredNeuron.index === i) ||
                           (hoveredNeuron.layer === lIdx + 1 && hoveredNeuron.index === j);
            if (!isConn) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
              ctx.lineWidth = 0.5;
            } else {
              ctx.strokeStyle = isPositive ? '#22d3ee' : '#f87171';
              ctx.lineWidth = Math.max(2, absWeight * 3);
            }
          }

          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      }
    });

    // Draw Nodes (Circles)
    layers.forEach((layer, lIdx) => {
      const nodes = nodeCoords[lIdx];
      nodes.forEach((node, nIdx) => {
        const isHovered = hoveredNeuron?.layer === lIdx && hoveredNeuron?.index === nIdx;
        const radius = isHovered ? 14 : 10;

        ctx.fillStyle = lIdx === 0 ? '#38bdf8' : (lIdx === layers.length - 1 ? '#10b981' : '#8b5cf6');
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.stroke();

        // Node label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        if (lIdx === 0) {
          ctx.fillText(`x${nIdx + 1}`, node.x - 22, node.y + 3);
        } else if (lIdx === layers.length - 1) {
          ctx.fillText(`y${nIdx + 1}`, node.x + 22, node.y + 3);
        }
      });
    });
  }, [neuralWeights, hoveredNeuron, isNeuralNet]);

  // Render 2D Decision Boundary Canvas
  useEffect(() => {
    if (!boundaryData || !boundaryCanvasRef.current) return;
    const canvas = boundaryCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const xGrid = boundaryData.x_grid;
    const yGrid = boundaryData.y_grid;
    const zMesh = boundaryData.z_mesh;
    const numX = xGrid.length;
    const numY = yGrid.length;
    const cellW = w / numX;
    const cellH = h / numY;

    // Palette for classification classes
    const classColors = [
      'rgba(6, 182, 212, 0.45)',   // Class 0: Cyan
      'rgba(139, 92, 246, 0.45)',  // Class 1: Violet
      'rgba(16, 185, 129, 0.45)',  // Class 2: Emerald
      'rgba(245, 158, 11, 0.45)',  // Class 3: Amber
    ];

    // Render meshgrid cells
    for (let r = 0; r < numY; r++) {
      for (let c = 0; c < numX; c++) {
        const val = zMesh[r]?.[c] ?? 0;
        const color = classColors[Math.abs(Math.round(val)) % classColors.length];
        ctx.fillStyle = color;
        // Invert Y axis for standard cartesian display
        const px = c * cellW;
        const py = h - (r + 1) * cellH;
        ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
      }
    }

    // Helper to map real coordinates to canvas pixels
    const mapX = (x: number) => ((x - boundaryData.x_min) / (boundaryData.x_max - boundaryData.x_min)) * w;
    const mapY = (y: number) => h - ((y - boundaryData.y_min) / (boundaryData.y_max - boundaryData.y_min)) * h;

    // Draw Scatter points
    boundaryData.scatter_samples.forEach((pt) => {
      const px = mapX(pt.x);
      const py = mapY(pt.y);
      const ptColor = pt.label === 0 ? '#38bdf8' : (pt.label === 1 ? '#c084fc' : '#34d399');

      ctx.fillStyle = ptColor;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // If KNN query is active, draw dynamic connecting lines to nearest neighbors!
    if (knnData) {
      const qx = mapX(knnData.query_point[boundaryData.feature_x] || 0);
      const qy = mapY(knnData.query_point[boundaryData.feature_y] || 0);

      // Draw query point
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(qx, qy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw lines to K neighbors
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      knnData.neighbor_points.forEach((nbr, idx) => {
        const nx = mapX(nbr[boundaryData.feature_x]);
        const ny = mapY(nbr[boundaryData.feature_y]);
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }
  }, [boundaryData, knnData]);

  // Dynamic KNN query trigger
  const handleQueryKNN = () => {
    if (!activeModel) return;
    api.queryKNN(activeModel.id, knnQueryPoint, activeModel.hyperparameters?.n_neighbors || 5)
      .then((data) => setKnnData(data))
      .catch((e) => console.error('Failed KNN query', e));
  };

  if (!activeModel || activeModel.status !== 'trained') {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '30px' }} className="glass-panel">
        <Network size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Model Not Trained Yet</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Please train this model in the Training Lab first to inspect its internal connection weights and decision regions.
        </p>
        <button onClick={() => onSelectStudio('training')} className="btn btn-primary">
          Open Training Lab
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Model Visualizer</h1>
            <span className="badge badge-cyan">{activeModel.model_type.replace('_', ' ').toUpperCase()}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Real-time inspection of connection weights, biases, and 2D hyperplane decision manifold slices.
          </p>
        </div>
      </div>

      {/* Main Visualizer Panel */}
      {isNeuralNet && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Inspectable Neural Network Architecture</h3>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#06b6d4' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' }} />
                Positive Weight (+W)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                Negative Weight (-W)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Thickness ∝ |Weight|</span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', overflowX: 'auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '10px' }}>
            <canvas
              ref={canvasRef}
              width={880}
              height={380}
              style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
            />
          </div>

          <div style={{ marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Input Layer: {neuralWeights?.layers[0]?.size || 2} features</span>
            <span>Hidden Layers: {neuralWeights?.layers.slice(1, -1).map((l) => `${l.size}n`).join(' ➜ ')}</span>
            <span>Output: {neuralWeights?.layers[neuralWeights.layers.length - 1]?.size || 1} units</span>
          </div>
        </div>
      )}

      {/* 2D Hyperplane Decision Boundary Slice */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>2D Hyperplane Decision Boundary Slice</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Selected 2 features projected onto cartesian space; background features held at mean values.
            </p>
          </div>

          {/* Feature Axis Selectors */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>X-Axis:</span>
              <select className="form-select" style={{ width: 'auto', padding: '4px 8px' }} value={featureX} onChange={(e) => setFeatureX(e.target.value)}>
                {currentDataset?.features.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Y-Axis:</span>
              <select className="form-select" style={{ width: 'auto', padding: '4px 8px' }} value={featureY} onChange={(e) => setFeatureY(e.target.value)}>
                {currentDataset?.features.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Mini-Sliders for High-Dimensional Slicing (D > 2) */}
        {currentDataset && currentDataset.features.length > 2 && (
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
              High-Dimensional Slicing Controls (D = {currentDataset.features.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {currentDataset.features.filter((f) => f !== featureX && f !== featureY).map((f) => {
                const stats = currentDataset.summary_stats?.feature_stats?.[f] || { min: -3, max: 3, mean: 0 };
                return (
                  <div key={f}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>{f}</span>
                      <span className="font-mono">{(fixedFeatures[f] ?? stats.mean).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={stats.min}
                      max={stats.max}
                      step={(stats.max - stats.min) / 100 || 0.05}
                      value={fixedFeatures[f] ?? stats.mean}
                      onChange={(e) => setFixedFeatures({ ...fixedFeatures, [f]: parseFloat(e.target.value) })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Boundary Canvas */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '640px', margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
          {isLoadingBoundary && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10, color: '#fff', fontSize: '0.85rem' }}>
              Computing decision manifold...
            </div>
          )}
          <canvas
            ref={boundaryCanvasRef}
            width={580}
            height={400}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        {/* KNN Dynamic Query Point Trigger */}
        {isKNN && (
          <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-amber)' }}>
                Dynamic K-Nearest Neighbor Links
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Click 'Query Nearest Neighbors' to draw dynamic connection lines to the exact K nearest points.
              </div>
            </div>
            <button onClick={handleQueryKNN} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              Query Nearest Neighbors
            </button>
          </div>
        )}

      </div>

      {/* Decision Tree Diagram & Feature Importances */}
      {isTreeOrForest && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          
          {/* Tree Node Viewer */}
          {treeHierarchy && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Decision Tree Structure</h3>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '14px', maxHeight: '350px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                <TreeBranch node={treeHierarchy} />
              </div>
            </div>
          )}

          {/* Feature Importances */}
          {featureImportances.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Ranked Feature Importance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {featureImportances.map((fi) => (
                  <div key={fi.feature}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{fi.feature}</span>
                      <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{(fi.importance * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${fi.importance * 100}%`, background: 'linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

// Recursive Tree Component for Decision Trees
const TreeBranch: React.FC<{ node: TreeNode; indent?: number }> = ({ node, indent = 0 }) => {
  const pad = indent * 18;
  if (node.is_leaf) {
    return (
      <div style={{ marginLeft: `${pad}px`, padding: '4px 0', color: 'var(--accent-emerald)' }}>
        🍃 <strong>Leaf</strong> ➜ Prediction: {String(node.prediction)} (samples: {node.samples}, impurity: {node.impurity})
      </div>
    );
  }
  return (
    <div style={{ marginLeft: `${pad}px`, padding: '4px 0' }}>
      <div style={{ color: 'var(--accent-cyan)' }}>
        🌿 Split: <strong>{node.feature}</strong> ≤ {node.threshold} (samples: {node.samples}, impurity: {node.impurity})
      </div>
      {node.left && <TreeBranch node={node.left} indent={indent + 1} />}
      {node.right && <TreeBranch node={node.right} indent={indent + 1} />}
    </div>
  );
};
