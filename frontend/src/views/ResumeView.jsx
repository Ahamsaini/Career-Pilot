import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle,
  Sparkles,
  Layers,
  Code,
  Briefcase,
  GraduationCap,
  RefreshCw,
  FileCheck,
  FileType,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ResumeView({ setCurrentTab }) {
  const { authFetch } = useAuth();
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' or 'text'
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const defaultSample = `Student: Aham Saini
Education: B.Tech Computer Science, IIT Delhi (2025)
Skills: Java, Spring Boot, React, PostgreSQL, JavaScript, Microservices, Docker, Redis, Kafka
Projects:
1. Ride Sharing System:
Campus ride sharing application facilitating route coordination and vehicle pooling. Built using Spring Boot for backend, React for frontend, and PostgreSQL for relational database.
2. E-Commerce Application:
High-concurrency store application with inventory reservation and payment processing.`;

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await authFetch('/api/resume');
      const data = await res.json();
      setResumes(data);
      if (data.length > 0 && data[0].parsed_json) {
        setParsedData(data[0].parsed_json);
      }
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleParse = async () => {
    setLoading(true);
    try {
      let res;
      if (activeMode === 'upload' && file) {
        const formData = new FormData();
        formData.append('resume', file);
        res = await authFetch('/api/resume/upload', {
          method: 'POST',
          body: formData
        });
      } else {
        const textToProcess = rawText || defaultSample;
        res = await authFetch('/api/resume/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_text: textToProcess })
        });
      }
      const data = await res.json();
      setParsedData(data.parsed);
      fetchResumes();
    } catch (err) {
      console.error('Resume processing error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
          <Sparkles size={14} /> Resume Intelligence Pipeline
        </div>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Resume Parser & Skill Extraction
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Upload your resume in <strong>PDF</strong>, <strong>DOCX</strong>, <strong>DOC</strong> format or paste text. The agent extracts verified skills, projects, and credentials directly into your connected profile.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '24px' }}>
        {/* Left: Input Selection (Upload PDF/DOCX or Paste Text) */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <button
              onClick={() => setActiveMode('upload')}
              className={activeMode === 'upload' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: '0.84rem' }}
            >
              <Upload size={16} /> Upload PDF / DOCX
            </button>
            <button
              onClick={() => setActiveMode('text')}
              className={activeMode === 'text' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: '0.84rem' }}
            >
              <FileText size={16} /> Paste Resume Text
            </button>
          </div>

          {activeMode === 'upload' ? (
            /* Drag and Drop Zone for PDF / DOCX */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                background: isDragging ? 'rgba(79, 70, 229, 0.06)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: file ? 'rgba(16, 185, 129, 0.12)' : 'rgba(79, 70, 229, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: file ? 'var(--accent-emerald)' : 'var(--accent-primary)'
              }}>
                {file ? <FileCheck size={28} /> : <Upload size={28} />}
              </div>

              {file ? (
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{file.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {(file.size / 1024).toFixed(1)} KB • {file.name.split('.').pop().toUpperCase()} Document
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Drag & Drop your resume here, or <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>Browse</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Supports PDF, DOCX, DOC, TXT (up to 10MB)
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Plain Text Mode */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Raw Text Input</span>
                <button
                  className="btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  onClick={() => setRawText(defaultSample)}
                >
                  Load Sample
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste raw resume text or qualifications..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleParse}
            disabled={loading || (activeMode === 'upload' && !file && !rawText)}
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
            {loading ? 'Running Document Parser & AI Extraction...' : 'Run Resume Intelligence Pipeline'}
          </button>

          {/* Pipeline Stages */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            fontSize: '0.76rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Resume Processing Pipeline:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="badge badge-indigo">Document Parser</span> →
              <span className="badge badge-cyan">Text Extraction</span> →
              <span className="badge badge-emerald">Skill Extraction</span> →
              <span className="badge badge-amber">Project Extraction</span> →
              <span className="badge badge-indigo">Structured Profile</span>
            </div>
          </div>
        </div>

        {/* Right: Extracted Intelligence JSON & Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {parsedData ? (
            <>
              {/* Seamless Action Callout to Resume Builder */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'rgba(79, 70, 229, 0.05)',
                border: '1.5px solid var(--accent-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Resume Parsed & Profile Connected ✓
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Your skills and projects are ready. Build an ATS-tailored resume now without re-uploading!
                  </div>
                </div>
                {setCurrentTab && (
                  <button
                    className="btn-primary"
                    onClick={() => setCurrentTab('resumebuilder')}
                    style={{ padding: '8px 16px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    Open in AI Resume Builder <ArrowRight size={15} />
                  </button>
                )}
              </div>

              {/* Extracted Skills Badges */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Code size={18} color="var(--accent-primary)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Extracted Technical Skills</h4>
                  <span className="badge badge-emerald" style={{ marginLeft: 'auto' }}>
                    {(parsedData.skills || []).length} Skills Found
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(parsedData.skills || []).map((s, idx) => (
                    <span key={idx} className="badge badge-indigo" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      {typeof s === 'string' ? s : s.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Extracted Projects */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Briefcase size={18} color="var(--accent-primary)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Extracted Projects</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(parsedData.projects || []).map((p, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {p.name || p.title}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', margin: '6px 0', flexWrap: 'wrap' }}>
                        {(p.technologies || []).map((t, tidx) => (
                          <span key={tidx} className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>{t}</span>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Structured JSON view */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Structured Representation (JSON)
                  </span>
                  <span className="badge badge-emerald">Synced with Profile ✓</span>
                </div>
                <pre className="font-mono" style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(parsedData, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>Upload a .pdf or .docx resume or paste text to extract skills and project intelligence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
