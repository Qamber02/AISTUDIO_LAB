import React from 'react';
import type { Model } from '../types';
import { Cpu, Sun, Moon, Database, Sliders, Play, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeaderNavProps {
  currentStudio: string;
  onSelectStudio: (studio: string) => void;
  activeModel: Model | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  modelCount: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentStudio,
  onSelectStudio,
  activeModel,
  theme,
  onToggleTheme,
  modelCount,
}) => {
  const steps = [
    { id: 'dataset', label: '1. Dataset', icon: Database },
    { id: 'model', label: '2. Model Config', icon: Sliders },
    { id: 'training', label: '3. Train Lab', icon: Play },
    { id: 'visualizer', label: '4. Visualizer', icon: Eye },
    { id: 'playground', label: '5. Playground', icon: Sparkles },
  ];

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => onSelectStudio('overview')}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
          }}>
            <Cpu size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }} className="gradient-text-cyan">
                AI MODEL LAB
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Python 3.15 CPU</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Creation & Simulation Platform</p>
          </div>
        </div>

        {/* 5-Step Guided Progression Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--bg-secondary)',
          padding: '4px 8px',
          borderRadius: '999px',
          border: '1px solid var(--border-subtle)',
        }}>
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStudio === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => onSelectStudio(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '999px',
                    border: 'none',
                    background: isActive ? 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 8px rgba(6, 182, 212, 0.35)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  <span>{step.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <span style={{ color: 'var(--border-subtle)', fontSize: '0.7rem' }}>›</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Active Model Indicator & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {activeModel ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-highlight)',
              fontSize: '0.8rem',
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Active:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{activeModel.name}</span>
              <span className={`badge ${activeModel.status === 'trained' ? 'badge-green' : (activeModel.status === 'training' ? 'badge-cyan animate-pulse-glow' : 'badge-amber')}`}>
                {activeModel.status}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Models: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{modelCount}/10</span>
            </div>
          )}

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', borderRadius: '8px' }}
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

      </div>
    </header>
  );
};
