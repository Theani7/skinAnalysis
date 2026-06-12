import { useState, useEffect, useCallback } from 'react';
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

const RESULT_STORAGE_KEY = 'skinai_last_result';

function getStoredResult(): AnalysisResponse | null {
  try {
    const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AnalysisResponse;
  } catch { /* ignore */ }
  return null;
}

function storeResult(result: AnalysisResponse | null): void {
  if (result) {
    sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
  } else {
    sessionStorage.removeItem(RESULT_STORAGE_KEY);
  }
}

function getInitialRoute(): PageRoute {
  const path = window.location.pathname;
  if (path === '/login') return 'login';
  if (path === '/scan') return 'scan';
  if (path === '/report') return 'report';
  if (path === '/history') return 'history';
  if (path === '/profile') return 'profile';
  if (path === '/dashboard' || path === '/') return isAuthenticated() ? 'dashboard' : 'landing';
  return isAuthenticated() ? 'dashboard' : 'landing';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageRoute>(getInitialRoute);
  const [authUser, setAuthUser] = useState<AuthUser | null>(getStoredUser());
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(getStoredResult);

  // Sync URL with state
  const navigate = useCallback((page: PageRoute) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
    const paths: Record<PageRoute, string> = {
      landing: '/',
      login: '/login',
      dashboard: '/dashboard',
      scan: '/scan',
      report: '/report',
      history: '/history',
      profile: '/profile',
    };
    window.history.pushState({}, '', paths[page] || '/');
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const route = getInitialRoute();
      setCurrentPage(route);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keep authUser in sync with localStorage
  useEffect(() => {
    if (isAuthenticated() && !authUser) {
      setAuthUser(getStoredUser());
    }
  }, [authUser]);

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    navigate('dashboard');
  };

  const handleLogout = () => {
    clearAuth();
    setAuthUser(null);
    setAnalysisResult(null);
    storeResult(null);
    navigate('landing');
  };

  const handleAnalysisComplete = (result: AnalysisResponse) => {
    setAnalysisResult(result);
    storeResult(result);
    navigate('report');
  };

  const handleUserUpdate = (user: AuthUser) => {
    setAuthUser(user);
  };

  // Unauthenticated Routes
  if (!isAuthenticated()) {
    if (currentPage === 'login') {
      return <LoginPage onLogin={handleLogin} onBack={() => navigate('landing')} />;
    }
    return <LandingPage onStart={() => navigate('login')} />;
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
