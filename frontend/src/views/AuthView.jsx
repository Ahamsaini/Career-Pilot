import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, Mail, Lock, User, Eye, EyeOff, Sparkles, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthView() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.full_name.trim()) { setError('Full name is required'); setLoading(false); return; }
        await register(form.full_name, form.email, form.password);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px 12px 42px',
    background: '#ffffff',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    color: '#0f172a',
    fontSize: '0.92rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  };

  const features = [
    { icon: '🎯', text: 'Adaptive AI Interview Engine' },
    { icon: '🧠', text: 'LangGraph Multi-Agent Evaluation' },
    { icon: '📄', text: 'ATS-Optimized Resume Builder' },
    { icon: '💻', text: 'Multi-Language Code Sandbox' },
    { icon: '📊', text: 'Real-Time Skill Analytics' },
    { icon: '🗺️', text: 'Personalized Career Roadmap' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f8fafc',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient Glows */}
      <div style={{ position: 'absolute', top: '-10vw', left: '-5vw', width: '45vw', height: '45vw', background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10vw', right: '-5vw', width: '45vw', height: '45vw', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Left Panel — Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        borderRight: '1px solid #e2e8f0',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(79,70,229,0.3)',
          }}>
            <Bot size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Career Pilot
            </div>
            <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Agentic AI SaaS Platform
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '36px' }}>
          <div className="badge badge-indigo" style={{ marginBottom: '16px' }}>
            <Sparkles size={13} /> AI-Powered Career Acceleration
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '16px' }}>
            Master Your Next<br />
            <span style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              High-Paying Tech Role
            </span>
          </h1>
          <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7, maxWidth: '440px' }}>
            An intelligent, formal SaaS career suite running autonomous agents for adaptive interviews, code execution, ATS resume synthesis, and skill roadmaps.
          </p>
        </div>

        {/* Feature Checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '480px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155', fontWeight: 500 }}>
              <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '40px', padding: '16px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', maxWidth: '480px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Instant Demo Access
          </div>
          <div style={{ fontSize: '0.88rem', color: '#0f172a' }}>
            Email: <strong style={{ color: '#4f46e5' }}>demo@careerpilot.ai</strong> &nbsp;|&nbsp;
            Password: <strong style={{ color: '#4f46e5' }}>demo123456</strong>
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div style={{
        width: '480px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08), 0 0 1px 1px rgba(0,0,0,0.02)',
        }}>
          {/* Tab Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '28px' }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '9px', borderRadius: '8px', border: 'none',
                  background: mode === m ? '#ffffff' : 'none',
                  color: mode === m ? '#4f46e5' : '#64748b',
                  fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                {m === 'login' ? '🔐 Sign In' : '✨ Create Account'}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '24px' }}>
            {mode === 'login' ? 'Sign in to access your AI Career workspace' : 'Start your journey with adaptive AI career tools'}
          </p>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#dc2626', fontSize: '0.88rem', marginBottom: '20px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full Name (register only) */}
            {mode === 'register' && (
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={form.full_name}
                  onChange={set('full_name')}
                  required
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={set('email')}
                required
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={set('password')}
                required
                style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ padding: '13px', fontSize: '0.95rem', marginTop: '6px', width: '100%' }}
            >
              {loading
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {mode === 'login' ? 'Signing In...' : 'Creating Account...'}</>
                : <>{mode === 'login' ? 'Sign In to Workspace' : 'Create Free Account'} <ArrowRight size={18} /></>
              }
            </button>
          </form>

          {/* Mode Toggle */}
          <p style={{ textAlign: 'center', fontSize: '0.88rem', color: '#64748b', marginTop: '24px' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
            >
              {mode === 'login' ? 'Create one →' : 'Sign In →'}
            </button>
          </p>

          {/* Demo Quick Login */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => { setForm({ ...form, email: 'demo@careerpilot.ai', password: 'demo123456' }); setMode('login'); }}
              style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '10px', color: '#4f46e5', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700 }}
            >
              ⚡ Fill Demo Credentials
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
