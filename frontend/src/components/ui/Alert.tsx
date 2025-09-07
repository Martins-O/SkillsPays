import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-neutral-50 text-neutral-900 border-neutral-200',
        success: 'bg-secondary-50 text-secondary-900 border-secondary-200',
        warning: 'bg-warning-50 text-warning-900 border-warning-200',
        error: 'bg-danger-50 text-danger-900 border-danger-200',
        info: 'bg-primary-50 text-primary-900 border-primary-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const iconMap = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
  default: InformationCircleIcon,
};

const iconColorMap = {
  success: 'text-secondary-600',
  warning: 'text-warning-600',
  error: 'text-danger-600',
  info: 'text-primary-600',
  default: 'text-neutral-600',
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ 
    className, 
    variant = 'default', 
    title, 
    showIcon = true,
    dismissible = false,
    onDismiss,
    children, 
    ...props 
  }, ref) => {
    const Icon = iconMap[variant || 'default'];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start">
          {showIcon && (
            <Icon className={cn('h-5 w-5 flex-shrink-0 mr-3 mt-0.5', iconColorMap[variant || 'default'])} />
          )}
          <div className="flex-1">
            {title && (
              <h5 className="mb-1 font-medium leading-none tracking-tight">
                {title}
              </h5>
            )}
            <div className={cn('text-sm', title && 'opacity-90')}>
              {children}
            </div>
          </div>
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className={cn(
                'ml-3 flex-shrink-0 rounded-md p-1 hover:bg-black/10 transition-colors',
                iconColorMap[variant || 'default']
              )}
              aria-label="Dismiss alert"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// Specialized alert components
const SuccessAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="success" {...props} />
);

const ErrorAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="error" {...props} />
);

const WarningAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="warning" {...props} />
);

const InfoAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="info" {...props} />
);

SuccessAlert.displayName = 'SuccessAlert';
ErrorAlert.displayName = 'ErrorAlert';
WarningAlert.displayName = 'WarningAlert';
InfoAlert.displayName = 'InfoAlert';

export { 
  Alert, 
  alertVariants, 
  SuccessAlert, 
  ErrorAlert, 
  WarningAlert, 
  InfoAlert 
};