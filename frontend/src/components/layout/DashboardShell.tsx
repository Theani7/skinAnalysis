import React, { useState, useRef } from 'react';
import { LayoutDashboard, ScanLine, History, LogOut, Menu, X, Camera, Sun, Moon } from 'lucide-react';
import { PageRoute } from '../../App';
import { AuthUser } from '../../services/auth';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardShellProps {
  children: React.ReactNode;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
  user?: AuthUser | null;
}

export default function DashboardShell({ children, currentRoute, onNavigate, onLogout, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const { isDark, toggleTheme } = useTheme();

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const userName = user?.name || 'User';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scan', label: 'New Scan', icon: ScanLine },
    { id: 'history', label: 'History', icon: History },
  ];

  const handleNav = (route: PageRoute) => {
    onNavigate(route);
    setSidebarOpen(false);
  };

  const handleProfileClick = () => {
    handleNav('profile');
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <div className="flex h-screen t-bg t-text overflow-hidden font-sans">
      <style>{`
        .sidebar-transition {
          transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      {sidebarOpen && (
        <div
          className="fixed inset-0 t-overlay z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          hidden lg:flex fixed z-40 flex-col
          top-1/2 -translate-y-1/2
          left-6 xl:left-8
          sidebar-transition
          ${expanded ? 'w-60' : 'w-[72px]'}
        `}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); setHoveredItem(null); }}
      >
        <div className="flex flex-col t-card backdrop-blur-md rounded-2xl sidebar-transition overflow-hidden py-4 px-3 shadow-2xl">
          <div className={`flex items-center mb-6 ${expanded ? 'gap-2.5 px-1.5' : 'justify-center'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            {expanded && (
              <span className="text-lg font-display font-bold tracking-tight t-text whitespace-nowrap overflow-hidden">
                SkinAI
              </span>
            )}
          </div>

          <nav className="flex-1 space-y-1" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              return (
                <div key={item.id} className="relative">
                  <button
                    onClick={() => handleNav(item.id as PageRoute)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`
                      w-full flex items-center gap-2.5 rounded-xl relative transition-all duration-200
                      ${expanded ? 'px-3 py-2.5' : 'justify-center py-2.5'}
                      ${isActive
                        ? 'bg-gradient-to-r from-teal-500 to-teal-400 text-white shadow-md shadow-teal-500/20'
                        : 't-text-secondary hover:t-bg-hover hover:t-text'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {expanded && (
                      <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>
                    )}
                    {isActive && !expanded && (
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-teal-400 rounded-r-full shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                    )}
                  </button>

                  {!expanded && hoveredItem === item.id && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                      <div className="t-card t-text text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                        {item.label}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="my-3 border-t t-divider" />
          
          <div className={`space-y-1 ${expanded ? '' : 'flex flex-col items-center'}`}>
            <div className="relative">
              <button
                onClick={toggleTheme}
                onMouseEnter={() => setHoveredItem('theme')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  flex items-center gap-2.5 rounded-xl transition-all duration-200 t-text-secondary hover:t-text hover:t-bg-hover
                  ${expanded ? 'w-full px-3 py-2.5' : 'justify-center py-2.5'}
                `}
                title={!expanded ? "Toggle Theme" : undefined}
              >
                {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
                {expanded && (
                  <span className="text-sm font-medium">Toggle Theme</span>
                )}
              </button>
              {!expanded && hoveredItem === 'theme' && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="t-card t-text text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                    Toggle Theme
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={handleProfileClick}
                onMouseEnter={() => setHoveredItem('profile')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  flex items-center gap-2.5 rounded-xl transition-all duration-200
                  ${expanded ? 'w-full px-3 py-2.5 hover:t-bg-hover' : 'justify-center py-2.5'}
                `}
                title={!expanded ? userName : undefined}
              >
                <div className="w-8 h-8 t-bg-raised border t-divider rounded-lg flex items-center justify-center text-teal-400 font-semibold text-xs flex-shrink-0">
                  {userInitials}
                </div>
                {expanded && (
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium t-text truncate">{userName}</div>
                  </div>
                )}
              </button>
              {!expanded && hoveredItem === 'profile' && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="t-card t-text text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                    Profile
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={handleLogoutClick}
                onMouseEnter={() => setHoveredItem('logout')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  flex items-center gap-2.5 rounded-xl transition-all duration-200
                  t-text-secondary hover:text-red-500 hover:bg-red-500/10
                  ${expanded ? 'w-full px-3 py-2.5' : 'justify-center py-2.5'}
                `}
                title={!expanded ? 'Sign Out' : undefined}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {expanded && (
                  <span className="text-sm font-medium">Sign Out</span>
                )}
              </button>
              {!expanded && hoveredItem === 'logout' && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="t-card t-text text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                    Sign Out
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <aside className="lg:hidden fixed inset-y-0 left-0 z-40 flex flex-col w-[85vw] max-w-[340px]">
          <div className="flex flex-col h-full m-3 mt-16 mb-16 t-card backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-display font-bold t-text">SkinAI</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 t-text-secondary hover:t-text rounded-lg hover:t-bg-hover transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 px-3 space-y-1" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive = currentRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id as PageRoute)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-teal-500 to-teal-400 text-white shadow-md shadow-teal-500/20'
                        : 't-text-secondary hover:t-bg-hover hover:t-text'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mx-4 border-t t-divider" />

            <div className="p-3 space-y-1">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:t-bg-hover transition-all duration-200 t-text-secondary hover:t-text"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="text-sm font-medium">Toggle Theme</span>
              </button>
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:t-bg-hover transition-all duration-200"
              >
                <div className="w-8 h-8 t-bg-raised border t-divider rounded-lg flex items-center justify-center text-teal-400 font-semibold text-xs flex-shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium t-text truncate">{userName}</div>
                </div>
              </button>
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl t-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[88px] xl:ml-[96px]">
        <header className="lg:hidden flex items-center gap-3 p-4 t-card backdrop-blur-md mx-3 mt-3 rounded-2xl sticky top-3 z-30 shadow-lg">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 t-text-secondary hover:t-text rounded-lg hover:t-bg-hover transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-base t-text tracking-wide">SkinAI</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to log in again to access your dashboard."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        danger
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
