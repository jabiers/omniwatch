import { FEATURES } from '../lib/constants';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

export default function FeatureGrid() {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">
            Built for Autonomous Operations
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to create, deploy, and manage AI agents at scale
          </p>
        </div>

        {/* Feature cards grid */}
        <div
          ref={ref}
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger ${isVisible ? 'visible' : ''}`}
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="glass-card p-8 hover:translate-y-[-2px] transition-transform"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
