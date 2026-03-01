import { useRef } from 'react';

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  /** Update CSS custom properties for radial gradient spotlight */
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mouse-x', `${x}%`);
    el.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden grid-bg"
      style={
        {
          '--mouse-x': '50%',
          '--mouse-y': '50%',
        } as React.CSSProperties
      }
    >
      {/* Mouse-tracking radial gradient spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(16,185,129,0.06), transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Version badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-emerald-300 font-medium">v1.7 Released</span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-6">
          <span className="text-gradient">Don&apos;t Config,</span>
          <br />
          <span className="text-gradient">Just Speak</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Describe what you want in plain language. AI creates, runs, monitors, and self-heals
          autonomous agents 24/7.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#features"
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Get Started
          </a>
          <a
            href="#architecture"
            className="glass-card border-white/10 hover:border-white/20 px-8 py-3 rounded-xl transition-colors text-gray-300 hover:text-white"
          >
            View Documentation
          </a>
        </div>

        {/* Terminal one-liner preview */}
        <div className="glass-card inline-flex items-center gap-3 px-5 py-3 rounded-xl font-mono text-sm">
          <span className="text-emerald-400">$</span>
          <span className="text-gray-300">
            omni watch &quot;Alert me when AirPods Pro drops below $250&quot;
          </span>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
    </section>
  );
}
