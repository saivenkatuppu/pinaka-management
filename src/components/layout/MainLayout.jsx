import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  LayoutDashboard,
  ClipboardList,
  HeartPulse,
  Zap,
  GitCompare,
  Sparkles,
  Layers,
  Database,
  Wheat,
  Stethoscope,
  Pill,
  Skull,
  DollarSign,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Search,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('pinaka_theme');
    if (saved) return saved;
    return 'dark'; // default to premium dark mode
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('pinaka_theme', theme);
  }, [theme]);

  // Navigation states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Mock initial notifications to simulate farm alerts
  const [notifications, setNotifications] = useState([
    { id: 1, message: "Sow #S-104 expected farrowing in 3 days", type: "warning", read: false },
    { id: 2, message: "Low Stock Alert: Pre-Starter Feed under 150 kg", type: "danger", read: false },
    { id: 3, message: "Medicine 'Penicillin' is expiring on 2026-06-01", type: "danger", read: true },
    { id: 4, message: "Treatment due today for Piglet #P-402", type: "info", read: false }
  ]);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const closeMobile = () => setIsMobileOpen(false);

  // Unread notification count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Dashboard standalone item
  const dashboardItem = { name: 'Dashboard', path: '/', icon: LayoutDashboard };

  // Grouped modules to follow actual farm operational workflow
  const navigationGroups = [
    {
      groupName: 'Animal Management',
      items: [
        { name: 'Animal Stock Register', path: '/stock', icon: Database },
        { name: 'Piglet Record Card', path: '/piglets', icon: ClipboardList },
        { name: 'Sow Record Card', path: '/sows', icon: HeartPulse },
        { name: 'Boar Record Card', path: '/boars', icon: Zap },
        { name: 'Farm Structure', path: '/structure', icon: Layers }
      ]
    },
    {
      groupName: 'Breeding Management',
      items: [
        { name: 'Breeding Record', path: '/breeding', icon: GitCompare },
        { name: 'Farrowing Record', path: '/farrowing', icon: Sparkles },
        { name: 'Parity / Litter Record', path: '/parity', icon: Layers }
      ]
    },
    {
      groupName: 'Health Management',
      items: [
        { name: 'Treatment Register', path: '/treatment', icon: Stethoscope },
        { name: 'Medicine & Vaccine Record', path: '/medicine', icon: Pill },
        { name: 'Mortality Register', path: '/mortality', icon: Skull }
      ]
    },
    {
      groupName: 'Commercial',
      items: [
        { name: 'Sale Register', path: '/sales', icon: DollarSign }
      ]
    },
    {
      groupName: 'System',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings }
      ]
    }
  ];

  // Resolve dynamic breadcrumbs
  const getBreadcrumbs = () => {
    const currentPath = location.pathname;
    if (currentPath === '/') return 'Dashboard';
    
    for (const group of navigationGroups) {
      const match = group.items.find(m => m.path === currentPath);
      if (match) return match.name;
    }
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary flex">
      
      {/* 1. DESKTOP COLLAPSIBLE SIDEBAR */}
      <aside 
        className={`hidden md:flex flex-col bg-sidebar border-r border-borderDark transition-all duration-300 z-30 shrink-0 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } no-print`}
      >
        {/* Brand / Title Header */}
        <div className="h-14 border-b border-borderDark flex items-center justify-between px-4 select-none bg-sidebar">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                <span className="text-primary font-bold text-base">P</span>
              </div>
              <div>
                <h1 className="text-xs font-black tracking-widest text-textPrimary">PINAKA</h1>
                <p className="text-[9px] text-textSecondary uppercase tracking-wider font-semibold">Smart Farm</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-7 h-7 bg-primary/10 border border-primary/30 rounded flex items-center justify-center mx-auto">
              <span className="text-primary font-bold text-sm">P</span>
            </div>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary border border-transparent hover:border-borderDark"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Sidebar Nav Links list */}
        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5 scrollbar-thin select-none">
          {/* Dashboard Item */}
          <NavLink
            to={dashboardItem.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all border border-transparent ${
                isActive 
                  ? 'bg-primary/10 text-primary border-primary/20 shadow-glow' 
                  : 'text-textSecondary hover:bg-cardBg hover:text-textPrimary hover:border-borderDark/40'
              }`
            }
            title={dashboardItem.name}
          >
            <dashboardItem.icon className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">{dashboardItem.name}</span>}
          </NavLink>

          {/* Grouped Items */}
          {navigationGroups.map((group, groupIdx) => (
            <React.Fragment key={groupIdx}>
              {/* Sidebar Header Divider */}
              {!isSidebarCollapsed ? (
                <div className="px-3 pt-4 pb-1 text-[9px] font-black uppercase text-textMuted tracking-widest select-none">
                  {group.groupName}
                </div>
              ) : (
                <div className="h-[1px] bg-borderDark/30 my-2 mx-2" />
              )}

              {group.items.map((mod, index) => (
                <NavLink
                  key={index}
                  to={mod.path}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all border border-transparent ${
                      isActive 
                        ? 'bg-primary/10 text-primary border-primary/20 shadow-glow' 
                        : 'text-textSecondary hover:bg-cardBg hover:text-textPrimary hover:border-borderDark/40'
                    }`
                  }
                  title={mod.name}
                >
                  <mod.icon className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{mod.name}</span>}
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* User profile Summary box */}
        <div className="p-3 border-t border-borderDark bg-sidebar flex flex-col gap-2">
          {!isSidebarCollapsed && user && (
            <div className="flex items-center gap-2.5 px-1 py-0.5">
              <div className="w-7 h-7 rounded bg-primary/25 border border-primary/40 text-primary flex items-center justify-center font-bold text-xs uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-textPrimary truncate">{user.name}</p>
                <p className="text-[9px] text-textSecondary truncate font-medium uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-cardBg hover:bg-danger/10 hover:text-danger text-xs text-textSecondary hover:border hover:border-danger/25 font-bold rounded transition-all"
            title="Log Out from platform"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* 2. MOBILE RESPONSIVE SIDEBAR OVERLAY */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden no-print">
          {/* Backdrop Blur */}
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={closeMobile} />
          
          <aside className="relative flex flex-col w-64 max-w-xs bg-sidebar border-r border-borderDark z-50 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-borderDark mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                  <span className="text-primary font-black text-sm">P</span>
                </div>
                <span className="text-xs font-black tracking-widest uppercase">PINAKA Farm</span>
              </div>
              <button onClick={closeMobile} className="p-1 hover:bg-cardBg rounded text-textSecondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 select-none">
              {/* Dashboard */}
              <NavLink
                to={dashboardItem.path}
                onClick={closeMobile}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider border border-transparent ${
                    isActive 
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-glow' 
                      : 'text-textSecondary hover:bg-cardBg hover:text-textPrimary'
                  }`
                }
              >
                <dashboardItem.icon className="w-4 h-4 shrink-0" />
                <span>{dashboardItem.name}</span>
              </NavLink>

              {/* Grouped Items */}
              {navigationGroups.map((group, groupIdx) => (
                <React.Fragment key={groupIdx}>
                  <div className="px-3 pt-4 pb-1 text-[9px] font-black uppercase text-textMuted tracking-widest">
                    {group.groupName}
                  </div>
                  {group.items.map((mod, index) => (
                    <NavLink
                      key={index}
                      to={mod.path}
                      onClick={closeMobile}
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider border border-transparent ${
                          isActive 
                            ? 'bg-primary/10 text-primary border-primary/20 shadow-glow' 
                            : 'text-textSecondary hover:bg-cardBg hover:text-textPrimary'
                        }`
                      }
                    >
                      <mod.icon className="w-4 h-4 shrink-0" />
                      <span>{mod.name}</span>
                    </NavLink>
                  ))}
                </React.Fragment>
              ))}
            </nav>
            
            <div className="pt-4 border-t border-borderDark mt-4 flex flex-col gap-3">
              {user && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-6.5 h-6.5 rounded bg-primary/25 text-primary flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-textPrimary truncate">{user.name}</p>
                    <p className="text-[9px] text-textSecondary uppercase font-medium">{user.role}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-1.5 bg-cardBg hover:bg-danger/10 hover:text-danger text-xs text-textSecondary hover:border hover:border-danger/25 font-bold rounded transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 3. MAIN CONTENT SHELL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-14 border-b border-borderDark bg-sidebar flex items-center justify-between px-4 md:px-6 z-20 no-print">
          
          {/* Breadcrumb / Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 hover:bg-cardBg rounded text-textSecondary border border-borderDark/40 md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-textSecondary font-semibold tracking-wider uppercase select-none">
              <span className="text-primary font-extrabold">{getBreadcrumbs()}</span>
            </div>
          </div>

          {/* Search, Notifications, Profile controls */}
          <div className="flex items-center gap-4">
            
            {/* Global Search Input placeholder */}
            <div className="relative hidden lg:block w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-textSecondary/50 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Global animal search..."
                className="w-full bg-background/40 border border-borderDark text-[11px] pl-8 pr-3 py-1.5 rounded-md outline-none focus:border-primary/50 text-textPrimary placeholder:text-textSecondary/40"
              />
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 hover:bg-cardBg rounded border border-borderDark/40 transition-all text-textSecondary hover:text-primary flex items-center justify-center"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-orange-500 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {/* Notification bell dropdown trigger */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`p-1.5 hover:bg-cardBg rounded border border-borderDark/40 transition-colors text-textSecondary relative ${
                  isNotificationOpen ? 'text-primary bg-cardBg' : ''
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-black text-[9px] font-black rounded-full flex items-center justify-center border border-sidebar animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Overlay Menu */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-sidebar border border-borderDark rounded-lg shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-40 overflow-hidden">
                  <div className="px-4 py-2 border-b border-borderDark bg-cardHover flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-textPrimary uppercase tracking-wider">Alert Center</span>
                    {unreadCount > 0 && (
                      <span className="badge-danger text-[9px]">{unreadCount} Active</span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto flex flex-col scrollbar-thin">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-textSecondary text-[11px]">No alerts triggered.</div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-3 border-b border-borderDark/40 flex flex-col gap-1 transition-colors hover:bg-cardBg/30 ${
                            !notif.read ? 'bg-primary/5 font-semibold' : ''
                          }`}
                        >
                          <p className="text-[11px] text-textPrimary font-medium leading-normal">{notif.message}</p>
                          <div className="flex items-center justify-between text-[9px] text-textSecondary mt-1">
                            <span className={`uppercase font-bold ${
                              notif.type === 'danger' ? 'text-danger' : notif.type === 'warning' ? 'text-warning' : 'text-blueAccent'
                            }`}>{notif.type}</span>
                            <button 
                              onClick={() => {
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                              }}
                              className="text-primary hover:underline"
                            >
                              {!notif.read ? 'Mark read' : ''}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Micro User details */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-borderDark/60">
                <div className="w-6.5 h-6.5 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden xl:flex flex-col text-[10px]">
                  <span className="font-bold text-textPrimary">{user.name}</span>
                  <span className="text-textSecondary uppercase tracking-widest text-[8px] font-semibold">{user.role}</span>
                </div>
              </div>
            )}

          </div>
        </header>

        {/* Core Main View Render Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background relative scrollbar-thin print:bg-white print:text-black">
          {children}
        </main>
      </div>

    </div>
  );
}
