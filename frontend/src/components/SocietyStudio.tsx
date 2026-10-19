import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SocietyState, Citizen } from '../types';
import { api } from '../api';
import { 
  Users, 
  Play, 
  Pause, 
  FastForward, 
  SkipForward, 
  Shield, 
  Sword, 
  Sparkles, 
  Zap, 
  Crown, 
  Scale, 
  Coins, 
  MessageSquare, 
  AlertTriangle,
  Flame,
  Globe,
  Compass,
  CheckCircle2,
  XCircle,
  Eye,
  Award,
  Activity,
  Heart,
  Battery,
  Layers,
  ChevronRight,
  Radio
} from 'lucide-react';
import { AgoraChatroom } from './AgoraChatroom';

export const SocietyStudio: React.FC = () => {
  const [societyState, setSocietyState] = useState<SocietyState | null>(null);
  const [selectedCitizenId, setSelectedCitizenId] = useState<string>('');
  const [godActionMsg, setGodActionMsg] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'chat' | 'duel' | 'trade' | 'law' | 'god'>('all');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [activeView, setActiveView] = useState<'chat' | 'map' | 'split'>('chat');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<any>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Selected Citizen Memo
  const selectedCitizen = useMemo(() => {
    if (!societyState) return null;
    return societyState.agents.find((a) => a.id === selectedCitizenId) || societyState.agents[0] || null;
  }, [societyState, selectedCitizenId]);

  // Connect WebSocket with auto-reconnect & fallback heartbeat polling
  useEffect(() => {
    api.getSocietyState()
      .then((state) => {
        setSocietyState(state);
        if (state.agents.length > 0 && !selectedCitizenId) {
          setSelectedCitizenId(state.agents[0].id);
        }
      })
      .catch((e) => console.error('Failed to get society state', e));

    const ws = api.connectSocietyWebSocket((state) => {
      setSocietyState(state);
    });
    wsRef.current = ws;

    // Safety fallback polling heartbeat (every 2.5s) to ensure uninterrupted updates
    const pollInterval = setInterval(() => {
      api.getSocietyState()
        .then((state) => {
          setSocietyState(state);
        })
        .catch(() => {});
    }, 2500);

    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, []);

  // Autoscroll logs
  useEffect(() => {
    if (isAutoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [societyState?.event_logs, isAutoScroll]);

  // Render 2D Cyber-Terrarium Canvas Map
  useEffect(() => {
    if (!societyState || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const gridSize = 20;
    const cellW = w / gridSize;
    const cellH = h / gridSize;

    // Draw Subtle Cyber-Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellH);
      ctx.lineTo(w, i * cellH);
      ctx.stroke();
    }

    // Draw Landmarks & Resource Caldrons
    societyState.map_nodes.forEach((node) => {
      const px = node.x * cellW + cellW / 2;
      const py = node.y * cellH + cellH / 2;

      // Radial pulsating background
      const grad = ctx.createRadialGradient(px, py, 2, px, py, cellW * 1.8);
      grad.addColorStop(0, node.color + '44');
      grad.addColorStop(0.6, node.color + '15');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, cellW * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Node ring
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.stroke();

      // Core center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      // Node Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, px, py + 22);
    });

    // Draw Alliance Links (Trust Lines)
    societyState.agents.forEach((ag) => {
      Object.entries(ag.trust_matrix).forEach(([otherId, trust]) => {
        if (trust > 0.35) {
          const other = societyState.agents.find((a) => a.id === otherId);
          if (other) {
            const dist = Math.hypot(ag.x - other.x, ag.y - other.y);
            if (dist < 6.5) {
              const x1 = ag.x * cellW + cellW / 2;
              const y1 = ag.y * cellH + cellH / 2;
              const x2 = other.x * cellW + cellW / 2;
              const y2 = other.y * cellH + cellH / 2;
              ctx.strokeStyle = `rgba(16, 185, 129, ${Math.min(0.5, trust * 0.4)})`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }
      });
    });

    // Draw Citizens
    societyState.agents.forEach((agent) => {
      const px = agent.x * cellW + cellW / 2;
      const py = agent.y * cellH + cellH / 2;
      const isSelected = selectedCitizen?.id === agent.id;
      const isChancellor = societyState.chancellor.id === agent.id;

      // Aura Glow
      const aura = ctx.createRadialGradient(px, py, 4, px, py, 26);
      aura.addColorStop(0, agent.color + (isSelected ? '77' : '33'));
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(px, py, 26, 0, Math.PI * 2);
      ctx.fill();

      // Selection Halo
      if (isSelected) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, 21, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Chancellor Crown Marker
      if (isChancellor) {
        ctx.font = '14px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', px, py - 18);
      }

      // Citizen Body Circle
      ctx.fillStyle = agent.color;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Avatar Emoji/Icon
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(agent.avatar, px, py + 4.5);

      // Weapon Icon Badge (top right)
      ctx.font = '11px "Outfit", sans-serif';
      ctx.fillText(agent.equipped_weapon.icon, px + 13, py - 9);

      // Health Bar
      const barW = 26;
      const barH = 3.5;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(px - barW / 2, py + 17, barW, barH);
      ctx.fillStyle = agent.health > 40 ? '#10b981' : '#ef4444';
      ctx.fillRect(px - barW / 2, py + 17, (agent.health / 100) * barW, barH);

      // 30s Cooldown / Status text below Health Bar
      ctx.font = '8px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      if ((agent.action_cooldown || 0) > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`⏳ ${agent.action_cooldown}s`, px, py + 28);
      } else {
        ctx.fillStyle = '#34d399';
        ctx.fillText('⚡ Ready', px, py + 28);
      }

      // Live Council Vote Badge on avatar
      if (societyState.council.in_session && societyState.council.ballots[agent.id]) {
        const v = societyState.council.ballots[agent.id];
        ctx.fillStyle = v === 'AYE' ? '#10b981' : '#ef4444';
        ctx.font = 'bold 9px "Outfit", sans-serif';
        ctx.fillText(v, px - 15, py - 8);
      }

      // Speech Bubble (Floating Popup)
      if (agent.speech_bubble) {
        const bubbleW = Math.min(200, agent.speech_bubble.length * 6.8 + 18);
        const bubbleH = 24;
        const bx = Math.max(12, Math.min(w - bubbleW - 12, px - bubbleW / 2));
        const by = py - 42;

        // Speech Box
        ctx.fillStyle = 'rgba(11, 17, 33, 0.96)';
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, bubbleW, bubbleH, 6);
        ctx.fill();
        ctx.stroke();

        // Little arrow pointing to agent
        ctx.fillStyle = agent.color;
        ctx.beginPath();
        ctx.moveTo(px - 4, by + bubbleH);
        ctx.lineTo(px + 4, by + bubbleH);
        ctx.lineTo(px, by + bubbleH + 5);
        ctx.fill();

        // Speech text
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(agent.speech_bubble, bx + bubbleW / 2, by + 15, bubbleW - 8);
      }
    });
  }, [societyState, selectedCitizen, activeView]);

  // Click on canvas to select citizen
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!societyState || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cellW = canvasRef.current.width / 20;
    const cellH = canvasRef.current.height / 20;

    let closestAgentId = '';
    let closestDist = 28;

    societyState.agents.forEach((ag) => {
      const px = ag.x * cellW + cellW / 2;
      const py = ag.y * cellH + cellH / 2;
      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist < closestDist) {
        closestDist = dist;
        closestAgentId = ag.id;
      }
    });

    if (closestAgentId) {
      setSelectedCitizenId(closestAgentId);
    }
  };

  // God Mode Actions
  const handleGodAction = async (actionType: string, payload: any = {}) => {
    try {
      const res = await api.applyGodAction(actionType, payload);
      setGodActionMsg(res.message);
      if (res.state) {
        setSocietyState(res.state);
      }
      setTimeout(() => setGodActionMsg(''), 5000);
    } catch (e: any) {
      setGodActionMsg(e.message || 'Action failed');
    }
  };

  const handleTogglePlay = async () => {
    const res = await api.toggleSocietyPlay();
    setSocietyState((prev) => prev ? { ...prev, is_running: res.is_running } : null);
  };

  const handleStep = async () => {
    const state = await api.stepSociety();
    setSocietyState(state);
  };

  const handleSpeed = async (spd: number) => {
    const res = await api.setSocietySpeed(spd);
    setSocietyState((prev) => prev ? { ...prev, speed: res.speed } : null);
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (!societyState) return [];
    if (logFilter === 'all') return societyState.event_logs;
    return societyState.event_logs.filter((l) => l.category === logFilter);
  }, [societyState, logFilter]);

  if (!societyState) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }} className="badge badge-cyan animate-pulse-glow">
          <Activity size={16} />
          <span>Awakening AI Society Neural Engine...</span>
        </div>
      </div>
    );
  }

  const actionLabels = [
    { key: 0, label: 'Mine Resources', icon: '⛏️', color: '#06b6d4' },
    { key: 1, label: 'Forge Weapons', icon: '🔨', color: '#f59e0b' },
    { key: 2, label: 'Duel Rival', icon: '⚔️', color: '#ef4444' },
    { key: 3, label: 'Trade Pact', icon: '🤝', color: '#10b981' },
    { key: 4, label: 'Propose Law', icon: '📜', color: '#8b5cf6' },
    { key: 5, label: 'Meditate & Heal', icon: '🧘', color: '#38bdf8' },
  ];

  const renderAgoraChatBanner = () => {
    const lastMsg = societyState?.chat_messages && societyState.chat_messages.length > 0
      ? societyState.chat_messages[societyState.chat_messages.length - 1]
      : null;

    return (
      <div
        onClick={() => setActiveView('chat')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          cursor: 'pointer',
          gap: '12px',
          transition: 'all 0.15s ease',
        }}
        title="Click to enter the Citizen Agora Chatroom"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <MessageSquare size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Agora Live Dialogue:</span>
          {lastMsg ? (
            <span style={{ fontSize: '0.82rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <strong style={{ color: lastMsg.sender_color }}>{lastMsg.sender_name.split(' ')[0]}:</strong> "{lastMsg.text}"
            </span>
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>10 Citizen Bots debating civic laws...</span>
          )}
        </div>

        <span className="badge badge-cyan" style={{ fontSize: '0.72rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>Enter Agora Chat</span>
          <ChevronRight size={13} />
        </span>
      </div>
    );
  };

  const renderMapCard = () => (
    <div className="glass-panel" style={{ padding: '22px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Autonomous Territory & Avatars</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            Alliance Link
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} />
            Chancellor
          </span>
        </div>
      </div>

      <div style={{
        position: 'relative',
        background: '#040713',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-highlight)',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)',
      }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={520}
          onClick={handleCanvasClick}
          style={{ display: 'block', width: '100%', height: 'auto', cursor: 'crosshair' }}
        />

        {/* Map Controls Helper */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '12px',
          background: 'rgba(7, 10, 19, 0.85)',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}>
          Click any citizen avatar to open dossiers
        </div>
      </div>
    </div>
  );

  const renderActionLedger = () => (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Autonomous Political & Combat Ledger</h3>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px' }}>
          {(['all', 'chat', 'duel', 'trade', 'law', 'god'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setLogFilter(cat)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: logFilter === cat ? 700 : 500,
                border: 'none',
                background: logFilter === cat ? 'var(--bg-tertiary)' : 'transparent',
                color: logFilter === cat ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {cat === 'all' ? 'All' : cat === 'chat' ? '💬 Chat' : cat}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={logContainerRef}
        style={{
          height: '190px',
          overflowY: 'auto',
          background: '#040713',
          borderRadius: '8px',
          padding: '12px 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: '#e2e8f0',
          lineHeight: 1.7,
          border: '1px solid var(--border-subtle)',
        }}
      >
        {filteredLogs.map((log) => (
          <div key={log.id} style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span>
            <span>{log.text}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1540px', margin: '0 auto', padding: '24px' }}>
      
      {/* Top Banner & Control Deck */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(13, 18, 34, 0.95) 0%, rgba(24, 32, 58, 0.85) 100%)',
        border: '1px solid var(--border-highlight)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        <div style={{ maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="badge badge-violet" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} />
              <span>Studio 9 • Autonomous AI Society</span>
            </span>
            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={13} />
              <span>Tick #{societyState.tick}</span>
            </span>
            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Crown size={13} />
              <span>Chancellor: {societyState.chancellor.name.split(' ')[0]}</span>
            </span>
          </div>

          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Living AI Society: <span className="gradient-text-cyan">10 Model Citizens</span> with Fictional Armaments & Politics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px', lineHeight: 1.5 }}>
            Each algorithm is embodied with a distinct personality, combat armament, and governance ideology. They explore the cyber-terrarium, mine quantum crystals, forge sci-fi weapons, duel rivals, propose legislation, and learn online via reinforcement learning.
          </p>
        </div>

        {/* Playback & Speed Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-tertiary)',
          padding: '8px 16px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={handleTogglePlay}
            className={`btn ${societyState.is_running ? 'btn-secondary' : 'btn-primary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {societyState.is_running ? <Pause size={15} /> : <Play size={15} />}
            <span>{societyState.is_running ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={handleStep}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            title="Step Forward 1 Tick"
          >
            <SkipForward size={15} />
          </button>

          <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '10px' }}>
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeed(spd)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  border: societyState.speed === spd ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  background: societyState.speed === spd ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                  color: societyState.speed === spd ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* God Mode Feedback Alert */}
      {godActionMsg && (
        <div className="glass-panel" style={{
          padding: '12px 20px',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#e0f2fe',
          fontSize: '0.9rem',
          borderRadius: '10px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <Zap size={18} color="var(--accent-cyan)" />
          <span><strong>Divine Decree:</strong> {godActionMsg}</span>
        </div>
      )}

      {/* View Mode Selector Tabs: Agora Chatroom vs Terrarium Map vs Split View */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10, 16, 33, 0.85)',
        padding: '8px 14px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(10px)',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveView('chat')}
            className={`btn ${activeView === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MessageSquare size={16} />
            <span>Citizen Agora Chatroom</span>
            {societyState.chat_messages && societyState.chat_messages.length > 0 && (
              <span style={{
                background: activeView === 'chat' ? '#040713' : 'var(--accent-cyan)',
                color: activeView === 'chat' ? 'var(--accent-cyan)' : '#040713',
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px',
                fontFamily: 'var(--font-mono)'
              }}>
                {societyState.chat_messages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('map')}
            className={`btn ${activeView === 'map' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Globe size={16} />
            <span>Territory Map & Council</span>
          </button>

          <button
            onClick={() => setActiveView('split')}
            className={`btn ${activeView === 'split' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Layers size={16} />
            <span>Split Arena View</span>
          </button>
        </div>

        {/* Dynamic Topic Mini-Bar */}
        {societyState.active_chat_topic && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Radio size={13} color="#10b981" />
            <span style={{ color: 'var(--text-muted)' }}>Civic Debate:</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{societyState.active_chat_topic.title}</span>
          </div>
        )}
      </div>

      {/* 10-Citizen Horizontal Quick-Roster Strip */}
      <div style={{
        display: 'flex',
        gap: '10px',
        overflowX: 'auto',
        paddingBottom: '8px',
      }}>
        {societyState.agents.map((ag) => {
          const isSelected = selectedCitizen?.id === ag.id;
          const isChancellor = societyState.chancellor.id === ag.id;
          return (
            <div
              key={ag.id}
              onClick={() => setSelectedCitizenId(ag.id)}
              className="glass-panel"
              style={{
                flex: '0 0 140px',
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-secondary)',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {isChancellor && (
                <div style={{ position: 'absolute', top: '-6px', right: '6px', fontSize: '0.85rem' }} title="Elected Chancellor">
                  👑
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>{ag.avatar}</span>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {ag.name.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Lvl {ag.level}
                  </div>
                </div>
              </div>

              {/* 30-Second Cooldown Status Badge */}
              <div style={{ marginBottom: '6px' }}>
                {(ag.action_cooldown || 0) > 0 ? (
                  <span style={{ fontSize: '0.65rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span>⏳</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ag.last_action_name || 'Resting'} ({ag.action_cooldown}s)
                    </span>
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700 }}>
                    ⚡ Ready to Act
                  </span>
                )}
              </div>

              {/* Weapon & Health bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>{ag.equipped_weapon.icon} {ag.equipped_weapon.name.split(' ')[0]}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: ag.health > 40 ? '#10b981' : '#ef4444' }}>
                  {ag.health}hp
                </span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${ag.health}%`, height: '100%', background: ag.health > 40 ? '#10b981' : '#ef4444' }} />
              </div>

              {/* Voting Pill if Council in session */}
              {societyState.council.in_session && societyState.council.ballots[ag.id] && (
                <div style={{ marginTop: '5px', textAlign: 'center' }}>
                  <span className={`badge ${societyState.council.ballots[ag.id] === 'AYE' ? 'badge-green' : 'badge-danger'}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                    Voted {societyState.council.ballots[ag.id]}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 1. AGORA CHATROOM VIEW */}
      {activeView === 'chat' && (
        <AgoraChatroom
          societyState={societyState}
          selectedCitizenId={selectedCitizen?.id || ''}
          onSelectCitizen={setSelectedCitizenId}
          onGodAction={handleGodAction}
          onUpdateState={setSocietyState}
          isCompact={false}
        />
      )}

      {/* 2. SPLIT ARENA VIEW (Terrarium Map + Live Agora Chat) */}
      {activeView === 'split' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(520px, 1.15fr) minmax(500px, 1.25fr)', gap: '22px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderMapCard()}
            {renderActionLedger()}
          </div>
          <div>
            <AgoraChatroom
              societyState={societyState}
              selectedCitizenId={selectedCitizen?.id || ''}
              onSelectCitizen={setSelectedCitizenId}
              onGodAction={handleGodAction}
              onUpdateState={setSocietyState}
              isCompact={true}
            />
          </div>
        </div>
      )}

      {/* 3. TERRITORY MAP & COUNCIL VIEW */}
      {activeView === 'map' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(640px, 1.55fr) minmax(380px, 1fr)', gap: '22px', alignItems: 'start' }}>
          {/* Left Column: Interactive 2D Map & Filterable Action Ledger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {renderAgoraChatBanner()}
            {renderMapCard()}
            {renderActionLedger()}
          </div>

        {/* Right Column: Democratic Governance, Dossier & God Mode Interventions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Democratic Council & Governance Card */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={18} color="#fbbf24" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Democratic Council & Laws</h3>
              </div>
              <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                Treasury: {societyState.treasury_crystals} 💎
              </span>
            </div>

            {/* Elected Chancellor Podium */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(13, 18, 34, 0.9) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Elected Chancellor
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fef08a', marginTop: '2px' }}>
                    👑 {societyState.chancellor.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Term Remaining</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {societyState.chancellor.term_remaining} cycles
                  </div>
                </div>
              </div>
            </div>

            {/* Live Parliamentary Bill (If active) */}
            {societyState.council.in_session && societyState.council.bill && (
              <div style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid var(--accent-violet)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="badge badge-violet" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Scale size={12} />
                    <span>Live Council Vote</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-violet)', fontWeight: 700 }}>
                    Closes in {societyState.council.timer}s
                  </span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{societyState.council.bill.title}</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {societyState.council.bill.description}
                </p>

                {/* Vote Tally Progress */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>
                      AYE: {Object.values(societyState.council.ballots).filter((v) => v === 'AYE').length}
                    </span>
                    <span style={{ color: '#f87171', fontWeight: 700 }}>
                      NAY: {Object.values(societyState.council.ballots).filter((v) => v === 'NAY').length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: '#334155' }}>
                    <div style={{
                      width: `${(Object.values(societyState.council.ballots).filter((v) => v === 'AYE').length / Math.max(1, Object.keys(societyState.council.ballots).length)) * 100}%`,
                      background: '#10b981',
                    }} />
                    <div style={{
                      width: `${(Object.values(societyState.council.ballots).filter((v) => v === 'NAY').length / Math.max(1, Object.keys(societyState.council.ballots).length)) * 100}%`,
                      background: '#ef4444',
                    }} />
                  </div>
                </div>

                {/* 10 Citizens Live Ballots Grid */}
                <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>
                    Live Citizen Ballots ({Object.keys(societyState.council.ballots).length} / {societyState.agents.length} Voted)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                    {societyState.agents.map((ag) => {
                      const vote = societyState.council.ballots[ag.id];
                      return (
                        <div key={ag.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '5px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>
                          <span>{ag.avatar} {ag.name.split(' ')[0]}</span>
                          {vote ? (
                            <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: vote === 'AYE' ? '#34d399' : '#f87171' }}>
                              {vote === 'AYE' ? '✅ AYE' : '❌ NAY'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontStyle: 'italic' }}>
                              Deliberating...
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Active Enacted Laws */}
            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
                Enacted Community Laws ({societyState.active_laws.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                {societyState.active_laws.map((law) => (
                  <div key={law.id} style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>{law.title}</span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>Law #{law.id}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {law.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Citizen Dossier & Neural Policy Visualizer */}
          {selectedCitizen && (
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.6rem' }}>{selectedCitizen.avatar}</span>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedCitizen.name}</h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedCitizen.archetype}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <span className="badge badge-violet">{selectedCitizen.algorithm}</span>
                    <span className="badge badge-cyan">{selectedCitizen.faction}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-green" style={{ fontSize: '0.8rem' }}>Level {selectedCitizen.level}</span>
                  {selectedCitizen.experience !== undefined && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      XP: {selectedCitizen.experience} / {selectedCitizen.next_level_exp || 50}
                    </div>
                  )}
                </div>
              </div>

              {/* 30-Second Action Cooldown Cycle Card */}
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Action Cooldown (30s Wait Cycle)</span>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: (selectedCitizen.action_cooldown || 0) > 0 ? '#fbbf24' : '#34d399',
                  }}>
                    {(selectedCitizen.action_cooldown || 0) > 0
                      ? `⏳ ${selectedCitizen.last_action_name || 'Resting'} (${selectedCitizen.action_cooldown}s)`
                      : '⚡ Ready for Next Action'}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${((30 - (selectedCitizen.action_cooldown || 0)) / 30) * 100}%`,
                    height: '100%',
                    background: (selectedCitizen.action_cooldown || 0) > 0
                      ? 'linear-gradient(90deg, #f59e0b 0%, #06b6d4 100%)'
                      : '#10b981',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>

              {/* Vitals Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <Heart size={12} color="#ef4444" />
                    <span>Health Points</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: selectedCitizen.health > 40 ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                    {selectedCitizen.health} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <Coins size={12} color="#fbbf24" />
                    <span>Inventory</span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    {selectedCitizen.crystals} 💎 • {selectedCitizen.quantum_cores} ⚛️
                  </div>
                </div>
              </div>

              {/* Equipped Fictional Sci-Fi Armament */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
                border: '1px solid var(--border-highlight)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{selectedCitizen.equipped_weapon.icon}</span>
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{selectedCitizen.equipped_weapon.name}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedCitizen.equipped_weapon.type}</div>
                    </div>
                  </div>
                  <span className={`badge ${selectedCitizen.equipped_weapon.tier === 'Legendary' ? 'badge-amber' : (selectedCitizen.equipped_weapon.tier === 'Epic' ? 'badge-violet' : 'badge-cyan')}`}>
                    {selectedCitizen.equipped_weapon.tier}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', fontSize: '0.75rem' }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '6px 8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Attack:</span>
                    <strong style={{ color: '#f87171' }}>{selectedCitizen.equipped_weapon.attack}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '6px 8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Defense:</span>
                    <strong style={{ color: '#38bdf8' }}>{selectedCitizen.equipped_weapon.defense}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', marginTop: '8px', lineHeight: 1.4 }}>
                  ✨ <strong>Passive Trait:</strong> {selectedCitizen.equipped_weapon.special}
                </div>
              </div>

              {/* Internal Neural Policy Biases (Online RL Weights) */}
              {selectedCitizen.policy_bias && selectedCitizen.policy_bias.length >= 6 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Reinforcement Learning Policy Weights
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)' }}>Live Q-Weights</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {actionLabels.map((act) => {
                      const weight = selectedCitizen.policy_bias?.[act.key] || 0.1;
                      const pct = Math.max(5, Math.min(100, Math.round(weight * 250)));
                      return (
                        <div key={act.key} style={{ fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>{act.icon} {act.label}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                              {(weight * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: act.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inter-Agent Trust Relationships */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
                  Diplomatic Sentiment Matrix
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                  {Object.entries(selectedCitizen.trust_matrix).map(([otherId, trust]) => {
                    const other = societyState.agents.find((a) => a.id === otherId);
                    return (
                      <div key={otherId} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '5px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>
                        <span>{other ? other.name.split(' ')[0] : otherId}</span>
                        <span style={{
                          color: trust >= 0.3 ? '#34d399' : (trust < -0.1 ? '#ef4444' : '#94a3b8'),
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {(trust * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* God Mode Interventions Deck */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>God Mode Divine Command Deck</h3>
              </div>
              <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>Direct Interventions</span>
            </div>

            {/* Categorized Interventions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Blessings & Economy */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
                  Divine Blessings & Resources
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <button
                    onClick={() => handleGodAction('inject_crystals', { amount: 100 })}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '8px 10px' }}
                    title="Inject 100 Quantum Crystals into all citizen inventories and Treasury"
                  >
                    💎 +100 Crystals All
                  </button>

                  <button
                    onClick={() => handleGodAction('heal_all')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '8px 10px' }}
                    title="Restore all citizens to 100% Health & Energy"
                  >
                    💖 Restore All Vitality
                  </button>
                </div>
              </div>

              {/* Governance & Democracy */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
                  Political Decrees
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <button
                    onClick={() => handleGodAction('force_election')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '8px 10px' }}
                    title="Call an immediate democratic election across the 10 citizens"
                  >
                    🏛️ Call General Election
                  </button>

                  <button
                    onClick={() => handleGodAction('sponsor_law', { law_id: 'law_peace' })}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '8px 10px' }}
                    title="Decree Non-Violence Edict (50 Crystal fine for duels)"
                  >
                    🕊️ Decree Peace Edict
                  </button>
                </div>
              </div>

              {/* Global Cataclysms */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#f87171', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
                  Sector Cataclysms
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <button
                    onClick={() => handleGodAction('trigger_crisis', { crisis: 'Solar Flare Storm' })}
                    className="btn btn-danger"
                    style={{ fontSize: '0.72rem', padding: '6px 8px' }}
                    title="Depletes citizen energy grids"
                  >
                    ☀️ Solar Flare
                  </button>

                  <button
                    onClick={() => handleGodAction('trigger_crisis', { crisis: 'Market Crash' })}
                    className="btn btn-danger"
                    style={{ fontSize: '0.72rem', padding: '6px 8px' }}
                    title="Halves citizen crystals"
                  >
                    📉 Financial Crash
                  </button>

                  <button
                    onClick={() => handleGodAction('trigger_crisis', { crisis: 'Ancient Titan' })}
                    className="btn btn-danger"
                    style={{ fontSize: '0.72rem', padding: '6px 8px' }}
                    title="Void Titan attacks the sector"
                  >
                    👾 Void Titan
                  </button>
                </div>
              </div>

              {/* Bestow Legendary Armaments upon Selected Citizen */}
              {selectedCitizen && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-violet)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
                    Bestow Sci-Fi Weapon upon {selectedCitizen.name.split(' ')[0]}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    <button
                      onClick={() => handleGodAction('grant_weapon', { agent_id: selectedCitizen.id, weapon_id: 'singularity_orb' })}
                      className="btn btn-primary"
                      style={{ fontSize: '0.72rem', padding: '6px 8px' }}
                      title="Bestow Singularity Gravity Orb (Atk 42, Def 24)"
                    >
                      🔮 Singularity Orb
                    </button>

                    <button
                      onClick={() => handleGodAction('grant_weapon', { agent_id: selectedCitizen.id, weapon_id: 'plasma_blade' })}
                      className="btn btn-primary"
                      style={{ fontSize: '0.72rem', padding: '6px 8px' }}
                      title="Bestow Plasma Void Blade (Atk 28, Def 8)"
                    >
                      ⚔️ Plasma Blade
                    </button>

                    <button
                      onClick={() => handleGodAction('grant_weapon', { agent_id: selectedCitizen.id, weapon_id: 'quantum_staff' })}
                      className="btn btn-primary"
                      style={{ fontSize: '0.72rem', padding: '6px 8px' }}
                      title="Bestow Quantum Resonance Staff (Atk 22, Def 16)"
                    >
                      🪄 Quantum Staff
                    </button>

                    <button
                      onClick={() => handleGodAction('grant_weapon', { agent_id: selectedCitizen.id, weapon_id: 'chrono_shield' })}
                      className="btn btn-primary"
                      style={{ fontSize: '0.72rem', padding: '6px 8px' }}
                      title="Bestow Chrono Aegis Shield (Atk 12, Def 32)"
                    >
                      🛡️ Chrono Shield
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    )}

    </div>
  );
};
