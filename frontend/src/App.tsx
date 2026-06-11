import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardShell from './components/layout/DashboardShell';
import DashboardHome from './pages/DashboardHome';
import ScanView from './pages/ScanView';
import ReportView from './pages/ReportView';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import { AnalysisResponse } from './services/api';
import { AuthUser, getStoredUser, isAuthenticated, clearAuth } from './services/auth';

export type PageRoute = 'landing' | 'login' | 'dashboard' | 'scan' | 'report' | 'history' | 'profile';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageRoute>(() => {
    return isAuthenticated() ? 'dashboard' : 'landing';
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(getStoredUser());
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  // Keep authUser in sync with localStorage
  useEffect(() => {
    if (isAuthenticated() && !authUser) {
      setAuthUser(getStoredUser());
    }
  }, [currentPage]);

  const navigate = (page: PageRoute) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
  };

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    setCurrentPage('dashboard');
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    clearAuth();
    setAuthUser(null);
    setAnalysisResult(null);
    setCurrentPage('landing');
    window.scrollTo(0, 0);
  };

  const handleAnalysisComplete = (result: AnalysisResponse) => {
    setAnalysisResult(result);
    setCurrentPage('report');
    window.scrollTo(0, 0);
  };

  const handleUserUpdate = (user: AuthUser) => {
    setAuthUser(user);
  };

  // Unauthenticated Routes
  if (!isAuthenticated()) {
    if (currentPage === 'login') {
      return <LoginPage onLogin={handleLogin} onBack={() => setCurrentPage('landing')} />;
    }
    return <LandingPage onStart={() => setCurrentPage('login')} />;
  }

  // Authenticated Dashboard Layout
  return (
    <DashboardShell currentRoute={currentPage} onNavigate={navigate} onLogout={handleLogout} user={authUser}>
      {currentPage === 'dashboard' && <DashboardHome onStartScan={() => navigate('scan')} onViewHistory={() => navigate('history')} user={authUser} />}
      {currentPage === 'scan' && <ScanView onComplete={handleAnalysisComplete} />}
      {currentPage === 'report' && <ReportView result={analysisResult} onBack={() => navigate('dashboard')} />}
      {currentPage === 'history' && <HistoryPage onBack={() => navigate('dashboard')} />}
      {currentPage === 'profile' && <ProfilePage user={authUser} onBack={() => navigate('dashboard')} onUserUpdate={handleUserUpdate} />}
    </DashboardShell>
  );
}
