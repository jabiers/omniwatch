import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface Step {
  number: number;
  title: string;
  description: string;
  code: string;
  multiline?: boolean;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Install',
    description: 'Install Vigil globally with npm',
    code: 'npm install -g vigil',
  },
  {
    number: 2,
    title: 'Start the Daemon',
    description: 'Launch the background daemon that manages all your agents',
    code: 'vigil daemon start',
  },
  {
    number: 3,
    title: 'Create Your First Agent',
    description: 'Describe what you want in plain English — AI does the rest',
    code: `$ vigil watch "Monitor my portfolio API and alert me on anomalies"

✓ Analyzing prompt...
✓ Agent type: watcher (auto-detected)
✓ Generated 42 lines of monitoring code
✓ AST security validation: passed
✓ Agent [portfolio-monitor] deployed and running`,
    multiline: true,
  },
];

export default function GettingStarted() {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="quickstart" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">
            Up and Running in 3 Steps
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            From zero to autonomous monitoring in under a minute
          </p>
        </div>

        {/* Steps */}
        <div ref={ref} className={`stagger ${isVisible ? 'visible' : ''}`}>
          {STEPS.map((step, idx) => (
            <div key={step.number} className="relative flex gap-6">
              {/* Step number + vertical line */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-lg flex items-center justify-center">
                  {step.number}
                </div>
                {/* Dashed line between steps */}
                {idx < STEPS.length - 1 && (
                  <div className="w-px flex-1 border-l border-dashed border-emerald-500/30 my-2" />
                )}
              </div>

              {/* Step content */}
              <div className="pb-12 flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-gray-400 mb-4">{step.description}</p>
                <div className="glass-card overflow-hidden">
                  <div className="bg-[#0d0d12] p-4">
                    <pre className="text-sm font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                      {step.multiline ? step.code : `$ ${step.code}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
