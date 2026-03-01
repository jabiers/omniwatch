const LINK_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Architecture', href: '#architecture' },
      { label: 'Timeline', href: '#timeline' },
      { label: 'Dashboard', href: '#dashboard' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'GitHub', href: '#' },
      { label: 'API Docs', href: '#' },
      { label: 'Contributing', href: '#' },
      { label: 'Releases', href: '#' },
    ],
  },
];

const PROJECT_INFO = ['v1.7.0', 'MIT License', 'TypeScript', 'Built with AI'];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06]">
      {/* CTA section */}
      <div className="py-24 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Automate?</h2>
        <p className="text-gray-500 text-lg mb-8">Start building autonomous agents in minutes</p>
        <a
          href="https://github.com/jabiers/omniwatch"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Get Started
        </a>
      </div>

      {/* Link columns */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {LINK_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white mb-4">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Project column (static text, no links) */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Project</h3>
            <ul className="space-y-2">
              {PROJECT_INFO.map((item) => (
                <li key={item} className="text-sm text-gray-500">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-sm text-gray-600">OmniWatch &copy; {year}</span>
          <span className="text-sm text-gray-600">Built with TypeScript, powered by AI</span>
        </div>
      </div>
    </footer>
  );
}
