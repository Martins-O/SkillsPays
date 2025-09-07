import { useState, useEffect } from 'react';

interface UseProgressOptions {
  steps: string[];
  autoAdvance?: boolean;
  interval?: number;
}

export function useProgress({ steps, autoAdvance = false, interval = 3000 }: UseProgressOptions) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (autoAdvance && steps.length > 1) {
      const timer = setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % steps.length;
          setProgress(((nextStep + 1) / steps.length) * 100);
          return nextStep;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [autoAdvance, interval, steps.length]);

  useEffect(() => {
    setProgress(((currentStep + 1) / steps.length) * 100);
  }, [currentStep, steps.length]);

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return {
    currentStep,
    progress,
    goToStep,
    nextStep,
    prevStep,
    isFirst: currentStep === 0,
    isLast: currentStep === steps.length - 1,
    totalSteps: steps.length
  };
}