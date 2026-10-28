import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Award,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Sparkles
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function HistoryView({ setCurrentTab }) {
  const { authFetch } = useAuth();
  const [history, setHistory] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    authFetch('/api/interviews/history/all')
      .then(res => res.json())
      .then(d => setHistory(d))
      .catch(err => console.error('History fetch error:', err));
  }, [authFetch]);

  const handleViewReport = async (intId) => {
    setSelectedInterview(intId);
    try {
      const res = await authFetch(`/api/interviews/${intId}/report`);
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error('Error fetching report detail:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
          <Sparkles size={14} /> Historical Records
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Interview Session History</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedInterview ? '1fr 1.3fr' : '1fr', gap: '24px' }}>
        {/* Left: History Table / Cards */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Past Sessions</h3>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              <History size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No interview sessions completed yet.</p>
              <button
                className="btn-primary"
                style={{ marginTop: '16px' }}
                onClick={() => setCurrentTab('interview')}
              >
                Launch Your First Interview
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: selectedInterview === item.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: selectedInterview === item.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => handleViewReport(item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'var(--gradient-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Award size={20} color="#fff" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{item.title}</h4>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span> •
                        <span className="badge badge-indigo" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{item.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.overall_score && (
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        {item.overall_score}%
                      </span>
                    )}
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detailed Question-by-Question Review (Section 19) */}
        {selectedInterview && reportData && (
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Question-by-Question Review</h3>
              <span className="badge badge-emerald">Score: {reportData.report?.overall_score}%</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '600px', overflowY: 'auto' }}>
              {(reportData.qa_pairs || []).map((qa, idx) => (
                <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                    QUESTION {idx + 1} • {qa.topic}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '8px', color: '#fff' }}>
                    "{qa.question_text}"
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>Student Answer: </span>
                    {qa.final_text}
                  </div>

                  {qa.feedback && (
                    <div style={{ fontSize: '0.8rem', color: '#6ee7b7', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontWeight: 600 }}>AI Evaluation: </span>
                      {qa.feedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
