import React from 'react';
import { LayoutDashboard, ScanLine, History, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageRoute } from '../../App';
import { AuthUser } from '../../services/auth';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  user?: AuthUser | null;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  isCollapsed,
  setIsCollapsed,
  currentRoute,
  onNavigate,
  user
}: SidebarProps) {
  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const userName = user?.name || 'User';
  const userEmail = user?.email || '';

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
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 shadow-sm
          transform transition-all duration-300 ease-in-out lg:translate-x-0 flex flex-col
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Brand */}
        <div className={`h-20 flex items-center border-b border-gray-100 relative ${isCollapsed ? 'justify-center px-0 lg:px-0' : 'justify-between px-6 lg:justify-start'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center shadow-sm shrink-0 ${isCollapsed ? 'lg:ml-0' : ''}`}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {(!isCollapsed || sidebarOpen) && (
              <span className="text-xl font-display font-bold tracking-tight text-gray-900 lg:block lg:whitespace-nowrap overflow-hidden transition-opacity duration-300">
                SkinAI
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-colors z-50"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-6 space-y-1.5 ${isCollapsed ? 'px-3' : 'px-4'}`} role="navigation">
          {navItems.map((item) => {
            const isActive = currentRoute === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleNav(item.id as PageRoute)}
                  className={`
                    w-full flex items-center rounded-xl transition-all duration-200 font-medium text-sm
                    ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                    ${isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/50'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-700' : 'text-gray-400'}`} />
                  {(!isCollapsed || sidebarOpen) && <span className="lg:whitespace-nowrap">{item.label}</span>}
                </button>
                {/* Tooltip on hover when collapsed */}
                {isCollapsed && (
                  <div className="hidden lg:group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                      {item.label}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className={`p-4 border-t border-gray-100 ${isCollapsed ? 'px-3' : ''}`}>
          <div className="relative group">
            <button
              onClick={handleProfileClick}
              className={`w-full flex items-center rounded-xl hover:bg-gray-50 transition-colors text-left ${isCollapsed ? 'justify-center p-2' : 'gap-3 p-2'}`}
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm shrink-0">
                {userInitials}
              </div>
              {(!isCollapsed || sidebarOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
              )}
            </button>
            {isCollapsed && (
              <div className="hidden lg:group-hover:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  Profile
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
