import React, { useState, useEffect, useRef } from 'react';
import type { Model, Dataset, TrainingTick } from '../types';
import { api } from '../api';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Activity, 
  Clock, 
  Zap, 
  Network, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface TrainingLabProps {
  activeModel: Model | null;
  models: Model[];
  datasets: Dataset[];
  onSelectModel: (model: Model) => void;
  onSelectStudio: (studio: string) => void;
  onRefreshModels: () => void;
}

export const TrainingLab: React.FC<TrainingLabProps> = ({
  activeModel,
  models,
  datasets,
  onSelectModel,
  onSelectStudio,
  onRefreshModels,
}) => {
  const [sessionStatus, setSessionStatus] = useState<string>(activeModel?.status || 'untrained');
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(activeModel?.training_params?.epochs || 100);
  const [progressPct, setProgressPct] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live Metric Arrays for Charts
  const [lossHistory, setLossHistory] = useState<Array<{ step: number; train_loss: number; val_loss: number }>>([]);
  const [metricHistory, setMetricHistory] = useState<Array<{ step: number; train_metric: number; val_metric: number }>>([]);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, number>>({});

  // Terminal Logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // Canvas Refs for Charts
  const lossCanvasRef = useRef<HTMLCanvasElement>(null);
  const metricCanvasRef = useRef<HTMLCanvasElement>(null);

  // Selected dataset for active model
  const currentDataset = datasets.find((d) => d.id === activeModel?.dataset_id);

  // Initialize or connect WebSocket when activeModel changes
  useEffect(() => {
    if (!activeModel) return;

    setSessionStatus(activeModel.status);
    setCurrentStep(activeModel.current_step || 0);
    setTotalSteps(activeModel.total_steps || activeModel.training_params?.epochs || 100);
    setProgressPct(activeModel.progress || 0);
    if (activeModel.metrics) {
      setLatestMetrics(activeModel.metrics);
    }

    // Connect WebSocket
    const ws = api.connectTrainingWebSocket(
      activeModel.id,
      (tick: TrainingTick) => {
        handleIncomingTick(tick);
      },
      () => {
        // ws open
      },
      () => {
        // ws close
      }
    );
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [activeModel?.id]);

  const handleIncomingTick = (tick: TrainingTick) => {
    setCurrentStep(tick.step);
    setTotalSteps(tick.total_steps);
    setProgressPct(tick.progress_pct);
    setElapsedSeconds(tick.elapsed_seconds);
    setSessionStatus(tick.status);

    if (tick.metrics) {
      setLatestMetrics(tick.metrics);

      // Update loss chart history
      if (tick.metrics.train_loss !== undefined) {
        setLossHistory((prev) => [
          ...prev,
          {
            step: tick.step,
            train_loss: tick.metrics.train_loss || 0,
            val_loss: tick.metrics.val_loss || 0,
          },
        ]);
      }

      // Update metric chart history
      if (tick.metrics.val_metric !== undefined) {
        setMetricHistory((prev) => [
          ...prev,
          {
            step: tick.step,
            train_metric: tick.metrics.train_metric || 0,
            val_metric: tick.metrics.val_metric || 0,
          },
        ]);
      }
    }

    if (tick.log_message) {
      setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${tick.log_message}`]);
    }

    if (tick.status === 'trained' || tick.status === 'failed') {
      onRefreshModels();
    }
  };

  // Autoscroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Redraw Loss Chart on canvas
  useEffect(() => {
    const canvas = lossCanvasRef.current;
    if (!canvas || lossHistory.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 40;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Determine max and min loss
    const allVals = lossHistory.flatMap((d) => [d.train_loss, d.val_loss]).filter((v) => !isNaN(v));
    const maxVal = Math.max(0.1, ...allVals) * 1.05;
    const minVal = Math.max(0, Math.min(0, ...allVals));

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      const labelVal = (maxVal - (maxVal - minVal) * (i / 4)).toFixed(3);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(labelVal, 4, y + 3);
    }

    // Helper to map data point to pixel
    const getX = (idx: number) => padLeft + (idx / Math.max(1, lossHistory.length - 1)) * plotW;
    const getY = (val: number) => padTop + plotH - ((val - minVal) / Math.max(0.0001, maxVal - minVal)) * plotH;

    // Draw Train Loss (Cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    lossHistory.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.train_loss);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Val Loss (Amber/Violet)
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    lossHistory.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.val_loss);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [lossHistory]);

  // Redraw Metric Chart on canvas
  useEffect(() => {
    const canvas = metricCanvasRef.current;
    if (!canvas || metricHistory.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 40;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const allVals = metricHistory.flatMap((d) => [d.train_metric, d.val_metric]).filter((v) => !isNaN(v));
    const maxVal = Math.min(1.0, Math.max(0.2, ...allVals) * 1.05);
    const minVal = Math.max(0.0, Math.min(...allVals) * 0.95);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      const labelVal = (maxVal - (maxVal - minVal) * (i / 4)).toFixed(2);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(labelVal, 6, y + 3);
    }

    const getX = (idx: number) => padLeft + (idx / Math.max(1, metricHistory.length - 1)) * plotW;
    const getY = (val: number) => padTop + plotH - ((val - minVal) / Math.max(0.0001, maxVal - minVal)) * plotH;

    // Draw Train Metric (Blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    metricHistory.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.train_metric);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Val Metric (Emerald)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    metricHistory.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.val_metric);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [metricHistory]);

  // Actions
  const handleStartTraining = async () => {
    if (!activeModel) return;
    setLossHistory([]);
    setMetricHistory([]);
    setTerminalLogs([`[${new Date().toLocaleTimeString()}] Initializing training session on CPU...`]);
    setSessionStatus('training');
    try {
      await api.startTraining(activeModel.id, {
        epochs: activeModel.training_params?.epochs || 100,
        batch_size: activeModel.training_params?.batch_size || 32,
        learning_rate: activeModel.training_params?.learning_rate || 0.01,
        test_split: activeModel.training_params?.test_split || 0.2,
        val_split: activeModel.training_params?.val_split || 0.15,
        scaler_type: activeModel.training_params?.scaler_type || 'standard',
      });
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERROR] ${err.message}`]);
      setSessionStatus('failed');
    }
  };

  const handlePause = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'pause' }));
    }
    setSessionStatus('paused');
  };

  const handleResume = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'resume' }));
    }
    setSessionStatus('training');
  };

  const handleStop = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }));
    }
    setSessionStatus('stopped');
  };

  if (!activeModel) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '30px' }} className="glass-panel">
        <Activity size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No Model Selected for Training</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Select or create an AI model in Model Studio first to monitor training telemetry here.
        </p>
        <button onClick={() => onSelectStudio('model')} className="btn btn-primary">
          Open Model Studio
        </button>
      </div>
    );
  }

  const isTraining = sessionStatus === 'training';
  const isPaused = sessionStatus === 'paused';
  const isTrained = sessionStatus === 'trained';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Top Telemetry Header */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Model info & switcher */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{activeModel.name}</h2>
              <span className={`badge ${isTrained ? 'badge-green' : (isTraining ? 'badge-cyan animate-pulse-glow' : 'badge-amber')}`}>
                {sessionStatus.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>Algorithm: <strong style={{ color: '#fff' }}>{activeModel.model_type.replace('_', ' ')}</strong></span>
              <span>•</span>
              <span>Dataset: <strong style={{ color: '#fff' }}>{currentDataset?.name || 'None'}</strong> ({currentDataset?.row_count} rows)</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {!isTraining && !isPaused && (
              <button
                onClick={handleStartTraining}
                className="btn btn-primary"
                style={{ padding: '8px 18px' }}
              >
                <Play size={16} />
                <span>{isTrained ? 'Retrain Model' : 'Start Training'}</span>
              </button>
            )}

            {isTraining && (
              <button
                onClick={handlePause}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              >
                <Pause size={16} />
                <span>Pause</span>
              </button>
            )}

            {isPaused && (
              <button
                onClick={handleResume}
                className="btn btn-primary"
                style={{ padding: '8px 18px' }}
              >
                <Play size={16} />
                <span>Resume</span>
              </button>
            )}

            {(isTraining || isPaused) && (
              <button
                onClick={handleStop}
                className="btn btn-danger"
                style={{ padding: '8px 18px' }}
              >
                <Square size={16} />
                <span>Stop</span>
              </button>
            )}

            {isTrained && (
              <>
                <button
                  onClick={() => onSelectStudio('visualizer')}
                  className="btn btn-secondary"
                  style={{ padding: '8px 18px' }}
                >
                  <Network size={16} />
                  <span>Inspect Visualizer</span>
                </button>
                <button
                  onClick={() => onSelectStudio('playground')}
                  className="btn btn-secondary"
                  style={{ padding: '8px 18px' }}
                >
                  <Sparkles size={16} />
                  <span>Test in Playground</span>
                </button>
              </>
            )}
          </div>

        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
            <span>Epoch / Step {currentStep} of {totalSteps}</span>
            <span>{progressPct.toFixed(1)}% Completed</span>
          </div>
          <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, progressPct))}%`,
              background: 'linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%)',
              transition: 'width 0.2s ease',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)',
            }} />
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry Stats Pill Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Training Loss</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            {latestMetrics.train_loss !== undefined ? latestMetrics.train_loss.toFixed(4) : '—'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validation Loss</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
            {latestMetrics.val_loss !== undefined ? latestMetrics.val_loss.toFixed(4) : '—'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {activeModel.task_type === 'classification' ? 'Val Accuracy' : 'Val R² Score'}
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
            {latestMetrics.val_metric !== undefined 
              ? (activeModel.task_type === 'classification' ? `${(latestMetrics.val_metric * 100).toFixed(1)}%` : latestMetrics.val_metric.toFixed(3))
              : (latestMetrics.accuracy !== undefined ? `${(latestMetrics.accuracy * 100).toFixed(1)}%` : '—')}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Elapsed Duration</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            {elapsedSeconds.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Dual Real-Time Canvas Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* Loss Convergence Chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Loss Convergence</h3>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#06b6d4' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' }} />
                Train Loss
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a855f7' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                Val Loss
              </span>
            </div>
          </div>
          <canvas
            ref={lossCanvasRef}
            width={520}
            height={240}
            style={{ width: '100%', height: '240px', background: 'var(--bg-secondary)', borderRadius: '8px' }}
          />
        </div>

        {/* Validation Metric Chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              Performance Metric ({activeModel.task_type === 'classification' ? 'Accuracy' : 'R² Score'})
            </h3>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                Train
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                Validation
              </span>
            </div>
          </div>
          <canvas
            ref={metricCanvasRef}
            width={520}
            height={240}
            style={{ width: '100%', height: '240px', background: 'var(--bg-secondary)', borderRadius: '8px' }}
          />
        </div>

      </div>

      {/* Live Terminal Log Stream */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Python Worker Telemetry Logs</h3>
          </div>
          <button
            onClick={() => setTerminalLogs([])}
            className="btn btn-secondary"
            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
          >
            Clear Terminal
          </button>
        </div>

        <div
          ref={terminalRef}
          style={{
            height: '180px',
            overflowY: 'auto',
            background: '#040711',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            color: '#a5f3fc',
            lineHeight: 1.6,
            border: '1px solid rgba(6, 182, 212, 0.2)',
          }}
        >
          {terminalLogs.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Waiting for training session output...</span>
          ) : (
            terminalLogs.map((log, idx) => <div key={idx}>{log}</div>)
          )}
        </div>
      </div>

    </div>
  );
};
