import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

const LINK_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Use Cases', href: '#usecases' },
      { label: 'Architecture', href: '#architecture' },
      { label: 'Dashboard', href: '#dashboard' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Quick Start', href: '#quickstart' },
      { label: 'Tech Stack', href: '#tech' },
      { label: 'Timeline', href: '#timeline' },
      {
        label: 'API Reference',
        href: 'https://github.com/jabiers/omniwatch/blob/main/apps/api/src/openapi.ts',
        external: true,
      },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'GitHub', href: 'https://github.com/jabiers/omniwatch', external: true },
      {
        label: 'Contributing',
        href: 'https://github.com/jabiers/omniwatch/blob/main/CONTRIBUTING.md',
        external: true,
      },
      {
        label: 'Releases',
        href: 'https://github.com/jabiers/omniwatch/releases',
        external: true,
      },
      { label: 'Issues', href: 'https://github.com/jabiers/omniwatch/issues', external: true },
    ],
  },
];

/** Scroll to the top of the page smoothly */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function Footer() {
  const year = new Date().getFullYear();
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <footer className="border-t border-white/[0.06]">
      {/* CTA Banner */}
      <div className="py-24 px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={`max-w-4xl mx-auto glass-card glow grid-bg p-12 text-center reveal ${isVisible ? 'visible' : ''}`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Automate?</h2>
          <p className="text-gray-400 text-lg mb-8">Start building autonomous agents in minutes</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/jabiers/omniwatch#quick-start"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Get Started
            </a>
            <a
              href="https://github.com/jabiers/omniwatch"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 glass-card px-6 py-3 rounded-lg text-sm font-semibold text-gray-300 hover:text-white hover:border-white/20 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* 4-column link grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {LINK_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white mb-4">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...('external' in link && link.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Project column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 text-emerald-400"
                >
                  <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">OmniWatch</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">AI-powered autonomous monitoring platform</p>
            <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full mb-2">
              v1.8.0
            </span>
            <p className="text-xs text-gray-600">MIT License</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Left */}
          <span className="text-sm text-gray-600">&copy; {year} OmniWatch</span>

          {/* Center */}
          <span className="text-sm text-gray-600 flex items-center gap-1.5">
            Built with TypeScript, powered by AI
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3.5 h-3.5 text-red-500/70"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </span>

          {/* Right - back to top */}
          <button
            onClick={scrollToTop}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-colors"
            aria-label="Back to top"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
