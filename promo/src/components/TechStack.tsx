import { TECH_STACK } from '../lib/constants';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

export default function TechStack() {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="tech" className="py-24 px-4 sm:px-6 lg:px-8">
      <div ref={ref} className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">Tech Stack</h2>
          <p className="text-gray-500 text-lg">Modern, production-ready foundation</p>
        </div>

        {/* Category grid */}
        <div className={`stagger ${isVisible ? 'visible' : ''}`}>
          {TECH_STACK.map((cat) => (
            <div key={cat.category} className="mb-6">
              <span className="text-xs uppercase tracking-wider text-gray-500 mb-2 block">
                {cat.category}
              </span>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((item) => (
                  <span
                    key={item}
                    className="glass-card px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors cursor-default"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
