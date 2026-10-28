import React, { useState, useRef, useEffect } from 'react';
import { Target, Building, ShieldCheck, LogOut, ChevronDown, User, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ profile }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return 'CP';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayName = user?.full_name || profile?.user?.full_name || 'Student';
  const targetRole = profile?.profile?.target_role || profile?.target_role || 'Java Backend Developer';
  const degree = profile?.profile?.degree || profile?.degree || '';

  return (
    <header style={{
      height: '68px',
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 15
    }}>
      {/* Target Role & Companies Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Target:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {targetRole}
          </span>
        </div>
        <span style={{ color: 'var(--border-color)' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={15} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Targeting:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['Google', 'Amazon', 'Microsoft'].map(co => (
              <span key={co} className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                {co}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} />
          <span>PostgreSQL v16</span>
        </div>

        {/* User Dropdown */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '9999px',
              padding: '4px 12px 4px 5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            {/* Avatar */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 50%, #818cf8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.82rem', color: '#fff', flexShrink: 0,
            }}>
              {getInitials(displayName)}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              {degree && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1 }}>
                  {degree}
                </div>
              )}
            </div>
            <ChevronDown
              size={14}
              color="var(--text-muted)"
              style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '8px',
              minWidth: '200px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
              zIndex: 100,
              animation: 'fadeSlideDown 0.15s ease',
            }}>
              {/* User Info Header */}
              <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '6px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || ''}</div>
              </div>

              {/* Menu Items */}
              <button
                onClick={() => { setDropdownOpen(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.88rem' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <User size={15} /> My Profile
              </button>
              <button
                onClick={() => { setDropdownOpen(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.88rem' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Settings size={15} /> Settings
              </button>

              <div style={{ height: '1px', background: 'var(--border-color)', margin: '6px 0' }} />

              {/* Logout */}
              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px', color: '#e11d48', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(225,29,72,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
