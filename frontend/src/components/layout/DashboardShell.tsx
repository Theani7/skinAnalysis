import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ScanLine, History, LogOut, Activity, Menu, X } from 'lucide-react';
import { PageRoute } from '../../App';
import { AuthUser } from '../../services/auth';
import ConfirmDialog from '../ui/ConfirmDialog';

interface DashboardShellProps {
  children: React.ReactNode;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
  user?: AuthUser | null;
}

function useStaggerAnimation(isExpanded: boolean, itemCount: number) {
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    if (isExpanded) {
      setVisibleItems(0);
      const timers: NodeJS.Timeout[] = [];
      for (let i = 0; i <= itemCount; i++) {
        timers.push(setTimeout(() => setVisibleItems(i + 1), i * 40));
      }
      return () => timers.forEach(clearTimeout);
    } else {
      setVisibleItems(0);
    }
  }, [isExpanded, itemCount]);

  return visibleItems;
}

export default function DashboardShell({ children, currentRoute, onNavigate, onLogout, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const visibleItems = useStaggerAnimation(expanded, 3);

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const userName = user?.name || 'User';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scan', label: 'Start Scan', icon: ScanLine },
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
    <div className="flex h-screen bg-surface-50 text-surface-900 overflow-hidden">
      <style>{`
        @keyframes pill-bounce-in {
          0% { transform: scale(0.92); opacity: 0; }
          60% { transform: scale(1.01); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pill-shrink-out {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        @keyframes nav-item-enter {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(30, 58, 138, 0.3); }
          50% { box-shadow: 0 4px 28px rgba(30, 58, 138, 0.5); }
        }
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes overlay-in {
          0% { opacity: 0; backdrop-filter: blur(0); }
          100% { opacity: 1; backdrop-filter: blur(12px); }
        }
        @keyframes mobile-panel-in {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes icon-spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .nav-item-enter {
          animation: nav-item-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .active-glow {
          animation: glow-pulse 2.5s ease-in-out infinite;
        }
        .sidebar-expand {
          transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sidebar-pill {
          transition: background-color 0.2s ease,
                      border-color 0.2s ease,
                      box-shadow 0.3s ease;
        }
        .nav-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nav-btn:hover {
          transform: scale(1.02);
        }
        .nav-btn:active {
          transform: scale(0.97);
          transition-duration: 0.1s;
        }
        .avatar-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .avatar-btn:hover {
          transform: scale(1.05);
        }
        .avatar-btn:active {
          transform: scale(0.95);
        }
        .logo-icon {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .logo-icon:hover {
          transform: rotate(10deg) scale(1.05);
        }
        .mobile-overlay {
          animation: overlay-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .mobile-panel {
          animation: mobile-panel-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .tooltip-fade {
          animation: tooltip-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes tooltip-in {
          0% { opacity: 0; transform: translateX(4px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .content-shift {
          transition: margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-30 lg:hidden mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Pill Sidebar — Desktop */}
      <aside
        ref={sidebarRef}
        className={`
          hidden lg:flex fixed z-40 flex-col
          top-1/2 -translate-y-1/2
          left-4 xl:left-6
          sidebar-expand
          ${expanded ? 'w-56' : 'w-[72px]'}
        `}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); setHoveredItem(null); }}
      >
        <div className={`
          flex flex-col
          bg-white/70 backdrop-blur-xl
          border border-white/80
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]
          rounded-3xl
          sidebar-pill
          overflow-hidden
          py-4 px-3
        `}>
          {/* Logo */}
          <div className={`flex items-center mb-6 ${expanded ? 'gap-3 px-2' : 'justify-center'}`}>
            <div className="logo-icon w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-600/20 cursor-pointer">
              <Activity className="w-5 h-5 text-white" />
            </div>
            {expanded && (
              <div className="whitespace-nowrap overflow-hidden nav-item-enter" style={{ animationDelay: '0ms' }}>
                <span className="text-lg font-bold tracking-tighter text-surface-900">SkinAI</span>
                <span className="text-primary-600">.</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1" role="navigation" aria-label="Main navigation">
            {navItems.map((item, idx) => {
              const isActive = currentRoute === item.id;
              return (
                <div key={item.id} className="relative">
                  <button
                    onClick={() => handleNav(item.id as PageRoute)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`
                      nav-btn w-full flex items-center gap-3 rounded-2xl relative
                      ${expanded ? 'px-3 py-2.5' : 'justify-center py-2.5'}
                      ${isActive
                        ? 'bg-primary-600 text-white active-glow'
                        : 'text-surface-400 hover:bg-surface-100/80 hover:text-surface-700'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                    style={expanded ? { animationDelay: `${idx * 40}ms` } : undefined}
                  >
                    <div className={`
                      w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      transition-all duration-200
                      ${isActive ? 'bg-white/20' : 'bg-surface-100 group-hover:bg-surface-200/80'}
                    `}>
                      <item.icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'text-white' : 'text-surface-500 group-hover:text-surface-700'}`} />
                    </div>

                    {expanded && (
                      <span className="whitespace-nowrap text-sm font-bold nav-item-enter" style={{ animationDelay: `${idx * 40 + 60}ms` }}>
                        {item.label}
                      </span>
                    )}

                    {/* Active bar */}
                    {isActive && !expanded && (
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-600 rounded-r-full" />
                    )}
                  </button>

                  {/* Tooltip for collapsed state */}
                  {!expanded && hoveredItem === item.id && (
                    <div className="tooltip-fade absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                      <div className="bg-surface-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-surface-900" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Divider */}
          <div className={`my-4 border-t border-surface-200/60 transition-all duration-300 ${expanded ? 'mx-2' : 'mx-1'}`} />

          {/* User Section */}
          <div className={`space-y-1 ${expanded ? '' : 'flex flex-col items-center'}`}>
            {/* User avatar */}
            <div className="relative">
              <button
                onClick={handleProfileClick}
                onMouseEnter={() => setHoveredItem('profile')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  avatar-btn flex items-center gap-3 rounded-2xl
                  ${expanded ? 'w-full px-3 py-2.5 hover:bg-surface-100/80' : 'justify-center py-2.5'}
                `}
                title={!expanded ? userName : undefined}
              >
                <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                  {userInitials}
                </div>
                {expanded && (
                  <div className="flex-1 min-w-0 text-left nav-item-enter" style={{ animationDelay: '180ms' }}>
                    <div className="text-sm font-bold text-surface-900 truncate">{userName}</div>
                  </div>
                )}
              </button>
              {!expanded && hoveredItem === 'profile' && (
                <div className="tooltip-fade absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="bg-surface-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    Profile
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-surface-900" />
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <div className="relative">
              <button
                onClick={handleLogoutClick}
                onMouseEnter={() => setHoveredItem('logout')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  nav-btn flex items-center gap-3 rounded-2xl
                  text-surface-400 hover:text-danger-500 hover:bg-danger-50/80
                  ${expanded ? 'w-full px-3 py-2.5' : 'justify-center py-2.5'}
                `}
                title={!expanded ? 'Sign Out' : undefined}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-100 group-hover:bg-danger-50 transition-colors duration-200">
                  <LogOut className="w-4 h-4" />
                </div>
                {expanded && (
                  <span className="text-sm font-bold nav-item-enter" style={{ animationDelay: '220ms' }}>Sign Out</span>
                )}
              </button>
              {!expanded && hoveredItem === 'logout' && (
                <div className="tooltip-fade absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="bg-surface-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    Sign Out
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-surface-900" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Pill Sidebar — Mobile */}
      {sidebarOpen && (
        <aside className="lg:hidden fixed inset-y-0 left-0 z-40 flex flex-col w-72">
          <div className="flex flex-col h-full m-3 mt-16 mb-16 mobile-panel
            bg-white/80 backdrop-blur-xl
            border border-white/80
            shadow-[0_8px_32px_rgba(0,0,0,0.12)]
            rounded-3xl
            overflow-hidden
          ">
            {/* Close button */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-600/20 logo-icon">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tighter text-surface-900">SkinAI</span>
                  <span className="text-primary-600">.</span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="nav-btn p-2 text-surface-400 hover:text-surface-900 rounded-xl hover:bg-surface-100"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1" role="navigation" aria-label="Main navigation">
              {navItems.map((item, idx) => {
                const isActive = currentRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id as PageRoute)}
                    className={`
                      nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl relative
                      ${isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 active-glow'
                        : 'text-surface-400 hover:bg-surface-100/80 hover:text-surface-700'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className={`
                      w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      transition-all duration-200
                      ${isActive ? 'bg-white/20' : 'bg-surface-100'}
                    `}>
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-surface-500'}`} />
                    </div>
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Divider */}
            <div className="mx-4 border-t border-surface-200/60" />

            {/* User Section */}
            <div className="p-3 space-y-1">
              <button
                onClick={handleProfileClick}
                className="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface-100/80"
              >
                <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-bold text-surface-900 truncate">{userName}</div>
                </div>
              </button>
              <button
                onClick={handleLogoutClick}
                className="nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-surface-400 hover:text-danger-500 hover:bg-danger-50/80"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-100 transition-colors duration-200">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold">Sign Out</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 content-shift lg:ml-[88px] xl:ml-[96px]">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 p-4 border-b border-surface-100/60 bg-white/60 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="nav-btn p-2 text-surface-500 hover:text-surface-900 rounded-xl hover:bg-surface-100"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-xl flex items-center justify-center logo-icon">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tighter text-surface-900">SkinAI<span className="text-primary-600">.</span></span>
          </div>
        </header>

        <main className="flex-1 bg-surface-50 overflow-y-auto relative">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
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
