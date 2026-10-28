import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  Calendar
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function PerformanceView() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    authFetch('/api/analytics/performance')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(err => console.error('Performance fetch error:', err));
  }, [authFetch]);

  const skills = data?.skills?.length ? data.skills : [];
  const strongAreas = data?.strong_areas?.length ? data.strong_areas : (data?.skills || []).filter(s => s.is_strong);
  const needsPractice = data?.needs_practice?.length ? data.needs_practice : (data?.skills || []).filter(s => s.needs_practice);
  const timeline = data?.history_timeline?.length ? data.history_timeline : [];


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
          <Sparkles size={14} /> Student Performance Engine
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Skill Profile & Historical Analytics</h2>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Left: Skill Breakdown Bars (Section 15) */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px' }}>
            Comprehensive Skill Mastery Profile
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {skills.length > 0 ? skills.map((s, idx) => {
              const score = Number(s.score_percentage);
              const color = score >= 75 ? 'var(--gradient-emerald)' : score >= 60 ? 'var(--gradient-cyan)' : 'var(--gradient-primary)';
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{s.skill_name}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: score >= 75 ? 'var(--accent-emerald)' : '#fff' }}>
                      {Math.round(score)}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '5px', transition: 'width 0.8s ease-out' }} />
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <TrendingUp size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No skill data yet</p>
                <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Upload your resume, take an interview or quiz to see your skill mastery profile.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Strong Areas & Needs Practice */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Strong Areas */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Strong Areas</h4>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {strongAreas.length > 0 ? strongAreas.map((s, idx) => (
                <span key={idx} className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                  {s.skill_name} • {Math.round(Number(s.score_percentage))}%
                </span>
              )) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No strong areas yet. Complete interviews to discover yours.</span>
              )}
            </div>
          </div>

          {/* Needs Practice */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Needs Practice</h4>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {needsPractice.length > 0 ? needsPractice.map((s, idx) => (
                <span key={idx} className="badge badge-amber" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                  {s.skill_name} • {Math.round(Number(s.score_percentage))}%
                </span>
              )) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No practice areas identified yet. Complete interviews or quizzes.</span>
              )}
            </div>
          </div>

          {/* Progress Timeline Chart (Section 19) */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Calendar size={18} color="var(--accent-primary)" />
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Interview Progress Over Time</h4>
            </div>
            {timeline.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', paddingTop: '20px' }}>
                {timeline.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {Math.round(item.score || item.overall_score || 0)}%
                    </span>
                    <div style={{
                      width: '32px',
                      height: `${((item.score || item.overall_score || 0) / 100) * 80}px`,
                      background: 'var(--gradient-primary)',
                      borderRadius: '6px 6px 0 0'
                    }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.date || item.created_at?.slice(5, 10)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                <p style={{ fontSize: '0.85rem' }}>Complete interviews to see your score progression over time.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
