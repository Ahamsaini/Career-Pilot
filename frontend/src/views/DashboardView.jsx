import React, { useEffect, useState } from 'react';
import { Video, Code2, GitBranch, HelpCircle, TrendingUp, Award, Zap, ArrowRight, CheckCircle2, AlertCircle, FileText, Loader2, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardView({ setCurrentTab }) {
  const { authFetch, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, pRes] = await Promise.all([
          authFetch('/api/analytics/performance'),
          authFetch('/api/profile'),
        ]);
        if (aRes.ok) setAnalytics(await aRes.json());
        if (pRes.ok) setProfile(await pRes.json());
      } catch (e) {
        console.error('Dashboard load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authFetch]);

  const firstName = user?.full_name?.split(' ')[0] || 'Student';
  const overallScore = analytics?.overall_score ?? analytics?.career_readiness_score ?? 0;
  const skillsScore = analytics?.skills_score ?? (analytics?.skills?.length > 0
    ? Math.round(analytics.skills.reduce((sum, s) => sum + (Number(s.score_percentage) || 0), 0) / analytics.skills.length)
    : 0);
  const codingScore = analytics?.coding_score ?? analytics?.stats?.coding?.pass_rate ?? 0;
  const interviewsCount = analytics?.interviews_count ?? analytics?.stats?.interviews?.count ?? 0;
  const targetRole = profile?.profile?.target_role || analytics?.target_role || 'Software Engineer';

  const weeklyDelta = analytics?.weekly_delta ?? (overallScore > 0 ? '+Active' : 'No data yet');

  const topSkills = (analytics?.top_skills || profile?.skills?.slice(0, 5) || analytics?.skills?.slice(0, 5) || []);

  const recommendedPractice = analytics?.recommendations?.length
    ? analytics.recommendations
    : analytics?.needs_practice?.length
    ? analytics.needs_practice.map(s => ({ name: s.skill_name, reason: `Score: ${Math.round(s.score_percentage)}% — needs further practice`, priority: Number(s.score_percentage) < 50 ? 'High' : 'Medium' }))
    : [];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader2 size={36} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your dashboard...</p>
        <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Hero Banner */}
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(238,242,255,0.95) 0%, rgba(245,247,255,0.9) 50%, rgba(255,255,255,0.95) 100%)',
        border: '1px solid rgba(79,70,229,0.2)',
        position: 'relative', overflow: 'hidden',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '650px' }}>
          <div className="badge badge-indigo" style={{ marginBottom: '12px' }}>
            <Zap size={14} /> Agentic AI Career Acceleration
          </div>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Welcome back, {firstName} 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '16px' }}>
            Targeting <strong style={{ color: 'var(--accent-primary)' }}>{targetRole}</strong>. Your agent is analyzing your performance to tailor next steps.
            {interviewsCount > 0 && ` You've completed ${interviewsCount} interview${interviewsCount !== 1 ? 's' : ''} so far.`}
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => setCurrentTab('interview')}>
              <Video size={18} /> Start Adaptive Interview
            </button>
            <button className="btn-secondary" onClick={() => setCurrentTab('coding')}>
              <Code2 size={18} /> Practice in Code Arena
            </button>
            <button className="btn-secondary" onClick={() => setCurrentTab('observability')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="var(--accent-primary)" /> Swarm Telemetry
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {/* Overall Readiness */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL READINESS</span>
            <Award size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{overallScore}%</span>
            <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>{weeklyDelta} this week</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', marginTop: '14px', overflow: 'hidden' }}>
            <div style={{ width: `${overallScore}%`, height: '100%', background: 'var(--gradient-primary)', transition: 'width 0.8s ease' }} />
          </div>
        </div>

        {/* Technical Skills */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>TECHNICAL SKILLS</span>
            <TrendingUp size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{skillsScore}%</span>
            {topSkills[0] && (
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                {typeof topSkills[0] === 'string' ? topSkills[0] : topSkills[0].skill_name} ↑
              </span>
            )}
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', marginTop: '14px', overflow: 'hidden' }}>
            <div style={{ width: `${skillsScore}%`, height: '100%', background: 'var(--gradient-cyan)', transition: 'width 0.8s ease' }} />
          </div>
        </div>

        {/* Coding & DSA */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>CODING & DSA</span>
            <Code2 size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{codingScore}%</span>
            <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
              {analytics?.tests_passed ?? 8}/{analytics?.tests_total ?? 10} Passed
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', marginTop: '14px', overflow: 'hidden' }}>
            <div style={{ width: `${codingScore}%`, height: '100%', background: 'var(--gradient-emerald)', transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* Recommendations + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recommended Practice */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recommended Practice</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>Target: {targetRole}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendedPractice.length > 0 ? recommendedPractice.map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={18} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>{item.name || item.skill_name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.reason}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge ${item.priority === 'High' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                    {item.priority}
                  </span>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setCurrentTab('roadmap')}>
                    Practice <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 12px', color: 'var(--accent-emerald)', opacity: 0.6 }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No practice areas identified yet</p>
                <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Upload your resume, take an interview or quiz to get personalized recommendations.</p>
                <button className="btn-primary" style={{ marginTop: '14px', padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => setCurrentTab('resume')}>
                  Upload Resume
                </button>
              </div>
            )}
          </div>
        </div>


        {/* Quick Actions */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>Quick Actions</h3>
          {[
            { tab: 'roadmap', icon: GitBranch, color: 'var(--accent-primary)', label: 'AI Roadmap Generator', sub: 'Personalized learning nodes' },
            { tab: 'quiz', icon: HelpCircle, color: 'var(--accent-cyan)', label: 'Take AI Quiz', sub: 'Test DBMS, OS, Java knowledge' },
            { tab: 'resume', icon: FileText, color: 'var(--accent-emerald)', label: 'Resume Intelligence', sub: 'Sync projects & skills' },
            { tab: 'performance', icon: TrendingUp, color: 'var(--accent-amber)', label: 'View Analytics', sub: 'Score trends & skill radar' },
          ].map(({ tab, icon: Icon, color, label, sub }) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <Icon size={20} color={color} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
