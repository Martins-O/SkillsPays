import { useProgress } from '@/hooks/useProgress';

interface ProgressIndicatorProps {
  steps: string[];
  currentStep?: number;
  showLabels?: boolean;
  autoAdvance?: boolean;
  interval?: number;
  className?: string;
}

export function ProgressIndicator({
  steps,
  currentStep,
  showLabels = false,
  autoAdvance = false,
  interval = 3000,
  className = ''
}: ProgressIndicatorProps) {
  const progressState = useProgress({ steps, autoAdvance, interval });
  const activeStep = currentStep !== undefined ? currentStep : progressState.currentStep;
  const progressPercent = currentStep !== undefined 
    ? ((currentStep + 1) / steps.length) * 100 
    : progressState.progress;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Steps */}
      <div className="progress-steps">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`progress-step ${
              index <= activeStep ? (index === activeStep ? 'active' : 'completed') : ''
            }`}
          >
            {index < activeStep ? '✓' : index + 1}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="progress-bar h-2 mb-4">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Labels */}
      {showLabels && (
        <div className="flex justify-between text-sm text-gray-600">
          {steps.map((step, index) => (
            <span 
              key={index}
              className={`${
                index <= activeStep ? 'text-blue-600 font-semibold' : ''
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}