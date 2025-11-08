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

  // Handle image load
  const handleLoad = (e) => {
    setIsLoading(false);
    setHasError(false);
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') {
      console.log('[LazyImage] Image loaded:', {
        src: e.target.src,
        alt: alt,
      });
    }
    if (onLoad) {
      onLoad(e);
    }
  };

  // Handle image error
  const handleError = (e) => {
    setIsLoading(false);
    setHasError(true);
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') {
      console.error('[LazyImage] Image error:', {
        src: e.target.src,
        alt: alt,
        currentSrc: e.target.currentSrc,
      });
    }
    
    // Try fallback if current src is not already fallback
    if (imageSrc !== fallback && imageSrc !== normalizedSrc) {
      setImageSrc(fallback);
      setIsLoading(true); // Reset loading state for fallback
    } else if (onError) {
      onError(e);
    }
  };

  // Main effect: Handle lazy loading with IntersectionObserver and fallbacks
  useEffect(() => {
    // If loading is eager, load immediately and skip IntersectionObserver
    if (loading === 'eager') {
      setImageSrc(normalizedSrc);
      setIsLoading(true);
      return;
    }

    // If no IntersectionObserver support, load immediately with a small delay
    // This ensures images load even on older browsers
    if (!window.IntersectionObserver) {
      const timeoutId = setTimeout(() => {
        setImageSrc(normalizedSrc);
        setIsLoading(true);
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    let observer = null;
    let timeoutFallback = null;
    let elementCheckInterval = null;
    let isImageLoaded = false;

    const loadImage = () => {
      if (!isImageLoaded) {
        isImageLoaded = true;
        setImageSrc(normalizedSrc);
        setIsLoading(true);
        // Clear any pending timeouts/intervals
        if (timeoutFallback) {
          clearTimeout(timeoutFallback);
          timeoutFallback = null;
        }
        if (elementCheckInterval) {
          clearInterval(elementCheckInterval);
          elementCheckInterval = null;
        }
      }
    };

    try {
      // Create intersection observer for lazy loading
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isImageLoaded) {
              loadImage();
              // Unobserve after loading starts
              const elementToUnobserve = containerRef.current || imgRef.current;
              if (observer && elementToUnobserve) {
                try {
                  observer.unobserve(elementToUnobserve);
                } catch (e) {
                  // Ignore unobserve errors
                }
              }
            }
          });
        },
        {
          rootMargin: '100px', // Start loading 100px before image enters viewport
          threshold: 0.01,
        }
      );

      observerRef.current = observer;

      // Try to observe the container element
      const elementToObserve = containerRef.current || imgRef.current;
      
      if (elementToObserve) {
        observer.observe(elementToObserve);
      } else {
        // If element is not available yet, set up a retry mechanism
        elementCheckInterval = setInterval(() => {
          const element = containerRef.current || imgRef.current;
          if (element && observer && !isImageLoaded) {
            try {
              observer.observe(element);
              clearInterval(elementCheckInterval);
              elementCheckInterval = null;
            } catch (e) {
              // If observe fails, load immediately
              loadImage();
            }
          }
        }, 100);
        
        // Fallback: if element doesn't appear within 1 second, load immediately
        setTimeout(() => {
          if (elementCheckInterval) {
            clearInterval(elementCheckInterval);
            elementCheckInterval = null;
          }
          if (!isImageLoaded) {
            loadImage();
          }
        }, 1000);
      }

      // Safety fallback: if IntersectionObserver doesn't trigger within 3 seconds,
      // load the image anyway (handles cases where observer silently fails on some devices)
      timeoutFallback = setTimeout(() => {
        if (!isImageLoaded) {
          // eslint-disable-next-line no-undef
          if (process.env.NODE_ENV === 'development') {
            console.warn('[LazyImage] IntersectionObserver fallback triggered for:', normalizedSrc);
          }
          loadImage();
        }
      }, 3000);

    } catch (error) {
      // If IntersectionObserver creation fails, fall back to immediate loading
      console.error('[LazyImage] IntersectionObserver error, loading immediately:', error);
      loadImage();
    }

    // Cleanup
    return () => {
      if (timeoutFallback) {
        clearTimeout(timeoutFallback);
      }
      if (elementCheckInterval) {
        clearInterval(elementCheckInterval);
      }
      if (observer) {
        try {
          const elementToUnobserve = containerRef.current || imgRef.current;
          if (elementToUnobserve) {
            observer.unobserve(elementToUnobserve);
          }
          observer.disconnect();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [normalizedSrc, loading]);

  // Fallback: If imageSrc is set but isLoading is still false after a delay, 
  // check if image is actually loaded
  useEffect(() => {
    if (imageSrc && imageSrc !== fallback && !isLoading && imgRef.current) {
      // Check if image is already loaded (cached images might load before onLoad fires)
      if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
        setIsLoading(false);
        setHasError(false);
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === 'development') {
          console.log('[LazyImage] Image already loaded (cached):', {
            src: imageSrc,
            alt: alt,
          });
        }
      }
    }
  }, [imageSrc, isLoading, fallback, alt]);

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
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={`transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            } ${hasError ? 'opacity-50' : ''}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
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
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${hasError ? 'opacity-50' : ''}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
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

