'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Bell,
  Settings,
  Activity,
  Menu,
  X,
  DollarSign,
  BookOpen,
  Network,
  BarChart3,
  Layers,
  Building2,
  Store,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AuthGuard } from '../components/auth-guard';
import { ErrorBoundary } from '../components/error-boundary';
import { ToastContainer } from '../components/toast';
import { useAuthStore } from '../lib/auth-store';
import { useWsStatus } from '../lib/ws-store';
import { useTheme, initTheme } from '../lib/theme-store';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/mesh', label: 'Mesh', icon: Network },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/queue', label: 'Queue', icon: Layers },
  { href: '/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/usage', label: 'Usage', icon: DollarSign },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/tenants', label: 'Tenants', icon: Building2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex">
        {isLoginPage ? (
          // Login page renders without sidebar/auth guard
          children
        ) : (
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>
        )}
        <ToastContainer />
      </body>
    </html>
  );
}

/** Main app shell with sidebar + header */
function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clearAuth, role } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const wsStatus = useWsStatus();
  const { theme, toggleTheme } = useTheme();
  const [notifCount, setNotifCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    async function fetchNotifCount() {
      try {
        const res = await apiFetch('/api/notifications?limit=50');
        if (res.ok) {
          const data = (await res.json()) as { notifications?: unknown[] };
          const list = data.notifications ?? [];
          setNotifCount(list.length);
        }
      } catch {
        /* ignore fetch errors */
      }
    }
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+K or Cmd+K: navigate to agents
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/agents');
      }
      // Escape: close mobile sidebar
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, sidebarOpen]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  }

  useEffect(() => {
    initTheme();
  }, []);

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Server session cleanup is best-effort
    }
    clearAuth();
    router.replace('/login');
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 h-screen ${collapsed ? 'w-16' : 'w-60'} border-r border-white/[0.08] bg-[#0a0a0f] flex flex-col transition-all duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-3 ${collapsed ? 'px-3 justify-center' : 'px-5'} py-5 border-b border-white/[0.08]`}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          {!collapsed && <span className="text-lg font-semibold tracking-tight">OmniWatch</span>}
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${collapsed ? 'justify-center' : ''} ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && item.label}
                {!collapsed && item.label === 'Notifications' && notifCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white min-w-[18px] text-center">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: collapse toggle + theme toggle + logout + status */}
        <div className="border-t border-white/[0.08]">
          {/* Collapse toggle */}
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center py-3 text-gray-500 hover:text-white hover:bg-white/[0.05] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 ${collapsed ? 'justify-center px-3' : 'px-5'} py-3 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors`}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 shrink-0" />
            )}
            {!collapsed && (theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 ${collapsed ? 'justify-center px-3' : 'px-5'} py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                Logout
                {role && <span className="ml-auto text-xs text-gray-600 capitalize">{role}</span>}
              </>
            )}
          </button>

          {/* Status */}
          <div
            className={`${collapsed ? 'px-3 justify-center' : 'px-5'} py-3 border-t border-white/[0.08]`}
          >
            <div
              className={`flex items-center gap-2 text-xs text-gray-500 ${collapsed ? 'justify-center' : ''}`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  wsStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : wsStatus === 'reconnecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}
              />
              {!collapsed &&
                (wsStatus === 'connected'
                  ? 'Connected'
                  : wsStatus === 'reconnecting'
                    ? 'Reconnecting...'
                    : 'Disconnected')}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 h-14 border-b border-white/[0.08] bg-[#0a0a0f]/80 backdrop-blur-md flex items-center px-5 gap-4">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </>
  );
}
