import { useState, useEffect, useCallback } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import ScanView from './pages/ScanView';
import ReportView from './pages/ReportView';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import RemoteScanView from './pages/RemoteScanView';
import MobileCaptureView from './pages/MobileCaptureView';
import OnboardingModal from './components/OnboardingModal';
import { AnalysisResponse } from './services/api';
import { AuthUser, getStoredUser, isAuthenticated, clearAuth, storeAuth } from './services/auth';

export type PageRoute = 'landing' | 'dashboard' | 'scan' | 'report' | 'history' | 'profile' | 'remote-scan' | 'mobile-capture';

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
  if (path === '/scan') return 'scan';
  if (path === '/report') return 'report';
  if (path === '/history') return 'history';
  if (path === '/profile') return 'profile';
  if (path === '/remote-scan') return 'remote-scan';
  if (path === '/mobile-capture') return 'mobile-capture';
  if (path === '/dashboard' || path === '/') return isAuthenticated() ? 'dashboard' : 'landing';
  return isAuthenticated() ? 'dashboard' : 'landing';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageRoute>(getInitialRoute);
  const [authUser, setAuthUser] = useState<AuthUser | null>(getStoredUser());
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(getStoredResult);
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');

  const navigate = useCallback((page: PageRoute) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
    const paths: Record<PageRoute, string> = {
      landing: '/',
      dashboard: '/dashboard',
      scan: '/scan',
      report: '/report',
      history: '/history',
      profile: '/profile',
      'remote-scan': '/remote-scan',
      'mobile-capture': '/mobile-capture',
    };
    window.history.pushState({}, '', paths[page] || '/');
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const route = getInitialRoute();
      setCurrentPage(route);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isAuthenticated() && !authUser) {
      setAuthUser(getStoredUser());
    }
  }, [authUser]);

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    setShowLogin(false);
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

  // Unauthenticated: landing page + login modal (except for mobile capture which is unauthenticated)
  if (!isAuthenticated() && currentPage !== 'mobile-capture') {
    return (
      <>
        <LandingPage onLogin={() => { setLoginMode('login'); setShowLogin(true); }} onSignup={() => { setLoginMode('signup'); setShowLogin(true); }} />
        <LoginPage open={showLogin} initialMode={loginMode} onLogin={handleLogin} onClose={() => setShowLogin(false)} />
      </>
    );
  }

  // Mobile Capture View (Unauthenticated access allowed)
  if (currentPage === 'mobile-capture') {
    return <MobileCaptureView />;
  }

  const hasCompletedOnboarding = authUser?.profile_data && Object.keys(authUser.profile_data).length > 0;
  const showOnboarding = isAuthenticated() && authUser && !hasCompletedOnboarding;

  const handleOnboardingComplete = (updatedUser: AuthUser) => {
    setAuthUser(updatedUser);
    const token = localStorage.getItem('skinai_token'); // Or getStoredToken if we exported it
    if (token) storeAuth(token, updatedUser);
  };

  // Authenticated Dashboard Layout
  return (
    <>
      <DashboardLayout currentRoute={currentPage} onNavigate={navigate} user={authUser}>
        {currentPage === 'dashboard' && <DashboardHome onStartScan={() => navigate('scan')} onStartRemoteScan={() => navigate('remote-scan')} onViewHistory={() => navigate('history')} user={authUser} />}
        {currentPage === 'scan' && <ScanView onComplete={handleAnalysisComplete} onStartRemoteScan={() => navigate('remote-scan')} />}
        {currentPage === 'remote-scan' && <RemoteScanView onComplete={handleAnalysisComplete} onBack={() => navigate('dashboard')} />}
        {currentPage === 'report' && <ReportView result={analysisResult} onBack={() => navigate('dashboard')} onScanNow={() => navigate('scan')} />}
        {currentPage === 'history' && <HistoryPage onBack={() => navigate('dashboard')} />}
        {currentPage === 'profile' && <ProfilePage user={authUser} onBack={() => navigate('dashboard')} onUserUpdate={handleUserUpdate} onLogout={handleLogout} />}
      </DashboardLayout>
      {showOnboarding && <OnboardingModal user={authUser} onComplete={handleOnboardingComplete} onSkip={() => handleOnboardingComplete(authUser)} />}
    </>
  );
}
