interface SkeletonLoaderProps {
  variant?: 'text' | 'avatar' | 'button' | 'card' | 'custom';
  width?: string;
  height?: string;
  className?: string;
  lines?: number;
}

export function SkeletonLoader({ 
  variant = 'text',
  width,
  height,
  className = '',
  lines = 3
}: SkeletonLoaderProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'avatar':
        return 'skeleton-avatar';
      case 'button':
        return 'skeleton-button';
      case 'card':
        return 'skeleton-card';
      case 'text':
        return 'skeleton-text';
      default:
        return '';
    }
  };

  const style = {
    ...(width && { width }),
    ...(height && { height })
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }, (_, i) => (
          <div 
            key={i}
            className={`skeleton skeleton-text ${i === lines - 1 ? 'w-4/5' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`skeleton ${getVariantClasses()} ${className}`}
      style={style}
    />
  );
}

// Skeleton components for common patterns
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center space-x-4 mb-4">
        <SkeletonLoader variant="avatar" />
        <div className="flex-1">
          <SkeletonLoader variant="text" className="w-3/4 mb-2" />
          <SkeletonLoader variant="text" className="w-1/2" />
        </div>
      </div>
      <SkeletonLoader variant="text" lines={3} />
      <div className="flex space-x-2 mt-4">
        <SkeletonLoader variant="button" className="flex-1" />
        <SkeletonLoader variant="button" className="flex-1" />
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="text-center">
          <SkeletonLoader variant="text" className="w-16 h-8 mx-auto mb-2" />
          <SkeletonLoader variant="text" className="w-20 h-4 mx-auto" />
        </div>
      ))}
    </div>
  );
}