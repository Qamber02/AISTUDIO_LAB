import React from 'react';
import { 
  Compass, 
  Database, 
  Sliders, 
  Activity, 
  Network, 
  Sparkles, 
  BarChart3, 
  Settings,
  Users
} from 'lucide-react';

interface TabNavigationProps {
  currentStudio: string;
  onSelectStudio: (studio: string) => void;
  datasetCount: number;
  modelCount: number;
  experimentCount: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  currentStudio,
  onSelectStudio,
  datasetCount,
  modelCount,
  experimentCount,
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Compass },
    { id: 'dataset', label: 'Dataset Studio', icon: Database, badge: datasetCount },
    { id: 'model', label: 'Model Studio', icon: Sliders, badge: `${modelCount}/10` },
    { id: 'training', label: 'Training Lab', icon: Activity },
    { id: 'visualizer', label: 'Visualizer', icon: Network },
    { id: 'playground', label: 'Model Playground', icon: Sparkles },
    { id: 'society', label: 'AI Society', icon: Users, badge: '10 AI' },
    { id: 'experiments', label: 'Experiments', icon: BarChart3, badge: experimentCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      overflowX: 'auto',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-secondary)',
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentStudio === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectStudio(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: isActive ? '1px solid var(--border-highlight)' : '1px solid transparent',
              background: isActive ? 'var(--bg-tertiary)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={16} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                padding: '1px 6px',
                borderRadius: '999px',
                background: isActive ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
