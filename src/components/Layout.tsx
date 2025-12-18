import React from 'react';
import { 
  LayoutDashboard, 
  Plane, 
  Wallet, 
  Award, 
  Flame, 
  BarChart3, 
  Menu, 
  X,
  Coins,
  Route,
  Settings,
  User,
  LogOut,
  Bug,
  Download,
  AlertTriangle,
  Sparkles,
  Gauge,
  Search
} from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../lib/AuthContext';
import { useViewMode } from '../hooks/useViewMode';
import { useAnalytics } from '../hooks/useAnalytics';
import { BugReportModal } from './BugReportModal';
import { CookieSettingsLink } from './CookieConsent';
import { APP_VERSION } from '../config/version';
import { SearchModal, SearchTrigger, useSearchShortcut } from './SearchModal';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
  onOpenSettings: () => void;
  isDemoMode: boolean;
  isLocalMode?: boolean;
}

const MenuItem = ({
  id,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  id?: ViewState;
  label: string;
  icon: any;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon
      size={20}
      className={`transition-colors ${
        isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'
      }`}
    />
    <span className="font-medium text-sm tracking-wide">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({
  currentView,
  onNavigate,
  children,
  onOpenSettings,
  isDemoMode,
  isLocalMode = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const { user, signOut } = useAuth();
  const { viewMode, isSimpleMode, setViewMode } = useViewMode();
  const { trackViewMode, trackNav, trackUserSignOut, trackSearch } = useAnalytics();

  // Check for ?search=1 parameter on mount (from static pages)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('search') === '1') {
      setIsSearchOpen(true);
      trackSearch('button');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [trackSearch]);

  // Cmd+K shortcut for search (with tracking)
  useSearchShortcut(() => setIsSearchOpen(true), trackSearch);

  // Handle search open from button click
  const handleSearchOpen = () => {
    trackSearch('button');
    setIsSearchOpen(true);
  };

  // Track navigation with analytics
  const handleNavigate = (view: ViewState) => {
    trackNav(view);
    onNavigate(view);
  };

  // Track view mode toggle with analytics
  const handleViewModeToggle = () => {
    const newMode = isSimpleMode ? 'full' : 'simple';
    trackViewMode(newMode);
    setViewMode(newMode);
  };

  // Track sign out
  const handleSignOut = () => {
    trackUserSignOut();
    signOut();
  };

  // Menu items differ based on view mode
  const menuItems = isSimpleMode 
    ? [
        // Simple mode: Fewer items, friendlier names
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'addFlight', label: 'Add Flight', icon: Plane },
        { id: 'addMiles', label: 'Add Miles', icon: Coins },
        { id: 'xp', label: 'Status Progress', icon: Award },
        { id: 'miles', label: 'Miles Balance', icon: Wallet },
        { id: 'mileageRun', label: 'XP Planner', icon: Route },
      ]
    : [
        // Full mode: All items
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'addFlight', label: 'Add Flight', icon: Plane },
        { id: 'addMiles', label: 'Add Miles', icon: Coins },
        { id: 'miles', label: 'Miles Engine', icon: Wallet },
        { id: 'xp', label: 'XP Qualification', icon: Award },
        { id: 'redemption', label: 'Redemptions', icon: Flame },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'mileageRun', label: 'XP Run Simulator', icon: Route },
      ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex">
      
      {/* --- Sidebar (Desktop & Mobile) --- */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-[80] w-72 bg-slate-900 text-white p-6 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-2 mb-10 mt-2 flex-shrink-0">
          <div className="bg-white p-2 rounded-xl shadow-lg shadow-white/10">
              <Plane className="text-slate-900 transform -rotate-45" size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">
              SkyStatus
            </h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">
              Pro Analytics
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <MenuItem
              key={item.id}
              id={item.id as ViewState}
              label={item.label}
              icon={item.icon}
              isActive={currentView === item.id}
              onClick={() => {
                handleNavigate(item.id as ViewState);
                setIsMobileMenuOpen(false);
              }}
            />
          ))}
          
          <div className="my-4 border-t border-slate-800 mx-4" />
          
          <MenuItem 
            label="Data Settings" 
            icon={Settings} 
            isActive={false} 
            onClick={() => {
                onOpenSettings();
                setIsMobileMenuOpen(false);
            }} 
          />
          
          {/* Search - secondary utility */}
          <button
            onClick={handleSearchOpen}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200 group"
          >
            <Search size={20} className="text-slate-500 group-hover:text-white transition-colors" />
            <span className="font-medium text-sm tracking-wide">Search</span>
            <kbd className="ml-auto px-1.5 py-0.5 bg-slate-800 group-hover:bg-slate-700 rounded text-[10px] font-mono text-slate-500">⌘K</kbd>
          </button>
        </nav>

        {/* Footer Info */}
        <div className="mt-auto pt-6 flex-shrink-0 space-y-3">
          {/* View Mode Toggle */}
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">View Mode</p>
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => {
                  if (viewMode !== 'simple') {
                    trackViewMode('simple');
                    setViewMode('simple');
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'simple'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles size={14} />
                Simple
              </button>
              <button
                onClick={() => {
                  if (viewMode !== 'full') {
                    trackViewMode('full');
                    setViewMode('full');
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'full'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gauge size={14} />
                Full
              </button>
            </div>
          </div>

          {/* User Account Section */}
          {user && !isDemoMode && (
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700 rounded-lg">
                  <User size={16} className="text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Signed in as</p>
                  <p className="text-xs text-slate-300 font-medium truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm space-y-2">
            <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Current Model</p>
                <p className="text-xs text-slate-300 font-medium flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Flying Blue v{APP_VERSION} <span className="ml-1 px-1.5 py-0.5 text-[8px] bg-amber-500/20 text-amber-400 rounded font-bold">BETA</span>
                </p>
            </div>

            {/* DEMO/LOCAL INDICATOR IN SIDEBAR */}
            {isDemoMode && (
                <div className={`mt-2 rounded-xl px-3 py-2 ${
                  isLocalMode 
                    ? 'bg-amber-500/10 border border-amber-500/20' 
                    : 'bg-indigo-500/10 border border-indigo-500/20'
                }`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      isLocalMode ? 'text-amber-400' : 'text-indigo-400'
                    }`}>Workspace</p>
                    <p className={`text-[11px] font-medium ${
                      isLocalMode ? 'text-amber-200' : 'text-indigo-200'
                    }`}>{isLocalMode ? 'Local Mode Active' : 'Demo Mode Active'}</p>
                </div>
            )}
          </div>
        </div>
      </aside>

      {/* --- Mobile Overlay --- */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-[79] lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-1.5 rounded-lg">
                <Plane className="text-white transform -rotate-45" size={18} fill="currentColor" />
              </div>
              <span className="font-bold text-slate-900">SkyStatus</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearchOpen}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-12">
            
            {/* DEMO/LOCAL BANNER BOVENAAN CONTENT */}
            {isDemoMode && (
                <div className={`mb-6 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 ${
                  isLocalMode 
                    ? 'border-amber-200 bg-amber-50' 
                    : 'border-indigo-100 bg-indigo-50'
                }`}>
                    <div className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-[10px] font-bold shadow-sm ring-2 ${
                          isLocalMode 
                            ? 'bg-amber-500 ring-amber-200' 
                            : 'bg-indigo-600 ring-indigo-200'
                        }`}>{isLocalMode ? 'L' : 'D'}</span>
                        <div>
                            <p className={`text-xs font-bold ${isLocalMode ? 'text-amber-900' : 'text-indigo-900'}`}>
                              {isLocalMode ? 'Local Mode Active' : 'Demo Workspace Active'}
                            </p>
                            <p className={`text-[11px] leading-relaxed max-w-lg ${isLocalMode ? 'text-amber-700/80' : 'text-indigo-700/80'}`}>
                              {isLocalMode 
                                ? <>Your data is <span className="font-bold">not saved automatically</span>. Use <span className="font-bold">Data Settings → Export JSON</span> to save your work, or sign in for cloud sync.</>
                                : <>You are exploring SkyStatus with sample data. Your changes here are temporary. Use <span className="font-bold">Data Settings</span> to clear this and start your own portfolio.</>
                              }
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onOpenSettings}
                        className={`whitespace-nowrap inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-[11px] font-bold transition-all shadow-sm ${
                          isLocalMode 
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300' 
                            : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300'
                        }`}
                    >
                        {isLocalMode ? 'Export Data' : 'Open Settings'}
                    </button>
                </div>
            )}

            {children}
          </div>
          
          {/* Simple Footer */}
          <footer className="mt-auto border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-10 bg-white/50">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <p>© {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.</p>
              <div className="flex items-center gap-3">
                <a href="/guide" className="hover:text-slate-600 transition-colors">Guides</a>
                <span className="text-slate-300">·</span>
                <a href="/faq" className="hover:text-slate-600 transition-colors">Help & FAQ</a>
                <span className="text-slate-300">·</span>
                <a href="/about" className="hover:text-slate-600 transition-colors">About</a>
                <span className="text-slate-300">·</span>
                <a href="/contact" className="hover:text-slate-600 transition-colors">Contact</a>
                <span className="text-slate-300">·</span>
                <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy</a>
                <span className="text-slate-300">·</span>
                <a href="/cookies" className="hover:text-slate-600 transition-colors">Cookies</a>
                <span className="text-slate-300">·</span>
                <a href="/terms" className="hover:text-slate-600 transition-colors">Terms</a>
                <span className="text-slate-300">·</span>
                <CookieSettingsLink />
              </div>
            </div>
          </footer>
        </div>

        {/* Floating Beta Bar - Desktop Only */}
        <div className="hidden lg:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/30 px-6 py-3 flex items-center gap-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
                <AlertTriangle size={16} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Beta v{APP_VERSION}</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-xs text-slate-400">Export your data regularly</p>
              </div>
            </div>
            
            <div className="w-px h-8 bg-slate-700" />
            
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 hover:text-white transition-all"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={() => setIsBugReportOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/25"
              >
                <Bug size={14} />
                Report Bug
              </button>
            </div>
          </div>
        </div>

        {/* Bug Report Modal */}
        <BugReportModal 
          isOpen={isBugReportOpen} 
          onClose={() => setIsBugReportOpen(false)} 
        />

        {/* Search Modal */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </main>
    </div>
  );
};
