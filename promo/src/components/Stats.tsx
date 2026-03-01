import { useEffect, useRef, useState } from 'react';
import { STATS } from '../lib/constants';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

/** Animated counter that counts from 0 to target using easeOutQuart easing */
function AnimatedCounter({
  target,
  suffix,
  label,
  animate,
}: {
  target: number;
  suffix: string;
  label: string;
  animate: boolean;
}) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!animate) return;

    const duration = 1500; // 1.5s
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // easeOutQuart: 1 - (1 - t)^4
      const eased = 1 - Math.pow(1 - t, 4);
      setCount(Math.round(eased * target));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate, target]);

  return (
    <div className="text-center">
      <div>
        <span className="text-4xl sm:text-5xl font-extrabold text-gradient">{count}</span>
        {suffix && (
          <span className="text-4xl sm:text-5xl font-extrabold text-gradient">{suffix}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-2">{label}</p>
    </div>
  );
}

export default function Stats() {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div ref={ref} className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          {STATS.map((stat) => (
            <AnimatedCounter
              key={stat.label}
              target={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              animate={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
