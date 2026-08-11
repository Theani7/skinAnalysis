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
import SavedProductsPage from './pages/SavedProductsPage';
import RoutinePage from './pages/RoutinePage';
import AIDoctorPage from './pages/AIDoctorPage';
import LifestylePage from './pages/LifestylePage';
import NotFoundPage from './pages/NotFoundPage';
import { AnalysisResponse } from './services/api';
import { AuthUser, getStoredUser, isAuthenticated, clearAuth } from './services/auth';
import { ChatProvider } from './contexts/ChatContext';

export type PageRoute = 'landing' | 'dashboard' | 'scan' | 'report' | 'history' | 'profile' | 'remote-scan' | 'mobile-capture' | 'saved-products' | 'routine' | 'lifestyle' | 'doctor' | 'not-found';

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
  if (path === '/saved-products') return 'saved-products';
  if (path === '/routine') return 'routine';
  if (path === '/lifestyle') return 'lifestyle';
  if (path === '/doctor') return 'doctor';
  if (path === '/remote-scan') return 'remote-scan';
  if (path === '/mobile-capture') return 'mobile-capture';
  if (path === '/dashboard' || path === '/') return isAuthenticated() ? 'dashboard' : 'landing';
  return 'not-found';
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
      'saved-products': '/saved-products',
      'routine': '/routine',
      'lifestyle': '/lifestyle',
      'doctor': '/doctor',
      'remote-scan': '/remote-scan',
      'mobile-capture': '/mobile-capture',
      'not-found': window.location.pathname, // Keep current path for 404
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

  // Not Found View (handles both authenticated and unauthenticated invalid routes)
  if (currentPage === 'not-found') {
    return <NotFoundPage onNavigate={navigate} />;
  }

  // Mobile Capture View (Unauthenticated access allowed)
  if (currentPage === 'mobile-capture' && !isAuthenticated()) {
    return <MobileCaptureView />;
  }

  // Authenticated Dashboard Layout
  return (
    <ChatProvider>
      <DashboardLayout currentRoute={currentPage} onNavigate={navigate} user={authUser}>
        {currentPage === 'dashboard' && <DashboardHome onStartScan={() => navigate('scan')} onStartRemoteScan={() => navigate('remote-scan')} onViewHistory={() => navigate('history')} user={authUser} />}
        {currentPage === 'scan' && <ScanView onComplete={handleAnalysisComplete} onStartRemoteScan={() => navigate('remote-scan')} />}
        {currentPage === 'mobile-capture' && <MobileCaptureView />}
        {currentPage === 'remote-scan' && <RemoteScanView onComplete={handleAnalysisComplete} onBack={() => navigate('dashboard')} />}
        {currentPage === 'report' && <ReportView result={analysisResult} onBack={() => navigate('dashboard')} onScanNow={() => navigate('scan')} />}
        {currentPage === 'history' && <HistoryPage onBack={() => navigate('dashboard')} />}
        {currentPage === 'saved-products' && <SavedProductsPage />}
        {currentPage === 'routine' && <RoutinePage onStartScan={() => navigate('scan')} />}
        {currentPage === 'lifestyle' && <LifestylePage />}
        {currentPage === 'doctor' && <AIDoctorPage />}
        {currentPage === 'profile' && <ProfilePage user={authUser} onBack={() => navigate('dashboard')} onUserUpdate={handleUserUpdate} onLogout={handleLogout} />}
      </DashboardLayout>
    </ChatProvider>
  );
}
