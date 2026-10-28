import React, { useState, useEffect } from 'react';
import {
  User,
  GraduationCap,
  Briefcase,
  Target,
  Plus,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfileView() {
  const { authFetch } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const [skillProf, setSkillProf] = useState('intermediate');
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authFetch('/api/profile');
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      await authFetch('/api/profile/skills', {
        method: 'POST',
        body: JSON.stringify({
          skill_name: newSkill,
          proficiency: skillProf,
          source: 'user_added'
        })
      });
      setNewSkill('');
      fetchProfile();
    } catch (err) {
      console.error('Error adding skill:', err);
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await authFetch(`/api/profile/skills/${id}`, { method: 'DELETE' });
      fetchProfile();
    } catch (err) {
      console.error('Error deleting skill:', err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await authFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          target_role: profileData.profile?.target_role,
          college: profileData.profile?.college,
          degree: profileData.profile?.degree,
          graduation_year: profileData.profile?.graduation_year,
          experience_years: profileData.profile?.experience_years,
          bio: profileData.profile?.bio
        })
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Save profile error:', err);
    }
  };

  const profile = profileData?.profile || {};
  const user = profileData?.user || {};
  const skills = profileData?.skills || [];
  const projects = profileData?.projects || [];

  const resumeSkills = skills.filter(s => s.source === 'resume');
  const userAddedSkills = skills.filter(s => s.source === 'user_added');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>
            <Sparkles size={14} /> Student Profile Management
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Student Career Profile</h2>
        </div>

        <button className="btn-primary" onClick={handleSaveProfile}>
          <Save size={16} /> Save Changes
        </button>
      </div>

      {savedMessage && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 18px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7' }}>
          <CheckCircle2 size={16} /> Profile changes successfully updated in PostgreSQL database!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Basic & Academic Info */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap size={20} color="var(--accent-primary)" /> Academic & Career Goals
          </h3>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Student Name</label>
            <input
              type="text"
              value={user.full_name || 'Aham Saini'}
              disabled
              style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Degree</label>
              <input
                type="text"
                value={profile.degree || ''}
                onChange={(e) => setProfileData({ ...profileData, profile: { ...profile, degree: e.target.value } })}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>College / University</label>
              <input
                type="text"
                value={profile.college || ''}
                onChange={(e) => setProfileData({ ...profileData, profile: { ...profile, college: e.target.value } })}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Graduation Year</label>
              <input
                type="number"
                value={profile.graduation_year || 2025}
                onChange={(e) => setProfileData({ ...profileData, profile: { ...profile, graduation_year: e.target.value } })}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Job Role</label>
              <input
                type="text"
                value={profile.target_role || ''}
                onChange={(e) => setProfileData({ ...profileData, profile: { ...profile, target_role: e.target.value } })}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Companies</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {['Google', 'Amazon', 'Microsoft', 'Infosys', 'TCS', 'Accenture'].map(c => (
                <span key={c} className="badge badge-indigo">{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Skills: Resume Skills vs User-Added Skills (Matching Section 1 & 2 of PDF) */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={20} color="var(--accent-cyan)" /> Skills Ecosystem (Resume + User Added)
          </h3>

          {/* Add New Skill Input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Add skill (e.g. Docker, Redis, Kafka)..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
            />
            <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={handleAddSkill}>
              <Plus size={16} /> Add
            </button>
          </div>

          {/* Resume Skills */}
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              EXTRACTED FROM RESUME
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {resumeSkills.map(s => (
                <span key={s.id} className="badge badge-cyan" style={{ padding: '6px 12px' }}>
                  {s.skill_name}
                </span>
              ))}
            </div>
          </div>

          {/* Student Added Skills */}
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              ADDITIONAL STUDENT SKILLS (NOT IN RESUME)
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {userAddedSkills.map(s => (
                <span key={s.id} className="badge badge-indigo" style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {s.skill_name}
                  <Trash2
                    size={13}
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                    onClick={() => handleDeleteSkill(s.id)}
                  />
                </span>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              STUDENT PROJECTS ({projects.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {projects.map(p => (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{p.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
