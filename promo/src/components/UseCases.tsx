import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface UseCase {
  icon: string;
  title: string;
  description: string;
  prompt: string;
}

const USE_CASES: UseCase[] = [
  {
    icon: '🛒',
    title: 'E-Commerce Monitoring',
    description:
      'Watch prices across Amazon, eBay, Best Buy. Get alerted when products drop below your target price.',
    prompt: '"Alert me when RTX 5090 drops below $1,500 on any major retailer"',
  },
  {
    icon: '🏗️',
    title: 'Infrastructure Health',
    description:
      'Monitor your APIs, databases, and services 24/7. Auto-detect anomalies and get notified.',
    prompt:
      '"Check api.example.com/health every 5 minutes, alert if response > 2s or status != 200"',
  },
  {
    icon: '📰',
    title: 'Content & News',
    description: 'Track RSS feeds, social media, and news sites for topics you care about.',
    prompt: '"Summarize Hacker News top 10 posts about AI every morning at 9am"',
  },
  {
    icon: '📈',
    title: 'Crypto & Finance',
    description: 'Track crypto prices, stock movements, and DeFi protocols in real-time.',
    prompt: '"Alert me when BTC crosses $100k or ETH gas drops below 10 gwei"',
  },
];

export default function UseCases() {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="usecases" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">
            What Will You Automate?
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            From price alerts to infrastructure monitoring — if you can describe it, Vigil can run
            it
          </p>
        </div>

        {/* Use case cards */}
        <div
          ref={ref}
          className={`grid grid-cols-1 sm:grid-cols-2 gap-6 stagger ${isVisible ? 'visible' : ''}`}
        >
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="glass-card p-6">
              <div className="text-3xl mb-3">{uc.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{uc.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{uc.description}</p>
              <div className="bg-black/30 rounded-lg p-3 mt-3">
                <code className="text-xs font-mono">
                  <span className="text-gray-500">$ vigil watch </span>
                  <span className="text-emerald-300">{uc.prompt}</span>
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
