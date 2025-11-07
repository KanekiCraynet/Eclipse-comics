import { memo } from 'react';

/**
 * Reusable LoadingSkeleton component for consistent loading states
 */
const LoadingSkeleton = ({ 
  variant = 'default',
  width,
  height,
  className = '',
  count = 1,
  rounded = false,
}) => {
  const baseClasses = 'animate-pulse bg-gray-700';
  const roundedClass = rounded ? 'rounded-lg' : '';
  
  const variants = {
    default: `${baseClasses} ${roundedClass}`,
    card: `${baseClasses} rounded-lg`,
    text: `${baseClasses} rounded`,
    image: `${baseClasses} rounded-lg`,
    circle: `${baseClasses} rounded-full`,
  };

  const skeletonClass = variants[variant] || variants.default;
  const style = {
    width: width || (variant === 'circle' ? height : '100%'),
    height: height || (variant === 'text' ? '1rem' : variant === 'circle' ? width : 'auto'),
  };

  if (count > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={skeletonClass}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${skeletonClass} ${className}`}
      style={style}
    />
  );
};

/**
 * KomikCardSkeleton - Skeleton for komik card
 */
export const KomikCardSkeleton = ({ count = 1, className = '' }) => {
  return (
    <div className={`flex gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex-shrink-0 w-[130px] md:w-[250px] h-[170px] rounded-lg overflow-hidden">
          <LoadingSkeleton variant="image" height="170px" />
        </div>
      ))}
    </div>
  );
};

/**
 * KomikGridSkeleton - Skeleton for komik grid
 */
export const KomikGridSkeleton = ({ count = 6, className = '' }) => {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="relative w-full h-[170px] rounded-sm overflow-hidden">
          <LoadingSkeleton variant="image" height="170px" />
        </div>
      ))}
    </div>
  );
};

/**
 * KomikDetailSkeleton - Skeleton for komik detail page
 */
export const KomikDetailSkeleton = ({ className = '' }) => {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header skeleton */}
      <div className="relative flex flex-col items-center justify-center gap-3 px-2 pt-10 pb-2">
        <LoadingSkeleton variant="image" width="120px" height="180px" rounded />
        <LoadingSkeleton variant="text" width="80%" height="2rem" />
      </div>
      
      {/* Info badges skeleton */}
      <div className="flex items-center gap-2 px-2">
        <LoadingSkeleton variant="card" width="100px" height="32px" />
        <LoadingSkeleton variant="card" width="100px" height="32px" />
        <LoadingSkeleton variant="card" width="80px" height="32px" />
      </div>
      
      {/* Description skeleton */}
      <div className="px-3 space-y-2">
        <LoadingSkeleton variant="text" width="100%" height="1rem" />
        <LoadingSkeleton variant="text" width="90%" height="1rem" />
        <LoadingSkeleton variant="text" width="95%" height="1rem" />
      </div>
      
      {/* Chapter list skeleton */}
      <div className="p-2">
        <LoadingSkeleton variant="text" width="150px" height="1.5rem" />
        <div className="mt-2 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingSkeleton key={index} variant="card" height="60px" />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * ChapterDetailSkeleton - Skeleton for chapter detail page
 */
export const ChapterDetailSkeleton = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {Array.from({ length: 3 }).map((_, index) => (
        <LoadingSkeleton key={index} variant="image" width="100%" height="400px" />
      ))}
    </div>
  );
};

export default memo(LoadingSkeleton);

