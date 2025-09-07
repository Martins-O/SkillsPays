import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    variant = 'default',
    inputSize = 'md',
    leftIcon,
    rightIcon,
    label,
    helperText,
    errorText,
    required,
    disabled,
    ...props
  }, ref) => {
    const hasError = variant === 'error' || !!errorText;
    const hasSuccess = variant === 'success';

    const baseClasses = 'flex w-full rounded-lg border border-neutral-300 bg-white text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    
    const variantClasses = {
      default: 'border-neutral-300 focus-visible:border-primary-500 focus-visible:ring-primary-500',
      error: 'border-danger-500 focus-visible:border-danger-500 focus-visible:ring-danger-500',
      success: 'border-secondary-500 focus-visible:border-secondary-500 focus-visible:ring-secondary-500',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 py-1',
      md: 'h-10 px-3 py-2',
      lg: 'h-12 px-4 py-3',
    };

    const inputElement = (
      <div className="relative flex w-full items-center">
        {leftIcon && (
          <div className="absolute left-3 z-10 text-neutral-500">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            baseClasses,
            variantClasses[hasError ? 'error' : hasSuccess ? 'success' : 'default'],
            sizeClasses[inputSize],
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            hasError && errorText
              ? `${props.id || 'input'}-error`
              : helperText
              ? `${props.id || 'input'}-help`
              : undefined
          }
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 z-10 text-neutral-500">
            {rightIcon}
          </div>
        )}
      </div>
    );

    if (label || helperText || errorText) {
      return (
        <div className="space-y-2">
          {label && (
            <label
              htmlFor={props.id}
              className="block text-sm font-medium text-neutral-700"
            >
              {label}
              {required && <span className="ml-1 text-danger-500">*</span>}
            </label>
          )}
          {inputElement}
          {(helperText || errorText) && (
            <p
              id={
                hasError && errorText
                  ? `${props.id || 'input'}-error`
                  : `${props.id || 'input'}-help`
              }
              className={cn(
                'text-xs',
                hasError ? 'text-danger-600' : 'text-neutral-500'
              )}
            >
              {hasError ? errorText : helperText}
            </p>
          )}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';

export { Input };