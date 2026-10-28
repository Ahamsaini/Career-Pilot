import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import AuthView from './views/AuthView';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './views/DashboardView';
import ProfileView from './views/ProfileView';
import ResumeView from './views/ResumeView';
import InterviewView from './views/InterviewView';
import CodingArenaView from './views/CodingArenaView';
import QuizView from './views/QuizView';
import PerformanceView from './views/PerformanceView';
import RoadmapView from './views/RoadmapView';
import HistoryView from './views/HistoryView';
import ResumeBuilderView from './views/ResumeBuilderView';
import AgentObservability from './components/AgentObservability';

export default function App() {
  const { isLoggedIn, authFetch } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);

  // Load profile whenever user logs in
  useEffect(() => {
    if (!isLoggedIn) { setProfile(null); return; }
    authFetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d); })
      .catch(() => {});
  }, [isLoggedIn, authFetch]);

  // Show auth screen when not logged in
  if (!isLoggedIn) {
    return <AuthView />;
  }

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'dashboard':    return <DashboardView setCurrentTab={setCurrentTab} />;
      case 'profile':      return <ProfileView onProfileUpdate={setProfile} />;
      case 'resume':       return <ResumeView setCurrentTab={setCurrentTab} />;
      case 'resumebuilder': return <ResumeBuilderView setCurrentTab={setCurrentTab} />;
      case 'interview':    return <InterviewView />;
      case 'coding':       return <CodingArenaView />;
      case 'quiz':         return <QuizView />;
      case 'performance':  return <PerformanceView />;
      case 'roadmap':      return <RoadmapView />;
      case 'history':      return <HistoryView setCurrentTab={setCurrentTab} />;
      case 'observability': return <AgentObservability />;
      default:             return <DashboardView setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Ambient background lighting */}
      <div className="ambient-glow" />

      {/* Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 10 }}>
        <Navbar profile={profile} />
        <main style={{ padding: '32px', flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}
