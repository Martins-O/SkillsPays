import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-900 text-neutral-50 hover:bg-neutral-800',
        secondary: 'border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
        destructive: 'border-transparent bg-danger-500 text-neutral-50 hover:bg-danger-600',
        success: 'border-transparent bg-secondary-500 text-neutral-50 hover:bg-secondary-600',
        warning: 'border-transparent bg-warning-500 text-neutral-50 hover:bg-warning-600',
        outline: 'border-neutral-200 text-neutral-950 hover:bg-neutral-100',
        primary: 'border-transparent bg-primary-500 text-neutral-50 hover:bg-primary-600',
        // Blockchain specific variants
        pending: 'border-transparent bg-warning-100 text-warning-800 animate-pulse',
        confirmed: 'border-transparent bg-secondary-100 text-secondary-800',
        failed: 'border-transparent bg-danger-100 text-danger-800',
        // Status variants
        active: 'border-transparent bg-secondary-100 text-secondary-800',
        inactive: 'border-transparent bg-neutral-100 text-neutral-600',
        completed: 'border-transparent bg-secondary-500 text-white',
        enrolled: 'border-transparent bg-primary-100 text-primary-800',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  pulse?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, icon, pulse = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

// Predefined badge components for common use cases
const StatusBadge = ({ status, ...props }: { status: 'active' | 'inactive' | 'pending' | 'completed' | 'failed' } & Omit<BadgeProps, 'variant'>) => (
  <Badge variant={status} {...props} />
);

const TransactionBadge = ({ status, ...props }: { status: 'pending' | 'confirmed' | 'failed' } & Omit<BadgeProps, 'variant'>) => (
  <Badge variant={status} {...props} />
);

export { Badge, badgeVariants, StatusBadge, TransactionBadge };