import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

/** Architecture node with glass-card styling */
function Node({
  icon,
  label,
  subtitle,
  className = '',
  large = false,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: React.ReactNode;
  className?: string;
  large?: boolean;
}) {
  return (
    <div
      className={`glass-card flex items-center gap-3 ${large ? 'px-6 py-4' : 'px-4 py-3'} ${className}`}
    >
      <span className={large ? 'text-2xl' : 'text-lg'}>{icon}</span>
      <div>
        <div className={`font-semibold text-white ${large ? 'text-lg' : 'text-sm'}`}>{label}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
    </div>
  );
}

/** SVG arrow pointing downward */
function ArrowDown() {
  return (
    <div className="flex justify-center py-2 text-emerald-500/60">
      <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
        <path
          d="M12 0 L12 24 M6 18 L12 24 L18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 3"
        />
      </svg>
    </div>
  );
}

/** SVG arrow pointing right */
function ArrowRight() {
  return (
    <div className="flex items-center px-2 text-emerald-500/60">
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        <path
          d="M0 12 L24 12 M18 6 L24 12 L18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 3"
        />
      </svg>
    </div>
  );
}

export default function Architecture() {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="architecture" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">Architecture</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Enterprise-grade infrastructure from CLI to cloud
          </p>
        </div>

        {/* Diagram */}
        <div ref={ref} className={`reveal ${isVisible ? 'visible' : ''}`}>
          {/* Desktop layout */}
          <div className="hidden md:block">
            {/* Top row: CLI + Web */}
            <div className="flex justify-center gap-8">
              <Node icon={'\u25b8'} label="Terminal / CLI" className="float" />
              <Node icon={'\u25a1'} label="Web Dashboard" className="float float-delay-1" />
            </div>

            {/* Arrows down to daemon */}
            <div className="flex justify-center gap-16">
              <ArrowDown />
              <ArrowDown />
            </div>

            {/* Middle row: Daemon + Agents */}
            <div className="flex justify-center items-center gap-4">
              <Node
                icon={'\u25c9'}
                label="Daemon"
                subtitle="Event bus + Runtime"
                large
                className="float float-delay-2"
              />
              <ArrowRight />
              <div className="flex flex-col gap-2">
                <Node
                  icon={'\u25c7'}
                  label="Agent A"
                  subtitle={<>{'🔒'} sandboxed</>}
                  className="float"
                />
                <Node
                  icon={'\u25c7'}
                  label="Agent B"
                  subtitle={<>{'🔒'} sandboxed</>}
                  className="float float-delay-1"
                />
                <Node
                  icon={'\u25c7'}
                  label="Agent N"
                  subtitle={<>{'🔒'} sandboxed</>}
                  className="float float-delay-2"
                />
              </div>
            </div>

            {/* Arrow down to SQLite */}
            <ArrowDown />

            {/* Bottom: SQLite */}
            <div className="flex justify-center">
              <Node
                icon={'\u2630'}
                label="SQLite DB"
                subtitle={<>18 tables &bull; WAL mode</>}
                className="float float-delay-3"
              />
            </div>
          </div>

          {/* Mobile layout: vertical flowchart */}
          <div className="md:hidden flex flex-col items-center">
            <Node icon={'\u25b8'} label="Terminal / CLI" className="float" />
            <ArrowDown />
            <Node icon={'\u25a1'} label="Web Dashboard" className="float float-delay-1" />
            <ArrowDown />
            <Node
              icon={'\u25c9'}
              label="Daemon"
              subtitle="Event bus + Runtime"
              large
              className="float float-delay-2"
            />
            <ArrowDown />
            <div className="flex flex-col gap-2 items-center">
              <Node
                icon={'\u25c7'}
                label="Agent A"
                subtitle={<>{'🔒'} sandboxed</>}
                className="float"
              />
              <Node
                icon={'\u25c7'}
                label="Agent B"
                subtitle={<>{'🔒'} sandboxed</>}
                className="float float-delay-1"
              />
              <Node
                icon={'\u25c7'}
                label="Agent N"
                subtitle={<>{'🔒'} sandboxed</>}
                className="float float-delay-2"
              />
            </div>
            <ArrowDown />
            <Node
              icon={'\u2630'}
              label="SQLite DB"
              subtitle={<>18 tables &bull; WAL mode</>}
              className="float float-delay-3"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
