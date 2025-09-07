import { useState, useEffect, useRef } from 'react';

interface UseAnimatedCounterOptions {
  start?: number;
  end: number;
  duration?: number;
  enableInView?: boolean;
  decimal?: number;
}

export function useAnimatedCounter({
  start = 0,
  end,
  duration = 2000,
  enableInView = true,
  decimal = 0
}: UseAnimatedCounterOptions) {
  const [current, setCurrent] = useState(start);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const startAnimation = () => {
    if (hasAnimated) return;
    setHasAnimated(true);

    const startTime = Date.now();
    const startValue = start;
    const endValue = end;
    const totalChange = endValue - startValue;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (totalChange * easeOutCubic);

      setCurrent(decimal > 0 ? Number(currentValue.toFixed(decimal)) : Math.floor(currentValue));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!enableInView) {
      startAnimation();
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            startAnimation();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [end, duration, enableInView, hasAnimated]);

  return { current, elementRef };
}