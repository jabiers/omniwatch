'use client';

import './globals.css';
import { useState } from 'react';
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
} from 'lucide-react';
import { AuthGuard } from '../components/auth-guard';
import { ErrorBoundary } from '../components/error-boundary';
import { ToastContainer } from '../components/toast';
import { useAuthStore } from '../lib/auth-store';

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
    <html lang="en" className="dark">
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

  function handleLogout() {
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
        className={`fixed lg:static z-40 h-screen w-60 border-r border-white/[0.08] bg-[#0a0a0f] flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.08]">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight">OmniWatch</span>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: status + logout */}
        <div className="border-t border-white/[0.08]">
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
            {role && <span className="ml-auto text-xs text-gray-600 capitalize">{role}</span>}
          </button>

          {/* Status */}
          <div className="px-5 py-3 border-t border-white/[0.08]">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Daemon Connected
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
