import { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { safeImageUrl } from '../../utils/apiHelpers';

/**
 * LazyImage component for progressive image loading
 */
const LazyImage = ({
  src,
  alt = '',
  className = '',
  fallback = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AD//2Q==',
  placeholder = null,
  onLoad,
  onError,
  loading = 'lazy',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder || fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Validate and normalize image URL
  const normalizedSrc = safeImageUrl(src, fallback);

  useEffect(() => {
    // If no IntersectionObserver support, load immediately
    if (!window.IntersectionObserver) {
      setImageSrc(normalizedSrc);
      return;
    }

    // Create intersection observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Image is in viewport, start loading
            setImageSrc(normalizedSrc);
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    );

    // Observe the image element
    const currentImgRef = imgRef.current;
    if (currentImgRef) {
      observerRef.current.observe(currentImgRef);
    }

    // Cleanup
    return () => {
      if (observerRef.current && currentImgRef) {
        observerRef.current.unobserve(currentImgRef);
      }
    };
  }, [normalizedSrc]);

  // Handle image load
  const handleLoad = (e) => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  // Handle image error
  const handleError = (e) => {
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback if current src is not already fallback
    if (imageSrc !== fallback) {
      setImageSrc(fallback);
    } else if (onError) {
      onError(e);
    }
  };

  // If loading is 'eager', load immediately
  useEffect(() => {
    if (loading === 'eager') {
      setImageSrc(normalizedSrc);
    }
  }, [loading, normalizedSrc]);

  return (
    <div className={`relative ${className}`} {...props}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${hasError ? 'opacity-50' : ''}`}
        style={{
          width: '100%',
          height: 'auto',
        }}
      />
      {isLoading && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="animate-pulse bg-gray-700 w-full h-full" />
        </div>
      )}
    </div>
  );
};

/**
 * ImagePlaceholder component for loading state
 */
export const ImagePlaceholder = ({ width = '100%', height = '200px', className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-gray-700 ${className}`}
      style={{ width, height }}
    />
  );
};

LazyImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  fallback: PropTypes.string,
  placeholder: PropTypes.string,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
  loading: PropTypes.oneOf(['lazy', 'eager']),
};

ImagePlaceholder.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
};

export default memo(LazyImage);

