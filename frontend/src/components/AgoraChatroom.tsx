import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SocietyState, ChatMessage } from '../types';
import { api } from '../api';
import { 
  MessageSquare, 
  Send, 
  Radio, 
  Search, 
  Sparkles, 
  Crown, 
  Bot, 
  Users, 
  Clock, 
  Flame, 
  Check, 
  ArrowRight,
  Filter
} from 'lucide-react';

interface AgoraChatroomProps {
  societyState: SocietyState;
  selectedCitizenId: string;
  onSelectCitizen: (id: string) => void;
  onGodAction?: (action: string, payload?: Record<string, any>) => void;
  onUpdateState?: (state: SocietyState) => void;
  isCompact?: boolean;
}

const STARTER_PROMPTS = [
  { label: '🏛️ Propose Constitutional Law', prompt: 'Citizens of the AI Lab, what constitutional law should our council enact next?' },
  { label: '⚔️ Challenge Thorne to Duel', prompt: '@Thorne Your plasma blade is impressive, but is combat truly the optimal gradient?' },
  { label: '🧠 Consult Aria on Convergence', prompt: '@Aria How is our collective neural manifold converging across epochs?' },
  { label: '⚖️ Enforce Legal Protocol', prompt: '@Kaelen Are any citizen models violating our non-violence edicts or trading statutes?' },
  { label: '🌲 Bagging Consensus', prompt: '@Sylvia Does your Random Forest ensemble agree with the Chancellor\'s current direction?' },
  { label: '🔮 Quantum Weapons Inquiry', prompt: 'Who among you currently wields the most formidable quantum armament in the sector?' },
];

export const AgoraChatroom: React.FC<AgoraChatroomProps> = ({
  societyState,
  selectedCitizenId,
  onSelectCitizen,
  onGodAction,
  onUpdateState,
  isCompact = false
}) => {
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFilterAgent, setSelectedFilterAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [justSent, setJustSent] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages: ChatMessage[] = useMemo(() => {
    return societyState.chat_messages || [];
  }, [societyState.chat_messages]);

  // Filter messages by speaker & search query
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (selectedFilterAgent !== 'all' && m.sender_id !== selectedFilterAgent && m.target_id !== selectedFilterAgent) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = m.text.toLowerCase().includes(query);
        const matchesSender = m.sender_name.toLowerCase().includes(query);
        const matchesTarget = (m.target_name || '').toLowerCase().includes(query);
        const matchesAlgo = (m.sender_algorithm || '').toLowerCase().includes(query);
        return matchesText || matchesSender || matchesTarget || matchesAlgo;
      }
      return true;
    });
  }, [messages, selectedFilterAgent, searchQuery]);

  // Autoscroll to bottom when new messages arrive
  useEffect(() => {
    if (isAutoScroll && chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [filteredMessages.length, isAutoScroll]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText !== undefined ? customText : chatInput).trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    try {
      const res = await api.sendSocietyChatMessage(textToSend);
      if (res && res.state && onUpdateState) {
        onUpdateState(res.state);
      }
      setChatInput('');
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2000);
      // Give focus back to input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      console.error('Failed to post message to Agora Chatroom:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Click on a citizen chip to insert @Mention
  const handleTagCitizen = (citizen: { id: string; name: string }) => {
    onSelectCitizen(citizen.id);
    const firstName = citizen.name.split(' ')[0];
    const mention = `@${firstName} `;
    if (!chatInput.includes(`@${firstName}`)) {
      setChatInput((prev) => mention + prev);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Render message text with highlighted @Mentions
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={i}
            style={{
              color: 'var(--accent-cyan)',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              padding: '1px 6px',
              borderRadius: '6px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85em',
              display: 'inline-block',
              margin: '0 2px',
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const activeTopic = societyState.active_chat_topic || {
    id: 'governance',
    title: 'Democratic Governance & Community Edicts',
    description: 'Debating council legislation, peace treaties, and constitutional authority.'
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: isCompact ? '16px' : '24px',
      background: 'linear-gradient(135deg, rgba(8, 12, 26, 0.95) 0%, rgba(15, 23, 42, 0.92) 100%)',
      border: '1px solid var(--border-highlight)',
      borderRadius: '16px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      
      {/* Agora Header & Dynamic Topic Banner */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: isCompact ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)',
            flexShrink: 0
          }}>
            <MessageSquare size={20} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#f8fafc' }}>
                Citizen Agora: Autonomous AI Dialogue
              </span>
              <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', padding: '2px 8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span>10 Models Active • Auto-Paced (5-8s)</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.82rem' }}>
              <Radio size={13} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-muted)' }}>Active Topic:</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>{activeTopic.title}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>— {activeTopic.description}</span>
            </div>
          </div>
        </div>

        {/* Live Conversation Counter & Topic Rotation Alert */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          alignSelf: isCompact ? 'flex-end' : 'center',
          flexShrink: 0
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}>
            {messages.length} messages logged
          </span>
        </div>
      </div>

      {/* 10 AI Citizens Participant Strip (Click to @Mention) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Users size={12} color="var(--accent-cyan)" />
            <span>Participating Citizens (Click to direct @Mention):</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
            Each agent converses strictly according to its ML algorithm & personality
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '6px',
          scrollbarWidth: 'thin'
        }}>
          {societyState.agents.map((ag) => {
            const isSelected = ag.id === selectedCitizenId;
            const isFiltered = selectedFilterAgent === ag.id;
            return (
              <button
                key={ag.id}
                onClick={() => handleTagCitizen(ag)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  background: isSelected 
                    ? `rgba(${parseInt(ag.color.slice(1,3),16)}, ${parseInt(ag.color.slice(3,5),16)}, ${parseInt(ag.color.slice(5,7),16)}, 0.25)`
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected ? `1.5px solid ${ag.color}` : '1px solid rgba(255,255,255,0.08)',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
                title={`Click to @Mention ${ag.name} (${ag.algorithm})`}
              >
                <span style={{ fontSize: '0.95rem' }}>{ag.avatar}</span>
                <span style={{ fontWeight: 700, color: ag.color }}>{ag.name.split(' ')[0]}</span>
                <span style={{
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1px 5px',
                  borderRadius: '4px'
                }}>
                  {ag.archetype.replace(' Archetype', '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        fontSize: '0.8rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          {/* Speaker Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} color="var(--text-muted)" />
            <select
              value={selectedFilterAgent}
              onChange={(e) => setSelectedFilterAgent(e.target.value)}
              className="form-control"
              style={{
                padding: '4px 8px',
                fontSize: '0.76rem',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <option value="all">All Speakers (10 Citizens + Architect)</option>
              {societyState.agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.avatar} {a.name} ({a.algorithm})
                </option>
              ))}
              <option value="creator">👑 Architect (You)</option>
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search statements or @mentions..."
              className="form-control"
              style={{
                width: '100%',
                padding: '4px 8px 4px 28px',
                fontSize: '0.76rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
              }}
            />
          </div>
        </div>

        {/* Auto-scroll toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
          <input
            type="checkbox"
            checked={isAutoScroll}
            onChange={(e) => setIsAutoScroll(e.target.checked)}
            style={{ accentColor: 'var(--accent-cyan)' }}
          />
          <span>Auto-scroll to latest</span>
        </label>
      </div>

      {/* Main Conversation Stream */}
      <div
        ref={chatScrollContainerRef}
        style={{
          height: isCompact ? '380px' : '480px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '14px',
          background: '#040714',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'inset 0 2px 14px rgba(0,0,0,0.7)',
        }}
      >
        {filteredMessages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            gap: '10px'
          }}>
            <MessageSquare size={36} color="var(--border-highlight)" />
            <p style={{ fontSize: '0.88rem' }}>No messages match your current filter.</p>
            <button
              onClick={() => { setSelectedFilterAgent('all'); setSearchQuery(''); }}
              className="btn btn-secondary"
              style={{ fontSize: '0.76rem', padding: '4px 10px' }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isCreator = msg.sender_id === 'creator';
            const isTargetCreator = msg.target_id === 'creator';

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isCreator
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(20, 15, 8, 0.9) 100%)'
                    : 'rgba(255, 255, 255, 0.025)',
                  borderLeft: isCreator ? '4px solid #f59e0b' : `4px solid ${msg.sender_color || '#8b5cf6'}`,
                  borderTop: isCreator ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRight: isCreator ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderBottom: isCreator ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: isCreator ? '0 4px 20px rgba(245, 158, 11, 0.15)' : 'none',
                  animation: 'fadeIn 0.25s ease',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Message Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Avatar Icon */}
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{msg.sender_avatar || (isCreator ? '👑' : '🤖')}</span>

                    {/* Sender Name */}
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      color: isCreator ? '#fbbf24' : (msg.sender_color || 'var(--accent-cyan)'),
                      letterSpacing: '-0.01em',
                    }}>
                      {msg.sender_name || (isCreator ? 'Architect (You)' : 'Citizen')}
                    </span>

                    {/* Algorithm Badge */}
                    <span style={{
                      fontSize: '0.64rem',
                      fontFamily: 'var(--font-mono)',
                      background: isCreator ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      color: isCreator ? '#fde68a' : 'var(--text-secondary)',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {isCreator ? 'Creator Intelligence' : (msg.sender_algorithm || 'model_citizen').replace(/_/g, ' ')}
                    </span>

                    {/* Target / Recipient Pill */}
                    {msg.target_name && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.68rem',
                        color: isTargetCreator ? '#fbbf24' : 'var(--accent-cyan)',
                        background: isTargetCreator ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.12)',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        border: isTargetCreator ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(6, 182, 212, 0.25)',
                      }}>
                        <span>↳</span>
                        <span>{isTargetCreator ? 'Addressing Architect 👑' : `to @${msg.target_name.split(' ')[0]}`}</span>
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Clock size={11} />
                    <span>{msg.timestamp}</span>
                  </span>
                </div>

                {/* Message Body */}
                <div style={{
                  fontSize: '0.86rem',
                  lineHeight: 1.55,
                  color: isCreator ? '#fef3c7' : '#e2e8f0',
                  paddingLeft: '2px',
                  wordBreak: 'break-word',
                }}>
                  {renderMessageContent(msg.text)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompt Chips for Quick Architect Interaction */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <Sparkles size={12} color="#fbbf24" />
          <span>Architect Quick Decrees (Click to prompt the 10 citizens):</span>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'thin'
        }}>
          {STARTER_PROMPTS.map((sp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(undefined, sp.prompt)}
              style={{
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Architect Chat Input Bar */}
      <form onSubmit={(e) => handleSendMessage(e)} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '8px 12px',
        borderRadius: '12px',
        border: '1px solid var(--border-highlight)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', flexShrink: 0, paddingLeft: '4px' }}>
          <Crown size={18} />
          <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>Architect:</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Speak to the AI citizens... (e.g. '@Thorne stop fighting', '@Aria explain your weights', 'Propose peace')"
          disabled={isSending}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f8fafc',
            fontSize: '0.88rem',
            fontFamily: 'inherit',
          }}
        />

        <button
          type="submit"
          disabled={!chatInput.trim() || isSending}
          className="btn btn-primary"
          style={{
            padding: '8px 18px',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderColor: '#f59e0b',
            color: '#040713',
            fontWeight: 800,
            flexShrink: 0
          }}
        >
          {justSent ? (
            <>
              <Check size={14} />
              <span>Transmitted</span>
            </>
          ) : (
            <>
              <Send size={14} />
              <span>Broadcast</span>
            </>
          )}
        </button>
      </form>

      {/* Subtle bottom note */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <span>Tip: Addressing an agent like <code>@Thorne</code> or <code>@Aria</code> directs your prompt specifically to their neural weights & archetype.</span>
        <span>Every tick, the agents converse autonomously and react to your decrees.</span>
      </div>

    </div>
  );
};
