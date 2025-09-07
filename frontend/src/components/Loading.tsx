'use client';

import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
};

export function Loading({ message = 'Loading...', size = 'lg', className = '' }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]} mb-4`} />
      <p className="text-gray-600 text-center">{message}</p>
    </div>
  );
}

export function LoadingSpinner({ size = 'md', className = '' }: Pick<LoadingProps, 'size' | 'className'>) {
  return (
    <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingOverlay({ message = 'Loading...', show = true }: { message?: string; show?: boolean }) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
        <Loading message={message} size="lg" />
      </div>
    </div>
  );
}