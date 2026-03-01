import { VERSIONS } from '../lib/constants';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

export default function Timeline() {
  const { ref, isVisible } = useIntersectionObserver();

  const lastIndex = VERSIONS.length - 1;

  return (
    <section id="timeline" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">Evolution</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">14 releases in rapid iteration</p>
        </div>

        {/* Horizontal scrollable timeline */}
        <div ref={ref} className={`overflow-x-auto pb-4 ${isVisible ? 'visible' : ''}`}>
          <div className="relative" style={{ minWidth: '900px' }}>
            {/* Track line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20 -translate-y-1/2">
              <div className="timeline-track h-full bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />
            </div>

            {/* Version nodes */}
            <div className="relative flex justify-between items-center" style={{ height: '200px' }}>
              {VERSIONS.map((v, i) => {
                const isAbove = i % 2 === 0;
                const isCurrent = i === lastIndex;

                return (
                  <div
                    key={v.version}
                    className="relative flex flex-col items-center group"
                    style={{ flex: '1 1 0%' }}
                  >
                    {/* Label above */}
                    {isAbove && (
                      <div className="absolute bottom-[calc(50%+16px)] flex flex-col items-center text-center">
                        <span className="font-bold text-emerald-400 text-sm">{v.version}</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{v.theme}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {v.highlight}
                        </span>
                      </div>
                    )}

                    {/* Dot */}
                    <div className="relative z-10">
                      {isCurrent ? (
                        /* Current version: larger dot with pulse ring */
                        <div className="relative">
                          <div className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                          <div
                            className="absolute inset-0 w-4 h-4 rounded-full bg-emerald-400/40"
                            style={{
                              animation: 'pulse-ring 2s ease-out infinite',
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
                      )}
                    </div>

                    {/* Label below */}
                    {!isAbove && (
                      <div className="absolute top-[calc(50%+16px)] flex flex-col items-center text-center">
                        <span className="font-bold text-emerald-400 text-sm">{v.version}</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{v.theme}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {v.highlight}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
