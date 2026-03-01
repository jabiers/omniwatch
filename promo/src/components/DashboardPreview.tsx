import { useState } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

const NAV_ITEMS = [
  { label: 'Dashboard', active: true },
  { label: 'Agents', active: false },
  { label: 'Mesh', active: false },
  { label: 'Analytics', active: false },
  { label: 'Queue', active: false },
  { label: 'Recipes', active: false },
  { label: 'Marketplace', active: false },
  { label: 'Settings', active: false },
];

const STAT_CARDS = [
  { label: 'Total Agents', value: '12' },
  { label: 'Running', value: '8' },
  { label: 'Errors', value: '1' },
  { label: 'Uptime', value: '99.7%' },
];

const AGENTS = [
  { name: 'amazon-airpods', status: 'running', color: 'bg-emerald-400' },
  { name: 'btc-price-alert', status: 'running', color: 'bg-emerald-400' },
  { name: 'hackernews-ai', status: 'idle', color: 'bg-yellow-400' },
];

export default function DashboardPreview() {
  const { ref, isVisible } = useIntersectionObserver();
  const [hovered, setHovered] = useState(false);

  return (
    <section id="dashboard" className="py-24 px-4 sm:px-6 lg:px-8">
      <div ref={ref} className={`max-w-6xl mx-auto reveal ${isVisible ? 'visible' : ''}`}>
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">Glass Console</h2>
          <p className="text-gray-500 text-lg">A dashboard built for operators, not just viewers</p>
        </div>

        {/* Browser mockup with 3D perspective */}
        <div
          className="glass-card overflow-hidden transition-transform duration-500 ease-out"
          style={{
            transform: hovered
              ? 'perspective(1200px) rotateY(0deg) rotateX(0deg)'
              : 'perspective(1200px) rotateY(-3deg) rotateX(2deg)',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* macOS title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-3 text-xs text-gray-600 select-none">localhost:3457</span>
          </div>

          {/* Dashboard layout */}
          <div className="flex min-h-[340px]">
            {/* Sidebar */}
            <aside className="w-48 bg-[#080810] border-r border-white/[0.06] flex flex-col shrink-0">
              {/* Logo */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-white tracking-tight">Vigil</span>
              </div>

              {/* Nav items */}
              <nav className="flex-1 px-2 py-2 space-y-0.5">
                {NAV_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className={`px-3 py-1.5 rounded-md text-[10px] ${
                      item.active
                        ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                        : 'text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </nav>

              {/* Connection status */}
              <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-gray-600">Connected</span>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 bg-[#0c0c14] p-4">
              {/* Header bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex flex-col gap-[3px]">
                  <div className="w-3.5 h-[1.5px] bg-gray-600 rounded" />
                  <div className="w-3.5 h-[1.5px] bg-gray-600 rounded" />
                  <div className="w-3.5 h-[1.5px] bg-gray-600 rounded" />
                </div>
                <span className="text-[10px] text-gray-500 font-medium ml-1">Dashboard</span>
              </div>

              {/* Stat cards row */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {STAT_CARDS.map((card) => (
                  <div
                    key={card.label}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2"
                  >
                    <div className="text-[9px] text-gray-600 mb-0.5">{card.label}</div>
                    <div className="text-xs font-semibold text-white">{card.value}</div>
                  </div>
                ))}
              </div>

              {/* Agent list */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-md">
                <div className="px-3 py-1.5 border-b border-white/[0.06]">
                  <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                    Active Agents
                  </span>
                </div>
                {AGENTS.map((agent, i) => (
                  <div
                    key={agent.name}
                    className={`flex items-center justify-between px-3 py-2 ${
                      i < AGENTS.length - 1 ? 'border-b border-white/[0.04]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.color}`} />
                      <span className="text-[10px] text-gray-300 font-mono">{agent.name}</span>
                    </div>
                    <span className="text-[9px] text-gray-600">{agent.status}</span>
                  </div>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
