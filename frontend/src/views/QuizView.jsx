import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
  BookOpen,
  Plus,
  X,
  Layers,
  Award,
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function QuizView() {
  const { authFetch } = useAuth();

  // Multi-subject state
  const defaultSubjects = [
    'DBMS',
    'Operating System',
    'Java',
    'Python',
    'Computer Networks',
    'Data Structures',
    'OOP',
    'C++',
    'System Design',
    'Aptitude & Reasoning'
  ];
  const [selectedSubjects, setSelectedSubjects] = useState(['DBMS', 'Operating System']);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [allSubjects, setAllSubjects] = useState(defaultSubjects);

  // Configuration options
  const [questionCount, setQuestionCount] = useState(5);
  const [customCountInput, setCustomCountInput] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');

  // Quiz execution state
  const [quizData, setQuizData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Live Timer state
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const timerRef = useRef(null);

  // Toggle subject selection
  const toggleSubject = (s) => {
    setSelectedSubjects(prev => {
      if (prev.includes(s)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(x => x !== s);
      } else {
        return [...prev, s];
      }
    });
  };

  // Add custom subject manually
  const handleAddCustomSubject = (e) => {
    e?.preventDefault();
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!allSubjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setAllSubjects(prev => [...prev, trimmed]);
    }
    if (!selectedSubjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedSubjects(prev => [...prev, trimmed]);
    }
    setCustomSubjectInput('');
  };

  // Remove a custom subject
  const removeSubject = (s, e) => {
    e.stopPropagation();
    if (selectedSubjects.length === 1 && selectedSubjects.includes(s)) return;
    setSelectedSubjects(prev => prev.filter(x => x !== s));
    setAllSubjects(prev => prev.filter(x => x !== s));
  };

  // Start & Generate Quiz
  const handleGenerateQuiz = async () => {
    if (selectedSubjects.length === 0) return;
    setLoading(true);
    setQuizResult(null);
    setUserAnswers({});
    setCurrentIndex(0);

    const actualCount = customCountInput ? parseInt(customCountInput, 10) || questionCount : questionCount;

    try {
      const res = await authFetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: selectedSubjects,
          difficulty,
          total_questions: actualCount,
          duration_minutes: durationMinutes
        })
      });
      const data = await res.json();

      if (!res.ok || data.error || !data.questions || data.questions.length === 0) {
        alert(data.error || 'Failed to generate quiz questions. Please try again.');
        setQuizData(null);
        return;
      }

      setQuizData(data);

      const secs = (data.quiz?.duration_minutes || durationMinutes) * 60;
      setRemainingSeconds(secs);
      setTotalSeconds(secs);
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      alert('Error communicating with server while generating quiz.');
      setQuizData(null);
    } finally {
      setLoading(false);
    }
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (quizData && !quizResult && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Auto submit on time out
            handleSubmitQuiz(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizData, quizResult, remainingSeconds]);

  const handleSelectOption = (option) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: option
    }));
  };

  const handleSubmitQuiz = async (isAutoTimeout = false) => {
    if (!quizData || !quizData.quiz) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);
    try {
      const formattedAnswers = quizData.questions.map((q, idx) => ({
        question_id: q.id,
        user_answer: userAnswers[idx] || '',
        time_taken_seconds: 20
      }));

      const res = await authFetch(`/api/quizzes/${quizData.quiz.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers })
      });
      const data = await res.json();
      setQuizResult({
        ...data,
        isAutoTimeout
      });
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const questions = quizData?.questions || [];
  const currentQ = questions[currentIndex];
  const timerPercentage = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  const isTimeCritical = remainingSeconds <= 60 && remainingSeconds > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
            <Sparkles size={14} /> Connected Agentic AI Assessment
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Dynamic Technical Assessment Engine
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Multi-subject test studio with custom subject tags, configurable duration, and adaptive difficulty.
          </p>
        </div>

        {quizData && !quizResult && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: isTimeCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(79, 70, 229, 0.06)',
            border: `1px solid ${isTimeCritical ? 'rgba(239, 68, 68, 0.3)' : 'rgba(79, 70, 229, 0.2)'}`,
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Clock size={20} color={isTimeCritical ? '#ef4444' : 'var(--accent-primary)'} className={isTimeCritical ? 'animate-pulse' : ''} />
            <div>
              <div style={{ fontSize: '0.72rem', color: isTimeCritical ? '#ef4444' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isTimeCritical ? 'Time Running Out' : 'Remaining Time'}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isTimeCritical ? '#ef4444' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {formatTimer(remainingSeconds)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quiz Setup Panel (only when not in active quiz) */}
      {!quizData && !quizResult && (
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. Multi-Subject Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Select Subjects ({selectedSubjects.length} Selected)
                </span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Pick one or multiple subjects to test simultaneously in a single customized exam.
                </p>
              </div>
              {selectedSubjects.length > 1 && (
                <button
                  onClick={() => setSelectedSubjects(['DBMS'])}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Reset selection
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {allSubjects.map(s => {
                const isSelected = selectedSubjects.includes(s);
                const isCustom = !defaultSubjects.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: isSelected ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 3px rgba(79, 70, 229, 0.1)' : 'none'
                    }}
                  >
                    {isSelected && <Check size={14} color="var(--accent-primary)" />}
                    <span>{s}</span>
                    {isCustom && (
                      <span
                        onClick={(e) => removeSubject(s, e)}
                        title="Remove custom subject"
                        style={{ marginLeft: '4px', opacity: 0.6, display: 'inline-flex' }}
                      >
                        <X size={13} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Add Custom Subject Form */}
            <form onSubmit={handleAddCustomSubject} style={{ display: 'flex', gap: '8px', marginTop: '12px', maxWidth: '400px' }}>
              <input
                type="text"
                value={customSubjectInput}
                onChange={e => setCustomSubjectInput(e.target.value)}
                placeholder="Add custom subject (e.g. Spring Boot, Docker, React)..."
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!customSubjectInput.trim()}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> Add
              </button>
            </form>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)' }} />

          {/* 2. Parameters Grid: Questions Count, Duration, Difficulty */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Number of Questions */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Number of Questions
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[5, 10, 15, 20].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => { setQuestionCount(cnt); setCustomCountInput(''); }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${questionCount === cnt && !customCountInput ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: questionCount === cnt && !customCountInput ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                      color: questionCount === cnt && !customCountInput ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {cnt} Qs
                  </button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Custom"
                    value={customCountInput}
                    onChange={(e) => {
                      setCustomCountInput(e.target.value);
                      if (e.target.value) setQuestionCount(parseInt(e.target.value, 10) || 5);
                    }}
                    style={{
                      width: '80px',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${customCountInput ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Time Period / Duration */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Time Period / Duration
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: '5 Mins', val: 5 },
                  { label: '10 Mins', val: 10 },
                  { label: '15 Mins', val: 15 },
                  { label: '30 Mins', val: 30 }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDurationMinutes(item.val)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${durationMinutes === item.val ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: durationMinutes === item.val ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                      color: durationMinutes === item.val ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Clock size={13} /> {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Difficulty Level
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'easy', label: 'Easy', badge: 'badge-emerald' },
                  { id: 'medium', label: 'Medium', badge: 'badge-amber' },
                  { id: 'hard', label: 'Hard', badge: 'badge-rose' }
                ].map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${difficulty === d.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: difficulty === d.id ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                      color: difficulty === d.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Summary: <strong style={{ color: 'var(--text-primary)' }}>{questionCount} Questions</strong> covering{' '}
              <strong style={{ color: 'var(--accent-primary)' }}>{selectedSubjects.join(' + ')}</strong> •{' '}
              <strong>{durationMinutes} mins</strong> timer •{' '}
              <span className={`badge ${difficulty === 'easy' ? 'badge-emerald' : difficulty === 'hard' ? 'badge-rose' : 'badge-amber'}`} style={{ textTransform: 'capitalize' }}>
                {difficulty}
              </span>
            </div>

            <button
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: '0.92rem' }}
              onClick={handleGenerateQuiz}
              disabled={loading || selectedSubjects.length === 0}
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <BookOpen size={16} />}
              {loading ? 'Synthesizing Adaptive Exam...' : 'Generate & Start Quiz'}
            </button>
          </div>
        </div>
      )}

      {/* Quiz Workspace */}
      {quizResult ? (
        /* Result Screen */
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '720px', margin: '0 auto', width: '100%' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: quizResult.score >= 70 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Award size={36} color={quizResult.score >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)'} />
          </div>

          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {quizResult.score >= 70 ? 'Quiz Successfully Mastered!' : 'Quiz Attempt Completed'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.92rem' }}>
            Subjects: {quizData?.quiz?.subject || selectedSubjects.join(', ')} • Difficulty: <strong style={{ textTransform: 'capitalize' }}>{difficulty}</strong>
          </p>

          {quizResult.isAutoTimeout && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', color: '#ef4444', fontSize: '0.85rem', marginBottom: '24px' }}>
              <AlertTriangle size={16} /> Time limit expired: Exam was automatically submitted.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '24px 36px', borderRadius: 'var(--radius-md)', marginBottom: '32px' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>FINAL SCORE</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: quizResult.score >= 70 ? 'var(--accent-primary)' : 'var(--accent-amber)', marginTop: '2px' }}>
                {quizResult.score}%
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--border-color)' }} />
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>CORRECT ANSWERS</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                {quizResult.correct} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/ {quizResult.total}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
            <button
              className="btn-primary"
              onClick={() => { setQuizData(null); setQuizResult(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RotateCcw size={16} /> Configure Another Quiz
            </button>
          </div>
        </div>
      ) : currentQ ? (
        /* Active Question Screen */
        <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Progress Bar & Sub-header */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-indigo">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {currentQ.subject && (
                  <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                    {currentQ.subject}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {currentQ.question_type || 'MCQ'}
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {Math.round(((currentIndex + 1) / questions.length) * 100)}% Completed
              </span>
            </div>

            {/* Linear Progress Indicator */}
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                  height: '100%',
                  background: 'var(--gradient-primary)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Question Text */}
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.5, color: 'var(--text-primary)' }}>
            {currentQ.question_text}
          </h3>

          {/* Options List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              let optList = [];
              if (Array.isArray(currentQ.options)) {
                optList = currentQ.options;
              } else if (typeof currentQ.options === 'string') {
                try {
                  const parsed = JSON.parse(currentQ.options);
                  optList = Array.isArray(parsed) ? parsed : [currentQ.options];
                } catch {
                  optList = [currentQ.options];
                }
              }

              return optList.map((opt, oidx) => {
                const isSelected = userAnswers[currentIndex] === opt;
                return (
                  <button
                    key={oidx}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      background: isSelected ? 'rgba(79, 70, 229, 0.06)' : '#ffffff',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.92rem',
                      fontWeight: isSelected ? 600 : 500,
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.08)' : 'var(--shadow-sm)'
                    }}
                  >
                    <span style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + oidx)}
                    </span>
                    <span style={{ flex: 1 }}>{opt}</span>
                  </button>
                );
              });
            })()}
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button
              className="btn-secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              style={{ opacity: currentIndex === 0 ? 0.5 : 1 }}
            >
              Previous
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: currentIndex === idx ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: userAnswers[idx] ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                    color: userAnswers[idx] ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                className="btn-primary"
                onClick={() => setCurrentIndex(prev => prev + 1)}
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="btn-primary"
                style={{ background: 'var(--accent-emerald)' }}
                onClick={() => handleSubmitQuiz(false)}
                disabled={loading}
              >
                {loading ? 'Grading...' : 'Submit Exam'}
              </button>
            )}
          </div>
        </div>
      ) : quizData ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <AlertTriangle size={40} color="var(--accent-amber)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No Questions Available
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            The assessment engine could not load questions for this attempt. Please try re-generating with your chosen subjects.
          </p>
          <button
            className="btn-primary"
            onClick={() => { setQuizData(null); setQuizResult(null); }}
          >
            ← Back to Quiz Configuration
          </button>
        </div>
      ) : null}
    </div>
  );
}
