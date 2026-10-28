import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Edit3,
  RefreshCw,
  Check,
  Cpu,
  BookmarkPlus,
  Upload,
  FileText,
  X,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function markdownToPlainLines(md) {
  return (md || '').split('\n').map(l => l.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
}

function downloadPDF(markdown, filename) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const maxW = pageW - marginX * 2;
  let y = 56;

  const lines = (markdown || '').split('\n');

  const addPage = () => {
    doc.addPage();
    y = 48;
  };

  lines.forEach(raw => {
    if (y > pageH - 56) addPage();
    const line = raw.trim();
    if (!line) { y += 8; return; }

    if (line.startsWith('# ')) {
      // Name / Main Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(30, 30, 80);
      doc.text(line.replace(/^# /, ''), pageW / 2, y, { align: 'center' });
      y += 28;
      // Underline
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(1.5);
      doc.line(marginX, y, pageW - marginX, y);
      y += 14;
    } else if (line.startsWith('## ')) {
      // Section Header
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(60, 60, 180);
      doc.text(line.replace(/^## /, '').toUpperCase(), marginX, y);
      y += 4;
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.5);
      doc.line(marginX, y, pageW - marginX, y);
      y += 14;
    } else if (line.startsWith('### ')) {
      // Sub-header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(line.replace(/^### /, ''), marginX, y);
      y += 14;
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      // Bullet
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const bullet = '•  ' + line.replace(/^[-•]\s*/, '').replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(bullet, maxW - 12);
      wrapped.forEach((wl, i) => {
        if (y > pageH - 56) addPage();
        doc.text(i === 0 ? wl : '    ' + wl.trim(), marginX + 8, y);
        y += 13;
      });
    } else {
      // Normal text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const cleaned = line.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(cleaned, maxW);
      wrapped.forEach(wl => {
        if (y > pageH - 56) addPage();
        doc.text(wl, marginX, y);
        y += 13;
      });
    }
  });

  doc.save(`${filename}.pdf`);
}

async function downloadDOCX(markdown, filename) {
  const lines = (markdown || '').split('\n');

  const paragraphs = lines.map(raw => {
    const line = raw.trim();
    if (!line) return new Paragraph({ spacing: { after: 60 } });

    if (line.startsWith('# ')) {
      return new Paragraph({
        text: line.replace(/^# /, ''),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      });
    } else if (line.startsWith('## ')) {
      return new Paragraph({
        text: line.replace(/^## /, '').toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '6366f1' }
        }
      });
    } else if (line.startsWith('### ')) {
      return new Paragraph({
        children: [new TextRun({ text: line.replace(/^### /, ''), bold: true, size: 22 })],
        spacing: { before: 100, after: 40 },
      });
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      const text = line.replace(/^[-•]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      return new Paragraph({
        children: [new TextRun({ text, size: 20 })],
        bullet: { level: 0 },
        spacing: { after: 40 },
      });
    } else {
      const parts = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      const cleaned = line;
      while ((match = boldRegex.exec(cleaned)) !== null) {
        if (match.index > lastIndex) parts.push(new TextRun({ text: cleaned.slice(lastIndex, match.index), size: 20 }));
        parts.push(new TextRun({ text: match[1], bold: true, size: 20 }));
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < cleaned.length) parts.push(new TextRun({ text: cleaned.slice(lastIndex), size: 20 }));
      return new Paragraph({ children: parts.length ? parts : [new TextRun({ text: cleaned, size: 20 })], spacing: { after: 60 } });
    }
  });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20, color: '222222' } }
      }
    },
    sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ResumeBuilderView({ setCurrentTab }) {
  const { authFetch } = useAuth();
  const [experienceLevel, setExperienceLevel] = useState('fresher');
  const [targetJob, setTargetJob] = useState('');
  const [resumeFormat, setResumeFormat] = useState('professional');

  // Upload state
  const [activeResume, setActiveResume] = useState(null);
  const [useActiveResume, setUseActiveResume] = useState(true);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedParsed, setUploadedParsed] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-load active resume on mount (Resume-Once pattern)
  useEffect(() => {
    authFetch('/api/resume/active')
      .then(r => r.json())
      .then(d => {
        if (d.active_resume) {
          setActiveResume(d.active_resume);
          setUseActiveResume(true);
          const p = d.active_resume.parsed;
          if (p) {
            setUploadedParsed(p);
            if (p.target_role) setTargetJob(p.target_role);
            if (p.experience_years > 0) setExperienceLevel('experienced');
          }
        }
      })
      .catch(() => {});
  }, [authFetch]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [generatedResume, setGeneratedResume] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableMarkdown, setEditableMarkdown] = useState('');

  // Download format picker
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const progressSteps = [
    'Reading your profile & verified credentials',
    'Analyzing your core skills & projects',
    'Identifying target role expectations',
    'Researching role requirements via Tavily',
    'Analyzing high-impact resume structures',
    'Finding relevant industry action verbs',
    'Building tailored resume structure',
    'Running initial ATS score analysis',
    'Optimizing bullet points & keyword density',
    'Resume Ready ✓'
  ];

  // ── File Upload ──────────────────────────────────────────────────────────────

  const handleFileSelect = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setUploadError('Only PDF or DOCX/DOC files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 10 MB.');
      return;
    }
    setUploadError('');
    setUploadedFile(file);
    setUploadedParsed(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use the AI service parse-file endpoint through the backend proxy
      const res = await authFetch('/api/resume/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.parsed) {
        setUploadedParsed(data.parsed);
        // Auto-detect target role from resume if available
        if (data.parsed.target_role) setTargetJob(data.parsed.target_role);
        if (data.parsed.experience_years > 0) setExperienceLevel('experienced');
      }
    } catch (err) {
      setUploadError('Could not parse the resume. Will still use your profile data.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDropZone = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeUpload = () => {
    setUploadedFile(null);
    setUploadedParsed(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgressStep(0);
    setGeneratedResume(null);

    for (let i = 0; i < progressSteps.length - 1; i++) {
      await new Promise(r => setTimeout(r, 380));
      setProgressStep(i + 1);
    }

    try {
      const payload = {
        target_role: targetJob,
        experience_level: experienceLevel,
        resume_format: resumeFormat,
      };
      if (uploadedParsed) {
        payload.skills = uploadedParsed.skills || [];
        payload.projects = uploadedParsed.projects || [];
        payload.education = uploadedParsed.education || [];
        payload.student_name = uploadedParsed.name || '';
      }

      const res = await authFetch('/api/resume/build-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setProgressStep(progressSteps.length - 1);
      setGeneratedResume(data.result);
      setEditableMarkdown(data.result?.markdown_content || '');
    } catch (err) {
      console.error('Error generating resume:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Downloads ────────────────────────────────────────────────────────────────

  const safeFilename = targetJob.replace(/\s+/g, '_') + '_Resume';

  const handleDownloadMD = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([editableMarkdown], { type: 'text/plain' }));
    a.download = `${safeFilename}.md`;
    a.click();
    setShowDownloadMenu(false);
  };

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    setShowDownloadMenu(false);
    setTimeout(() => {
      downloadPDF(editableMarkdown, safeFilename);
      setIsDownloading(false);
    }, 100);
  };

  const handleDownloadDOCX = async () => {
    setIsDownloading(true);
    setShowDownloadMenu(false);
    try {
      await downloadDOCX(editableMarkdown, safeFilename);
    } catch (e) {
      console.error('DOCX error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
          <Sparkles size={14} /> Agentic ATS Optimizer & Resume Generator
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>AI Resume Builder</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Upload your existing resume (PDF/DOCX) to pre-fill details, or build from scratch. Download your optimized resume in PDF or DOCX format.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px' }}>
        {/* ── Left: Config Form ───────────────────────────────────────────────── */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Resume Generation Parameters</h3>

          {/* ── Upload Zone (Auto-connected with Resume Intelligence) ──────────────── */}
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Resume Source
            </label>

            {activeResume && useActiveResume && !uploadedFile ? (
              /* Connected Active Resume Card */
              <div style={{
                border: '1.5px solid var(--accent-primary)',
                background: 'rgba(79, 70, 229, 0.04)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileCheck size={22} color="var(--accent-primary)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activeResume.file_name || 'Active Resume Document'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Auto-connected from Resume Intelligence · No re-upload required
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> Active & Ready
                  </span>
                </div>

                {uploadedParsed && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    background: '#ffffff',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    {uploadedParsed.name && <span><strong>Name:</strong> {uploadedParsed.name}</span>}
                    {uploadedParsed.target_role && <span><strong>Target:</strong> {uploadedParsed.target_role}</span>}
                    {uploadedParsed.skills?.length > 0 && <span><strong>Skills:</strong> {uploadedParsed.skills.length} extracted</span>}
                    {uploadedParsed.projects?.length > 0 && <span><strong>Projects:</strong> {uploadedParsed.projects.length} extracted</span>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    ✓ Pre-filling your skills, projects & experience automatically
                  </span>
                  <button
                    type="button"
                    onClick={() => { setUseActiveResume(false); setShowManualUpload(true); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Upload a different file instead
                  </button>
                </div>
              </div>
            ) : !uploadedFile ? (
              <div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDropZone}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isDragOver ? 'rgba(79,70,229,0.06)' : 'var(--bg-secondary)',
                  }}
                >
                  <Upload size={28} style={{ margin: '0 auto 8px', color: 'var(--accent-primary)' }} />
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Drop your resume here or click to browse
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Supports <strong style={{ color: '#ef4444' }}>.PDF</strong> and{' '}
                    <strong style={{ color: '#3b82f6' }}>.DOCX / .DOC</strong> · Max 10 MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                </div>

                {activeResume && (
                  <button
                    type="button"
                    onClick={() => { setUseActiveResume(true); setShowManualUpload(false); }}
                    style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ← Back to active resume ({activeResume.file_name})
                  </button>
                )}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(79,70,229,0.06)',
                border: '1px solid rgba(79,70,229,0.25)',
                borderRadius: 'var(--radius-md)',
              }}>
                <FileText size={28} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {uploadedFile.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                    {isUploading && <span style={{ color: 'var(--accent-cyan)', marginLeft: '8px' }}>• Parsing with AI...</span>}
                    {uploadedParsed && !isUploading && <span style={{ color: 'var(--accent-emerald)', marginLeft: '8px' }}>• Parsed ✓</span>}
                  </div>
                </div>
                {isUploading ? (
                  <Loader2 size={18} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                ) : (
                  <button onClick={removeUpload} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', flexShrink: 0 }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {uploadError && (
              <p style={{ fontSize: '0.78rem', color: 'var(--accent-rose)', marginTop: '6px' }}>⚠ {uploadError}</p>
            )}

            {uploadedFile && uploadedParsed && !isUploading && (
              <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                <strong>✓ Pre-filled from uploaded file:</strong>{' '}
                {[
                  uploadedParsed.name && `Name: ${uploadedParsed.name}`,
                  uploadedParsed.skills?.length && `${uploadedParsed.skills.length} skills`,
                  uploadedParsed.projects?.length && `${uploadedParsed.projects.length} projects`,
                ].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>

          {/* ── Experience Level ─────────────────────────────────────────────── */}
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Experience Classification
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={experienceLevel === 'fresher' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
                onClick={() => setExperienceLevel('fresher')}
              >
                👨‍🎓 Fresher
              </button>
              <button
                type="button"
                className={experienceLevel === 'experienced' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
                onClick={() => setExperienceLevel('experienced')}
              >
                👨‍💼 Experienced
              </button>
            </div>
          </div>

          {/* ── Target Job ───────────────────────────────────────────────────── */}
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Target Job Role
            </label>
            <select
              value={targetJob}
              onChange={(e) => setTargetJob(e.target.value)}
              style={{
                width: '100%', padding: '12px',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
              }}
            >
              <option value="Java Backend Developer">Java Backend Developer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="Python FastAPI Developer">Python FastAPI Developer</option>
              <option value="Database & SQL Engineer">Database & SQL Engineer</option>
              <option value="Cloud & Microservices Engineer">Cloud & Microservices Engineer</option>
              <option value="Data Scientist">Data Scientist</option>
              <option value="DevOps Engineer">DevOps Engineer</option>
              <option value="React Frontend Developer">React Frontend Developer</option>
            </select>
          </div>

          {/* ── Resume Format ────────────────────────────────────────────────── */}
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Resume Layout Style
            </label>
            <select
              value={resumeFormat}
              onChange={(e) => setResumeFormat(e.target.value)}
              style={{
                width: '100%', padding: '12px',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
              }}
            >
              <option value="professional">Professional (Standard ATS Optimized)</option>
              <option value="modern_tech">Modern Tech (High-Growth Tech Focus)</option>
              <option value="minimalist">Minimalist Executive</option>
            </select>
          </div>

          <button
            className="btn-primary"
            style={{ padding: '14px', fontSize: '1rem', marginTop: '4px' }}
            onClick={handleGenerate}
            disabled={isGenerating || isUploading}
          >
            {isGenerating ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18} />}
            {isGenerating ? 'Agents At Work...' : 'Generate & Optimize Resume'}
          </button>
        </div>

        {/* ── Right: Progress / Result ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isGenerating ? (
            <div className="glass-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Cpu size={22} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Creating your resume...</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {progressSteps.map((step, idx) => {
                  const isDone = idx < progressStep;
                  const isCurrent = idx === progressStep;
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      color: isDone ? 'var(--accent-emerald)' : isCurrent ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      fontSize: '0.88rem',
                      fontWeight: isCurrent ? 600 : 500,
                      transition: 'all 0.2s ease'
                    }}>
                      {isDone ? (
                        <CheckCircle2 size={18} color="var(--accent-emerald)" />
                      ) : isCurrent ? (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                      ) : (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--border-color)' }} />
                      )}
                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : generatedResume ? (
            <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Score Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="badge badge-indigo" style={{ marginBottom: '6px' }}>Target Role</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{generatedResume.target_role}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ATS COMPATIBILITY</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {generatedResume.ats_compatibility} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span>
                  </div>
                </div>
              </div>

              {/* Quality Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Resume Quality</span>
                  <span style={{ fontWeight: 600 }}>{generatedResume.quality_percentage}% High Match</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${generatedResume.quality_percentage}%`, height: '100%', background: 'var(--gradient-emerald)' }} />
                </div>
              </div>

              {/* Checklist */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem' }}>
                  {['Skills aligned', 'Projects improved', 'Summary optimized', 'Keywords integrated'].map(t => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)' }}>
                      <Check size={16} /> {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill Gaps */}
              {generatedResume.missing_skills_to_learn?.length > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.08)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <AlertTriangle size={16} color="var(--accent-amber)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      Identified Skill Gaps (not fabricated)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {generatedResume.missing_skills_to_learn.map((sk, i) => (
                      <span key={i} className="badge badge-amber">• {sk}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setIsEditing(!isEditing)}
                    style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                  >
                    <Edit3 size={15} /> {isEditing ? 'View Preview' : 'Edit Text'}
                  </button>

                  {/* Download Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      className="btn-primary"
                      onClick={() => setShowDownloadMenu(v => !v)}
                      disabled={isDownloading}
                      style={{ padding: '8px 14px', fontSize: '0.84rem', gap: '6px' }}
                    >
                      {isDownloading
                        ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Download size={15} />
                      }
                      Download Resume
                      <ChevronDown size={14} style={{ marginLeft: '2px' }} />
                    </button>

                    {showDownloadMenu && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '6px',
                        zIndex: 100,
                        minWidth: '200px',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                      }}>
                        <button
                          onClick={handleDownloadPDF}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', background: 'none', border: 'none',
                            color: '#dc2626', cursor: 'pointer', borderRadius: '8px',
                            fontSize: '0.88rem', fontWeight: 600,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          📄 Download as PDF
                        </button>
                        <button
                          onClick={handleDownloadDOCX}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', background: 'none', border: 'none',
                            color: '#2563eb', cursor: 'pointer', borderRadius: '8px',
                            fontSize: '0.88rem', fontWeight: 600,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          📝 Download as DOCX
                        </button>
                        <button
                          onClick={handleDownloadMD}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', background: 'none', border: 'none',
                            color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '8px',
                            fontSize: '0.88rem', fontWeight: 600,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          📋 Download as Markdown
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="btn-secondary"
                  onClick={() => setCurrentTab('roadmap')}
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <BookmarkPlus size={15} /> Open Learning Roadmap →
                </button>
              </div>

              {/* Preview / Edit Document Area */}
              {isEditing ? (
                <textarea
                  value={editableMarkdown}
                  onChange={(e) => setEditableMarkdown(e.target.value)}
                  style={{
                    width: '100%', minHeight: '340px',
                    background: '#ffffff',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    color: 'var(--text-primary)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                  }}
                />
              ) : (
                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-sm)',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <pre style={{
                    margin: 0,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {editableMarkdown}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            /* Idle Placeholder */
            <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Ready to Generate Your ATS-Optimized Resume
              </h4>
              <p style={{ fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto 20px' }}>
                Optionally upload your existing resume to pre-fill skills and projects, then click <strong>Generate & Optimize Resume</strong>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                  <span style={{ fontSize: '1.2rem' }}>📄</span> Exports to PDF
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
                  <span style={{ fontSize: '1.2rem' }}>📝</span> Exports to DOCX
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa' }}>
                  <span style={{ fontSize: '1.2rem' }}>📋</span> Exports to Markdown
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
