import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  CheckCircle2,
  Circle,
  Sparkles,
  BookOpen,
  CheckSquare,
  Layers,
  ArrowDown,
  Calendar
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function RoadmapView() {
  const { authFetch } = useAuth();
  const [roadmapData, setRoadmapData] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [completedModules, setCompletedModules] = useState({});

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
    try {
      const res = await authFetch('/api/roadmaps');
      const data = await res.json();
      setRoadmapData(data);
      if (data.modules?.length > 0) {
        setSelectedModule(data.modules[0]);
        const initialCompleted = {};
        data.modules.forEach(m => {
          if (m.is_completed) initialCompleted[m.id] = true;
        });
        setCompletedModules(initialCompleted);
      }
    } catch (err) {
      console.error('Roadmap fetch error:', err);
    }
  };

  const handleToggleComplete = async (moduleId) => {
    try {
      const res = await authFetch(`/api/roadmaps/toggle-module/${moduleId}`, { method: 'POST' });
      const data = await res.json();
      setCompletedModules(prev => ({
        ...prev,
        [moduleId]: data.completed
      }));
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const modules = roadmapData?.modules || [];
  const weeklyFocus = roadmapData?.weekly_focus || [
    { week: 'Week 1', items: ['SQL JOIN Optimization', 'PostgreSQL Indexing', 'Spring Security Fundamentals'] },
    { week: 'Week 2', items: ['Redis Caching Strategies', 'REST API Idempotency', 'Microservices Communication'] },
    { week: 'Week 3', items: ['System Design Scalability', 'Kafka Partitioning', 'Docker Container Orchestration'] }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
          <Sparkles size={14} /> AI Personalized Roadmap Generator
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
          {roadmapData?.roadmap?.roadmap_title || 'Java Backend Mastery Roadmap'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Generated dynamically from Student Profile + Resume + Interview Performance + Coding Gaps.
        </p>
      </div>

      {/* Weekly Focus Cards (Section 16) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {weeklyFocus.map((wf, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '20px', borderTop: `3px solid ${idx === 0 ? 'var(--accent-primary)' : idx === 1 ? 'var(--accent-cyan)' : 'var(--accent-emerald)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Calendar size={16} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{wf.week} Focus</h4>
            </div>
            <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0 }}>
              {wf.items.map((item, iidx) => (
                <li key={iidx} style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Interactive Node Graph & Module Details (Section 17) */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' }}>
        {/* Left: Interactive Node Tree */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '680px', overflowY: 'auto' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, padding: '4px 8px' }}>
            LEARNING NODES ({modules.length})
          </span>

          {modules.map((m, idx) => {
            const isCompleted = completedModules[m.id];
            const isSelected = selectedModule?.id === m.id;

            return (
              <React.Fragment key={m.id}>
                <button
                  onClick={() => setSelectedModule(m)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isCompleted ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#fff'
                    }}>
                      {m.step_order}
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                      {m.topic}
                    </span>
                  </div>

                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(m.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} color="var(--accent-emerald)" />
                    ) : (
                      <Circle size={18} color="var(--text-muted)" />
                    )}
                  </span>
                </button>

                {idx < modules.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
                    <ArrowDown size={14} color="rgba(255,255,255,0.2)" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right: Selected Node Details */}
        {selectedModule ? (
          <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-indigo" style={{ marginBottom: '6px' }}>
                  Node {selectedModule.step_order}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedModule.topic}</h3>
              </div>

              <button
                className={completedModules[selectedModule.id] ? 'btn-secondary' : 'btn-primary'}
                onClick={() => handleToggleComplete(selectedModule.id)}
              >
                {completedModules[selectedModule.id] ? 'Mark Incomplete' : 'Mark Completed ✓'}
              </button>
            </div>

            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Mastery Description
              </h4>
              <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
                {selectedModule.description}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Recommended Resources
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedModule.resources || []).map((r, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={16} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.86rem', color: '#fff' }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Practice Tasks & Coding Problems
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedModule.practice_tasks || []).map((t, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckSquare size={16} color="var(--accent-emerald)" />
                    <span style={{ fontSize: '0.86rem', color: '#fff' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
