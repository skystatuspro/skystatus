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
  LogOut
} from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../lib/AuthContext';

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
  const { user, signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
      
      {/* --- Sidebar (Desktop) --- */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white p-6 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
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
                onNavigate(item.id as ViewState);
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
        </nav>

        {/* Footer Info */}
        <div className="mt-auto pt-6 flex-shrink-0 space-y-3">
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
                  onClick={() => signOut()}
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
                Flying Blue v1.0
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
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-1.5 rounded-lg">
                <Plane className="text-white transform -rotate-45" size={18} fill="currentColor" />
              </div>
              <span className="font-bold text-slate-900">SkyStatus</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
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
          
          {/* Footer */}
          <footer className="mt-auto border-t border-slate-200 py-6 px-4 sm:px-6 lg:px-10 bg-white/50">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
              <p>© {new Date().getFullYear()} SkyStatus. Not affiliated with Air France-KLM or Flying Blue.</p>
              <div className="flex items-center gap-4">
                <a href="#/faq" className="hover:text-slate-600 transition-colors">Help & FAQ</a>
                <span className="text-slate-300">·</span>
                <a href="#/about" className="hover:text-slate-600 transition-colors">About</a>
                <span className="text-slate-300">·</span>
                <a href="#/contact" className="hover:text-slate-600 transition-colors">Contact</a>
                <span className="text-slate-300">·</span>
                <a href="#/privacy" className="hover:text-slate-600 transition-colors">Privacy</a>
                <span className="text-slate-300">·</span>
                <a href="#/terms" className="hover:text-slate-600 transition-colors">Terms</a>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};