import { useCallback, useRef, useState } from 'react';

export function useIntersectionObserver(threshold = 0.15) {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold, rootMargin: '0px 0px -40px 0px' },
      );
      observerRef.current.observe(node);
    },
    [threshold],
  );

  return { ref, isVisible };
}
