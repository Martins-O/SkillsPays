import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

interface AnimatedCounterProps {
  end: number;
  start?: number;
  duration?: number;
  decimal?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  enableInView?: boolean;
}

export function AnimatedCounter({
  end,
  start = 0,
  duration = 2000,
  decimal = 0,
  suffix = '',
  prefix = '',
  className = '',
  enableInView = true
}: AnimatedCounterProps) {
  const { current, elementRef } = useAnimatedCounter({
    start,
    end,
    duration,
    decimal,
    enableInView
  });

  return (
    <span ref={elementRef} className={`counter ${className}`}>
      {prefix}{current.toLocaleString()}{suffix}
    </span>
  );
}