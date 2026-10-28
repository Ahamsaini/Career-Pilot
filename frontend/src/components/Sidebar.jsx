import React from 'react';
import {
  LayoutDashboard, User, FileText, Video, Code2, HelpCircle,
  TrendingUp, GitBranch, History, Bot, FileCheck, LogOut, Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'resume', label: 'Resume Intelligence', icon: FileText },
    { id: 'resumebuilder', label: 'AI Resume Builder', icon: FileCheck, badge: 'ATS 86+' },
    { id: 'interview', label: 'Virtual Interview', icon: Video, badge: 'Agentic' },
    { id: 'coding', label: 'Coding Arena', icon: Code2, badge: 'Sandbox' },
    { id: 'quiz', label: 'AI Quiz Agent', icon: HelpCircle },
    { id: 'performance', label: 'Performance Engine', icon: TrendingUp },
    { id: 'roadmap', label: 'AI Roadmap', icon: GitBranch, badge: 'AI Path' },
    { id: 'history', label: 'Interview History', icon: History },
    { id: 'observability', label: 'Agent Observability', icon: Cpu, badge: 'Swarm' },
  ];

  return (
    <aside style={{
      width: '260px',
      background: '#ffffff',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 20,
    }}>
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 50%, #818cf8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(79,70,229,0.3)',
        }}>
          <Bot size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Career Pilot
          </h1>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Agentic AI 2.0
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 14px',
                borderRadius: 'var(--radius-md)', border: 'none',
                background: isActive ? 'rgba(79,70,229,0.08)' : 'transparent',
                color: isActive ? '#4F46E5' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.88rem', cursor: 'pointer',
                transition: 'all 0.18s ease',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(248,250,252,1)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} color={isActive ? '#4F46E5' : '#94a3b8'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="badge badge-indigo" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Status + Logout */}
      <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Agent Status */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 6px var(--accent-emerald)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>LangGraph Agent</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Docker DB Connected</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px 14px',
            background: 'rgba(225,29,72,0.04)',
            border: '1px solid rgba(225,29,72,0.12)',
            borderRadius: 'var(--radius-md)',
            color: '#e11d48', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,29,72,0.08)'; e.currentTarget.style.borderColor = 'rgba(225,29,72,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(225,29,72,0.04)'; e.currentTarget.style.borderColor = 'rgba(225,29,72,0.12)'; }}
        >
          <LogOut size={15} />
          Sign Out{user?.full_name ? ` (${user.full_name.split(' ')[0]})` : ''}
        </button>
      </div>
    </aside>
  );
}
