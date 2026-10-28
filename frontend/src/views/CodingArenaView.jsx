import React, { useState, useEffect } from 'react';
import {
  Code2,
  Play,
  Terminal,
  CheckCircle2,
  XCircle,
  Database,
  Bug,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function CodingArenaView() {
  const { authFetch } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [evalResult, setEvalResult] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, [categoryFilter]);

  const fetchQuestions = async () => {
    try {
      const url = categoryFilter === 'all'
        ? '/api/coding/questions'
        : `/api/coding/questions?category=${categoryFilter}`;
      const res = await authFetch(url);
      const data = await res.json();
      setQuestions(data);
      if (data.length > 0 && !selectedQuestion) {
        setSelectedQuestion(data[0]);
        setCode(data[0].starter_code || '');
      }
    } catch (err) {
      console.error('Failed to fetch coding questions:', err);
    }
  };

  const handleSelectQuestion = (q) => {
    setSelectedQuestion(q);
    setCode(q.starter_code || '');
    setEvalResult(null);
    if (q.category === 'database') {
      setSelectedLanguage('sql');
    }
  };

  const handleRunCode = async () => {
    if (!selectedQuestion) return;
    setLoading(true);
    setEvalResult(null);
    try {
      const res = await authFetch('/api/coding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: selectedQuestion.id,
          code,
          language: selectedLanguage
        })
      });
      const data = await res.json();
      setEvalResult(data.evaluation);
    } catch (err) {
      console.error('Code execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
            <Sparkles size={14} /> Sandboxed Test Runner
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Multi-Language Coding & SQL Arena</h2>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: 'All Problems' },
            { id: 'dsa', label: 'DSA' },
            { id: 'database', label: 'SQL' },
            { id: 'debugging', label: 'Debugging' },
            { id: 'programming', label: 'System OOP' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={categoryFilter === cat.id ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left: Problem List */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '720px', overflowY: 'auto' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, padding: '4px 8px' }}>
            AVAILABLE CHALLENGES ({questions.length})
          </span>

          {questions.map(q => {
            const isSelected = selectedQuestion?.id === q.id;
            return (
              <button
                key={q.id}
                onClick={() => handleSelectQuestion(q)}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className={`badge ${q.difficulty === 'easy' ? 'badge-emerald' : q.difficulty === 'hard' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                    {q.difficulty}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {q.category}
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{q.title}</div>
              </button>
            );
          })}
        </div>

        {/* Right: Code Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Problem Details */}
          {selectedQuestion && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedQuestion.title}</h3>
                <span className="badge badge-indigo">{selectedQuestion.category.toUpperCase()}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {selectedQuestion.description}
              </p>
            </div>
          )}

          {/* Editor Header Bar */}
          <div className="glass-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Terminal size={18} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Editor</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  background: '#ffffff',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              >
                <option value="python">Python 3.13</option>
                <option value="java">Java 21</option>
                <option value="sql">PostgreSQL / SQL</option>
                <option value="javascript">JavaScript (ESM)</option>
                <option value="cpp">C++20</option>
              </select>
            </div>

            <button
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={handleRunCode}
              disabled={loading}
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} fill="#fff" />}
              {loading ? 'Evaluating...' : 'Run & Test'}
            </button>
          </div>

          {/* Code Textarea */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono"
            spellCheck="false"
            style={{
              width: '100%',
              minHeight: '260px',
              background: '#040711',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              color: '#38bdf8',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none'
            }}
          />

          {/* Evaluation Results Card (Section 11) */}
          {evalResult && (
            <div className="glass-card" style={{ padding: '20px', borderLeft: `4px solid ${evalResult.compiled ? 'var(--accent-emerald)' : 'var(--accent-rose)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                {evalResult.compiled ? (
                  <CheckCircle2 size={20} color="var(--accent-emerald)" />
                ) : (
                  <XCircle size={20} color="var(--accent-rose)" />
                )}
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {evalResult.compiled ? 'Solution Evaluated' : 'Compilation / Runtime Error'}
                </h4>
                <span className={`badge ${evalResult.compiled ? 'badge-emerald' : 'badge-rose'}`} style={{ marginLeft: 'auto' }}>
                  {evalResult.compiled ? 'Compiled ✓' : 'Failed'}
                </span>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TEST CASES</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {evalResult.test_cases_passed} / {evalResult.test_cases_total}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CORRECTNESS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    {evalResult.correctness_pct}%
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TIME COMPLEXITY</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                    {evalResult.time_complexity}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CODE QUALITY</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>
                    {evalResult.code_quality_score} / 10
                  </div>
                </div>
              </div>

              {/* Console Output */}
              <div style={{ background: '#020617', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Console Output</div>
                <pre className="font-mono" style={{ fontSize: '0.82rem', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                  {evalResult.compiler_output}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
