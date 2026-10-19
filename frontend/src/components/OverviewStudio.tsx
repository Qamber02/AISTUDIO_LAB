import React from 'react';
import type { Dataset, Model } from '../types';
import { 
  Database, 
  Sliders, 
  Activity, 
  Network, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Layers,
  Cpu,
  Users,
  Shield,
  Crown
} from 'lucide-react';

interface OverviewStudioProps {
  datasets: Dataset[];
  models: Model[];
  onSelectStudio: (studio: string) => void;
  onQuickStart: (templateKey: string) => void;
  isQuickStarting: boolean;
}

export const OverviewStudio: React.FC<OverviewStudioProps> = ({
  datasets,
  models,
  onSelectStudio,
  onQuickStart,
  isQuickStarting,
}) => {
  const trainedCount = models.filter((m) => m.status === 'trained').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
      
      {/* Hero Banner */}
      <div className="glass-panel" style={{
        padding: '36px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(13, 18, 34, 0.9) 0%, rgba(19, 27, 49, 0.7) 100%)',
        border: '1px solid var(--border-highlight)',
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '750px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }} className="badge badge-cyan">
            <Zap size={12} />
            <span>Interactive Machine Learning & Neural Simulation</span>
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '14px', letterSpacing: '-0.02em' }}>
            Build, Train, and Visualize <span className="gradient-text-cyan">Real AI Models</span> in Python
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Create lightweight machine learning models (Linear Regression, Logistic Regression, Decision Trees, Random Forests, KNN, K-Means, and Neural Networks). Generate synthetic datasets, monitor training telemetry live, inspect connection weights, and test predictions on raw physical data.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onSelectStudio('dataset')}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.95rem' }}
            >
              <Database size={16} />
              <span>Explore Dataset Studio</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onSelectStudio('model')}
              className="btn btn-secondary"
              style={{ padding: '10px 20px', fontSize: '0.95rem' }}
            >
              <Sliders size={16} />
              <span>Configure AI Models</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datasets Available</span>
            <Database size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{datasets.length}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Synthetic & CSV uploads</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Models</span>
            <Sliders size={18} color="var(--accent-violet)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>
            {models.length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Workspace slots occupied</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trained Models</span>
            <CheckCircle2 size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{trainedCount}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Ready for inference & visualizer</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compute Runtime</span>
            <Cpu size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>FastAPI + CPU</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }}></span>
            Engine Online
          </p>
        </div>
      </div>

      {/* 1-Click Quick-Start Templates */}
      <div>
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Quick-Start Experiment Templates</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Launch an end-to-end dataset & model configuration in one click</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          
          {/* Template 1 */}
          <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="badge badge-cyan">Neural Network (MLP)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Classification</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Non-Linear Moons Classifier</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                Train a 2-layer NumPy neural network [2, 12, 6, 2] on the classic two-moons non-linear benchmark. Watch connection weights and decision boundary contours converge live.
              </p>
            </div>
            <button
              onClick={() => onQuickStart('moons_nn')}
              disabled={isQuickStarting || models.length >= 10}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <Zap size={15} />
              <span>Launch Moons Neural Net</span>
            </button>
          </div>

          {/* Template 2 */}
          <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="badge badge-violet">Linear Regression</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Regression</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Iterative SGD Curve Fitter</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                Compare closed-form OLS vs iterative Stochastic Gradient Descent (SGD) on noisy continuous features. Watch loss decrease epoch-by-epoch.
              </p>
            </div>
            <button
              onClick={() => onQuickStart('linear_sgd')}
              disabled={isQuickStarting || models.length >= 10}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              <Zap size={15} />
              <span>Launch SGD Linear Model</span>
            </button>
          </div>

          {/* Template 3 */}
          <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="badge badge-green">Random Forest</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Classification</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Incremental Tree Ensemble</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                Grow a Random Forest tree-by-tree in real-time with warm_start. Inspect feature importance rankings and tree depth distributions.
              </p>
            </div>
            <button
              onClick={() => onQuickStart('random_forest_blobs')}
              disabled={isQuickStarting || models.length >= 10}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              <Zap size={15} />
              <span>Launch Random Forest</span>
            </button>
          </div>

        </div>
      </div>

      {/* Featured Studio 9: AI Society Simulation */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        <div style={{ maxWidth: '720px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-violet" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Users size={12} />
              <span>Studio 9 • Autonomous AI Society</span>
            </span>
            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Crown size={12} />
              <span>Democratic Governance</span>
            </span>
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }}>
            10 Autonomous Citizens with Unique Personalities, Fictional Weapons & Democratic Politics
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Each model algorithm becomes a living AI citizen: Nova the Perceptron, Silas the Tree Warden, Pax the Centroid, and more. They gather resources, craft sci-fi armaments (Singularity Orbs, Plasma Blades, Quantum Staves), pass laws in the Council Chamber, and learn from experience via online reinforcement learning.
          </p>
        </div>
        <button
          onClick={() => onSelectStudio('society')}
          className="btn btn-primary"
          style={{
            padding: '12px 24px',
            fontSize: '0.95rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
          }}
        >
          <Users size={18} />
          <span>Enter Society Studio</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Guided 5-Step Workflow Cards */}
      <div>
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>The 5-Step Workflow</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Follow the step-by-step pipeline from raw data to deployed model</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {[
            { step: '1', title: 'Dataset Studio', desc: 'Generate synthetic datasets (Moons, Circles, Blobs) or upload CSV files. View stats and split ratios.', id: 'dataset', icon: Database },
            { step: '2', title: 'Model Studio', desc: 'Configure 7 algorithms (Linear, Trees, Forests, KNN, K-Means, Neural Nets) with hyperparameters.', id: 'model', icon: Sliders },
            { step: '3', title: 'Training Lab', desc: 'Stream real-time loss and accuracy curves over WebSockets with live Pause/Resume/Stop controls.', id: 'training', icon: Activity },
            { step: '4', title: 'Visualizer', desc: 'Inspect live synaptic weights, forward pulses, 2D decision boundaries, and tree split nodes.', id: 'visualizer', icon: Network },
            { step: '5', title: 'Playground', desc: 'Test live predictions using raw-unit sliders, inspect confusion matrices, and export Python code.', id: 'playground', icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="glass-panel"
                onClick={() => onSelectStudio(item.id)}
                style={{ padding: '18px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-highlight)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--accent-cyan)',
                  }}>
                    {item.step}
                  </span>
                  <Icon size={16} color="var(--text-muted)" />
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>{item.title}</h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
