import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Zap, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw, Terminal, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AgentObservability() {
  const { authFetch } = useAuth();
  const [runs, setRuns] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTelemetry = async () => {
    try {
      setIsRefreshing(true);
      const res = await authFetch('/api/analytics/agent-runs');
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Error fetching agent telemetry:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000); // auto refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const AGENTS = [
    { name: 'Resume Parser Agent', type: 'Ingestion & Extraction', status: 'Active', latency: '120ms', desc: 'Parses PDF/DOCX, extracts verified skills & projects into DB' },
    { name: 'Interview Supervisor Graph', type: 'LangGraph State Machine', status: 'Active', latency: '450ms', desc: 'Adaptive interview engine with deduplication & resume probing' },
    { name: 'Coding Sandbox Agent', type: 'Execution & Evaluation', status: 'Active', latency: '380ms', desc: 'Isolated code execution with 1.2x skill evidence weight' },
    { name: 'Quiz Intelligence Agent', type: 'Adaptive Questioning', status: 'Active', latency: '210ms', desc: 'Prioritizes candidate weak skills & missed concepts' },
    { name: 'Roadmap Architect Agent', type: 'Curriculum Synthesis', status: 'Active', latency: '350ms', desc: 'Builds targeted learning paths bridging verified skill gaps' },
    { name: 'Skill Evidence Synthesizer', type: 'Bayesian Aggregator', status: 'Active', latency: '80ms', desc: 'Evidence-weighted multi-agent scoring (1.2x/1.0x/0.8x/0.5x)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.4)'
          }}>
            <Cpu size={26} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Connected Agentic AI Ecosystem
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                Shared Intelligence Active
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Single persistent student career profile synchronizing 6 autonomous AI agents with cross-agent event bus.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTelemetry}
          disabled={isRefreshing}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Telemetry
        </button>
      </div>

      {/* Agents Grid */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="var(--accent-primary)" />
          Active Swarm Agents & Specializations
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {AGENTS.map((agent, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                    {agent.name}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: '500' }}>
                    {agent.type}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontWeight: '600'
                }}>
                  {agent.status}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {agent.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Event Bus & Telemetry Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Event Bus Log */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--accent-primary)" />
              Career Events Bus Activity
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {events.length} events logged
            </span>
          </div>

          {events.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No cross-agent events triggered yet. Upload a resume, take a quiz, or start an interview to watch the event bus in action!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {events.map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: ev.event_type.includes('COMPLETED') || ev.event_type.includes('FINISHED') ? '#10b981' : 'var(--accent-primary)'
                    }} />
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {ev.event_type}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidence Weighting Info */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '20px'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="#10b981" />
            Evidence-Weighted Skill Formula
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
            The Skill Intelligence Agent merges outcomes from multiple sources with mathematical weighting to eliminate single-test bias:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { source: 'Coding Sandbox Evaluation', weight: '1.2x (Highest)', desc: 'Objective test case execution & complexity analysis' },
              { source: 'Technical Interview Performance', weight: '1.0x', desc: 'LangGraph speech & deep architecture probing' },
              { source: 'CS Core Quizzes', weight: '0.8x', desc: 'Conceptual MCQs & scenario reasoning questions' },
              { source: 'Declared Resume Skills', weight: '0.5x (Baseline)', desc: 'Parsed from PDF/DOCX candidate documents' }
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {item.source}
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                  {item.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
