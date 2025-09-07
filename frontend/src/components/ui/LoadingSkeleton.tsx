'use client';

import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
  height?: 'sm' | 'md' | 'lg' | 'xl';
  width?: 'full' | 'half' | 'quarter' | 'third';
  shape?: 'rect' | 'circle';
  animate?: boolean;
}

const heightClasses = {
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-8',
  xl: 'h-12'
};

const widthClasses = {
  full: 'w-full',
  half: 'w-1/2',
  quarter: 'w-1/4',
  third: 'w-1/3'
};

export function LoadingSkeleton({
  className = '',
  lines = 1,
  height = 'md',
  width = 'full',
  shape = 'rect',
  animate = true
}: LoadingSkeletonProps) {
  const baseClasses = `
    bg-gray-300 
    ${animate ? 'animate-pulse' : ''}
    ${shape === 'circle' ? 'rounded-full' : 'rounded'}
    ${heightClasses[height]}
    ${widthClasses[width]}
    ${className}
  `.trim();

  if (lines === 1) {
    return <div className={baseClasses} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`${baseClasses} ${i === lines - 1 ? 'w-3/4' : ''}`}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <LoadingSkeleton shape="circle" height="xl" width="quarter" animate={false} />
        <div className="flex-1">
          <LoadingSkeleton height="lg" width="half" animate={false} />
          <LoadingSkeleton height="sm" width="third" className="mt-2" animate={false} />
        </div>
      </div>
      <LoadingSkeleton lines={3} height="sm" animate={false} />
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
        <LoadingSkeleton height="sm" width="quarter" animate={false} />
        <LoadingSkeleton height="sm" width="third" animate={false} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 pb-4 mb-4 border-b border-gray-200">
        {Array.from({ length: columns }, (_, i) => (
          <LoadingSkeleton key={i} height="sm" width="full" animate={false} />
        ))}
      </div>
      
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }, (_, colIndex) => (
              <LoadingSkeleton 
                key={colIndex} 
                height="sm" 
                width="full" 
                animate={false}
                className={colIndex === 0 ? 'w-1/4' : ''}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
          <LoadingSkeleton shape="circle" height="xl" width="quarter" animate={false} />
          <div className="flex-1">
            <LoadingSkeleton height="md" width="half" animate={false} />
            <LoadingSkeleton height="sm" width="third" className="mt-2" animate={false} />
          </div>
          <LoadingSkeleton height="sm" width="quarter" animate={false} />
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;