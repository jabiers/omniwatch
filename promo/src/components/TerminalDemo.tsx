import { useTypingAnimation } from '../hooks/useTypingAnimation';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { TERMINAL_STEPS } from '../lib/constants';

/** Strip ANSI escape codes from a string */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export default function TerminalDemo() {
  const { ref, isVisible } = useIntersectionObserver(0.15);
  const { displayedCommand, displayedOutput, cursorVisible } = useTypingAnimation(
    TERMINAL_STEPS,
    isVisible,
  );

  return (
    <section id="terminal" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient">See It In Action</h2>
        </div>

        {/* Terminal window */}
        <div ref={ref} className="glass-card overflow-hidden glow">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-3 text-xs text-gray-500 font-mono">omniwatch</span>
          </div>

          {/* Terminal content */}
          <div className="bg-[#0d0d12] p-5 sm:p-6 font-mono text-sm sm:text-base min-h-[280px]">
            {/* Prompt + typed command */}
            <div className="flex items-start gap-0">
              <span className="text-emerald-400 select-none">$&nbsp;</span>
              <span className="text-white">{displayedCommand}</span>
              {cursorVisible && <span className="cursor-blink text-emerald-400 ml-0.5">|</span>}
            </div>

            {/* Output lines */}
            {displayedOutput.length > 0 && (
              <div className="mt-3 space-y-1">
                {displayedOutput.map((line, i) => (
                  <div key={i} className="text-gray-400">
                    {stripAnsi(line)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
