import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Clock,
  Send,
  Edit3,
  CheckCircle,
  Sparkles,
  Bot,
  RefreshCw,
  Award,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function InterviewView() {
  const { authFetch } = useAuth();
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [cameraActive, setCameraActive] = useState(true);
  const [evaluation, setEvaluation] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [availableVoices, setAvailableVoices] = useState([]);

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechKeepAliveRef = useRef(null);

  const [activeResume, setActiveResume] = useState(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [difficulty, setDifficulty] = useState('medium');

  // Load available voices for SpeechSynthesis
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (speechKeepAliveRef.current) clearInterval(speechKeepAliveRef.current);
    };
  }, []);

  // Load active resume and profile on mount
  useEffect(() => {
    authFetch('/api/resume/active')
      .then(r => r.json())
      .then(d => {
        if (d.active_resume) {
          setActiveResume(d.active_resume);
          if (d.active_resume.parsed?.target_role) {
            setTargetRole(d.active_resume.parsed.target_role);
          }
        }
      })
      .catch(err => console.error('Failed to load active resume context:', err));
  }, [authFetch]);

  // Setup WebRTC camera preview
  useEffect(() => {
    let stream = null;
    if (cameraActive) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => console.log('Camera access optional:', err));
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [cameraActive]);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event) => {
        let full = '';
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript;
        }
        setTranscript(full);
      };

      recognitionRef.current = recog;
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!session || finalReport || remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [session, finalReport, remainingSeconds]);

  // Stop active speech
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (speechKeepAliveRef.current) clearInterval(speechKeepAliveRef.current);
    setIsSpeaking(false);
  };

  // Robust Text to Speech with natural voice selection & Chrome keep-alive
  const speakQuestion = (text) => {
    if (!text || !('speechSynthesis' in window)) return;
    try {
      stopSpeaking();

      // Small delay allows Chromium audio pipeline to cleanly reset
      setTimeout(() => {
        window.speechSynthesis.resume();
        const cleanText = text.replace(/[*_#`"]/g, '').trim();
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.rate = 0.98;
        utter.pitch = 1.0;
        utter.lang = 'en-US';

        const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Ava') || v.name.includes('Jenny')) && v.lang.startsWith('en')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (preferredVoice) utter.voice = preferredVoice;

        utter.onstart = () => {
          setIsSpeaking(true);
          // Chrome bug workaround: periodic resume for utterances > 15s
          if (speechKeepAliveRef.current) clearInterval(speechKeepAliveRef.current);
          speechKeepAliveRef.current = setInterval(() => {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            } else {
              clearInterval(speechKeepAliveRef.current);
            }
          }, 10000);
        };

        utter.onend = () => {
          if (speechKeepAliveRef.current) clearInterval(speechKeepAliveRef.current);
          setIsSpeaking(false);
        };

        utter.onerror = (e) => {
          console.warn('SpeechSynthesis notice:', e);
          if (speechKeepAliveRef.current) clearInterval(speechKeepAliveRef.current);
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utter);
      }, 70);
    } catch (err) {
      console.warn('Speech failed:', err);
      setIsSpeaking(false);
    }
  };

  // Automatically speak the question whenever a new question is loaded
  useEffect(() => {
    if (currentQuestion && autoSpeak && !finalReport) {
      const qText = currentQuestion.question_text || currentQuestion.question || '';
      if (qText) {
        speakQuestion(qText);
      }
    }
  }, [currentQuestion?.id, autoSpeak, finalReport]);

  const handleStartInterview = async () => {
    // Unlock browser audio context on user click
    if ('speechSynthesis' in window) {
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      window.speechSynthesis.speak(warmup);
    }

    setLoading(true);
    setEvaluation(null);
    setFinalReport(null);
    try {
      const dynamicTitle = `${targetRole} Technical Interview`;
      const res = await authFetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dynamicTitle,
          target_role: targetRole,
          difficulty,
          duration_minutes: 30
        })
      });
      const data = await res.json();
      setSession(data.interview);
      setCurrentQuestion(data.current_question);
      setRemainingSeconds(data.current_question?.allocated_time_seconds || 120);
      setTranscript('');
      // Auto-speak will also trigger via useEffect, but call here for immediate response
      if (autoSpeak) {
        speakQuestion(data.current_question?.question_text);
      }
    } catch (err) {
      console.error('Failed to start interview:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!speechSupported) {
      alert('Speech Recognition is supported on Chrome/Edge. You can also type or edit your answer directly.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) {
      alert('Please provide or speak your answer before submitting.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setLoading(true);
    try {
      const res = await authFetch(`/api/interviews/${session.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          final_text: transcript,
          duration_seconds: (currentQuestion.allocated_time_seconds || 120) - remainingSeconds
        })
      });
      const data = await res.json();
      setEvaluation(data.evaluation);

      if (data.is_completed) {
        // Fetch report
        const repRes = await authFetch(`/api/interviews/${session.id}/report`);
        const repData = await repRes.json();
        setFinalReport(repData);
      } else if (data.next_question) {
        setCurrentQuestion(data.next_question);
        setRemainingSeconds(data.next_question.allocated_time_seconds || 120);
        setTranscript('');
        speakQuestion(data.next_question.question_text);
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Session Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
            <Sparkles size={14} /> Dynamic LangGraph Session
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Agentic Virtual Interview Studio</h2>
        </div>

        {session && !finalReport && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              color: '#fda4af',
              fontWeight: 700,
              fontSize: '1rem'
            }}>
              <Clock size={18} />
              <span>{formatTime(remainingSeconds)} allocated</span>
            </div>
          </div>
        )}
      </div>

      {!session ? (
        /* Pre-interview configuration card */
        <div className="glass-card" style={{ padding: '36px', maxWidth: '700px', margin: '30px auto' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)'
          }}>
            <Bot size={36} color="#fff" />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px', textAlign: 'center' }}>
            Ready to Begin Your Adaptive Interview?
          </h3>

          {/* Dynamic resume context block */}
          {activeResume ? (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '22px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Resume Loaded ✓</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <strong>Target:</strong> {activeResume.parsed?.target_role || targetRole}
              </div>
              {activeResume.parsed?.projects?.length > 0 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <strong>Projects:</strong> {activeResume.parsed.projects.slice(0, 2).map(p => p.name || p.title).join(', ')}
                </div>
              )}
              {activeResume.parsed?.skills?.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {activeResume.parsed.skills.slice(0, 6).map((s, i) => (
                    <span key={i} className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '18px', textAlign: 'center' }}>
              The AI agent will dynamically create questions based on your career profile and uploaded resume. Upload a resume for the most personalized questions.
            </p>
          )}

          {/* Role & Difficulty selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>TARGET ROLE</label>
              <input
                type="text"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. Python Backend Developer"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>DIFFICULTY</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '1rem', width: '100%' }}
            onClick={handleStartInterview}
            disabled={loading}
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Video size={20} />}
            {loading ? 'Initializing Agent Workflow...' : 'Launch Agentic Interview'}
          </button>
        </div>
      ) : finalReport ? (
        /* Final Interview Report Card */
        <div className="glass-card" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            <Award size={32} color="var(--accent-emerald)" />
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Interview Performance Report</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {finalReport.interview?.target_role || targetRole} • {finalReport.report ? 'AI Analysis Complete' : 'Processing...'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>OVERALL SCORE</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
                {finalReport.report?.overall_score !== undefined ? `${Math.round(finalReport.report.overall_score)}%` : 'N/A'}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>TECHNICAL KNOWLEDGE</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                {finalReport.report?.technical_knowledge_score !== undefined ? `${Math.round(finalReport.report.technical_knowledge_score)}%` : 'N/A'}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>COMMUNICATION</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                {finalReport.report?.communication_score !== undefined ? `${Math.round(finalReport.report.communication_score)}%` : 'N/A'}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>LOGICAL REASONING</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '4px' }}>
                {finalReport.report?.logical_reasoning_score !== undefined ? `${Math.round(finalReport.report.logical_reasoning_score)}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Strengths and Weaknesses from real evaluation */}
          {(finalReport.report?.strengths?.length > 0 || finalReport.report?.weaknesses?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '8px' }}>✓ STRENGTHS</div>
                {(finalReport.report.strengths || []).map((s, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>• {s}</div>
                ))}
              </div>
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: '8px' }}>⚡ TO IMPROVE</div>
                {(finalReport.report.weaknesses || []).map((w, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>• {w}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '28px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Agent Summary & Evaluation</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.92rem', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              {finalReport.report?.detailed_summary || 'Interview evaluation complete. Your performance has been recorded.'}
            </p>
          </div>

          <button className="btn-primary" onClick={() => { setSession(null); setFinalReport(null); }}>
            Start New Session
          </button>
        </div>
      ) : (
        /* Active Interview Studio Screen (Section 27) */
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: '24px' }}>
          {/* Left Column: AI Persona & Student Cam Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* AI Interviewer Persona Card */}
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSpeaking ? '0 0 25px rgba(225, 29, 72, 0.6)' : '0 0 20px rgba(99, 102, 241, 0.5)',
                transition: 'all 0.3s ease'
              }}>
                <Bot size={28} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Lead Technical Interviewer</h4>
                  {isSpeaking ? (
                    <span className="badge badge-rose" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Volume2 size={12} className="animate-pulse" /> Speaking
                    </span>
                  ) : (
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Active</span>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Topic: {currentQuestion?.topic || 'Project Architecture'}
                </p>
              </div>
              <button
                className={isSpeaking ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 12px', background: isSpeaking ? 'var(--accent-rose)' : undefined }}
                title={isSpeaking ? 'Stop voice reading' : 'Speak Question Out Loud'}
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    speakQuestion(currentQuestion?.question_text || currentQuestion?.question);
                  }
                }}
              >
                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* Student WebRTC Preview */}
            <div className="glass-card" style={{ position: 'relative', height: '280px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px' }}>
                <span className="badge badge-indigo">
                  <Video size={12} /> Candidate Cam
                </span>
                {isRecording && (
                  <span className="badge badge-rose">
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f43f5e', animation: 'pulse 1s infinite' }} />
                    Recording Audio
                  </span>
                )}
              </div>

              {/* Waveform visualizer */}
              {isRecording && (
                <div style={{ position: 'absolute', bottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: '20px' }}>
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <span style={{ fontSize: '0.72rem', color: '#fff', marginLeft: '6px' }}>Listening...</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Question & Dynamic Answer Submission */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Dynamic Question Card */}
            <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid var(--accent-primary)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(79, 70, 229, 0.08)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                    QUESTION #{currentQuestion?.question_order || 1}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {currentQuestion?.topic || 'Technical Deep Dive'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isSpeaking && (
                    <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
                      <Volume2 size={13} className="animate-pulse" /> Speaking Question
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Allocated: {currentQuestion?.allocated_time_seconds || 120}s
                  </span>
                </div>
              </div>

              {/* Crystal-clear high-contrast question box */}
              <div style={{
                background: 'rgba(79, 70, 229, 0.03)',
                border: '1px solid rgba(79, 70, 229, 0.12)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                marginBottom: '14px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} /> Interviewer Question
                </div>
                <h3 style={{
                  fontSize: '1.24rem',
                  fontWeight: 700,
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  "{currentQuestion?.question_text || currentQuestion?.question || 'Preparing next dynamic question according to your technical profile...'}"
                </h3>
              </div>

              {/* Voice action and auto-speak toggle bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    className={isSpeaking ? 'btn-primary' : 'btn-secondary'}
                    style={{
                      padding: '7px 14px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isSpeaking ? 'var(--accent-rose)' : undefined
                    }}
                    onClick={() => {
                      if (isSpeaking) {
                        stopSpeaking();
                      } else {
                        speakQuestion(currentQuestion?.question_text || currentQuestion?.question);
                      }
                    }}
                    title={isSpeaking ? 'Stop speaking' : 'Read question out loud'}
                  >
                    {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    {isSpeaking ? 'Stop Speaking' : 'Speak Question'}
                  </button>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoSpeak}
                      onChange={(e) => setAutoSpeak(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                    <span>Auto-speak new questions</span>
                  </label>
                </div>

                {currentQuestion?.rationale && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '350px', textAlign: 'right' }}>
                    Focus: {currentQuestion.rationale}
                  </div>
                )}
              </div>
            </div>

            {/* Student Answer Input / Speech-to-Text Box */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Student Response (Speech or Type)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={isRecording ? 'btn-primary' : 'btn-secondary'}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      background: isRecording ? 'var(--accent-rose)' : undefined
                    }}
                    onClick={toggleRecording}
                  >
                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                    {isRecording ? 'Stop Mic' : 'Record Mic'}
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit3 size={14} /> Edit Answer
                  </button>
                </div>
              </div>

              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Speak through your microphone or type your technical answer here. The agent analyzes correctness, communication clarity, and architectural tradeoffs..."
                style={{
                  width: '100%',
                  minHeight: '125px',
                  background: '#ffffff',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  lineHeight: 1.55,
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  className="btn-primary"
                  onClick={handleSubmitAnswer}
                  disabled={loading}
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                  {loading ? 'Evaluating Response...' : 'Submit Answer'}
                </button>
              </div>
            </div>

            {/* Live Evaluation Card */}
            {evaluation && (
              <div className="glass-card" style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <CheckCircle size={18} color="var(--accent-emerald)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Answer Evaluation</h4>
                  <span className="badge badge-emerald" style={{ marginLeft: 'auto' }}>
                    Technical: {evaluation.technical_score}/10
                  </span>
                  <span className="badge badge-cyan">
                    Comm: {evaluation.communication_score}/10
                  </span>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {evaluation.feedback}
                </p>
                {evaluation.expected_answer && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Key Concepts Expected:</strong> {evaluation.expected_answer}
                  </div>
                )}
                {evaluation.delivery_metrics && (
                  <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Pace: {evaluation.delivery_metrics.speaking_pace}</span>
                    <span>Fillers: {evaluation.delivery_metrics.filler_words}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
