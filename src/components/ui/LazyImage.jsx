import { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { safeImageUrl, generateWebPUrl, generateBlurPlaceholder, checkWebPSupport } from '../../utils/apiHelpers';

/**
 * LazyImage component for progressive image loading with WebP support and picture element
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
  usePicture = true,
  useWebP = true,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder || fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webPSupported, setWebPSupported] = useState(false);
  const [blurPlaceholder, setBlurPlaceholder] = useState(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);

  // Validate and normalize image URL
  const normalizedSrc = safeImageUrl(src, fallback);
  const webPUrl = useWebP && normalizedSrc ? generateWebPUrl(normalizedSrc) : null;

  // Check WebP support on mount
  useEffect(() => {
    if (useWebP && webPUrl) {
      checkWebPSupport().then(setWebPSupported);
    }
  }, [useWebP, webPUrl]);

  // Generate blur placeholder
  useEffect(() => {
    if (normalizedSrc && normalizedSrc !== fallback && !placeholder) {
      try {
        const blur = generateBlurPlaceholder(normalizedSrc);
        setBlurPlaceholder(blur);
      } catch (error) {
        console.error('[LazyImage] Error generating blur placeholder:', error);
      }
    }
  }, [normalizedSrc, fallback, placeholder]);

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
            const elementToUnobserve = containerRef.current || imgRef.current;
            if (observerRef.current && elementToUnobserve) {
              observerRef.current.unobserve(elementToUnobserve);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    );

    // Observe the container element (works for both picture and img)
    const elementToObserve = containerRef.current || imgRef.current;
    
    if (elementToObserve) {
      observerRef.current.observe(elementToObserve);
    }

    // Cleanup
    return () => {
      if (observerRef.current && elementToObserve) {
        observerRef.current.unobserve(elementToObserve);
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

  // Determine which placeholder to use
  const displayPlaceholder = placeholder || blurPlaceholder || fallback;

  // Render with picture element if WebP is supported and usePicture is true
  if (usePicture && webPSupported && webPUrl && normalizedSrc !== fallback) {
    return (
      <div ref={containerRef} className={`relative ${className}`} {...props}>
        <picture>
          {/* WebP source for modern browsers */}
          <source srcSet={webPUrl} type="image/webp" />
          {/* Fallback to original format */}
          <source srcSet={normalizedSrc} type="image/jpeg" />
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
        </picture>
        {/* Placeholder overlay with blur effect */}
        {isLoading && displayPlaceholder && displayPlaceholder !== fallback && (
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{
              backgroundImage: `url(${displayPlaceholder})`,
              filter: 'blur(10px)',
              transform: 'scale(1.1)',
              opacity: 0.8,
            }}
          />
        )}
        {/* Loading skeleton */}
        {isLoading && (!displayPlaceholder || displayPlaceholder === fallback) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 pointer-events-none">
            <div className="animate-pulse bg-gray-700 w-full h-full" />
          </div>
        )}
      </div>
    );
  }

  // Fallback to regular img element
  return (
    <div ref={containerRef} className={`relative ${className}`} {...props}>
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
      {/* Placeholder overlay with blur effect */}
      {isLoading && displayPlaceholder && displayPlaceholder !== fallback && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${displayPlaceholder})`,
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
            opacity: 0.8,
          }}
        />
      )}
      {/* Loading skeleton fallback */}
      {isLoading && (!displayPlaceholder || displayPlaceholder === fallback) && (
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
  usePicture: PropTypes.bool,
  useWebP: PropTypes.bool,
};

ImagePlaceholder.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
};

export default memo(LazyImage);

