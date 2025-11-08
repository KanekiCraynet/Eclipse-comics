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
      setIsLoading(true); // Set loading state when starting to load
      return;
    }

    // Create intersection observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Image is in viewport, start loading
            setImageSrc(normalizedSrc);
            setIsLoading(true); // Set loading state when starting to load
            const elementToUnobserve = containerRef.current || imgRef.current;
            if (observerRef.current && elementToUnobserve) {
              observerRef.current.unobserve(elementToUnobserve);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before image enters viewport (increased for better UX)
        threshold: 0.01,
      }
    );

    // Observe the container element (works for both picture and img)
    const elementToObserve = containerRef.current || imgRef.current;
    
    if (elementToObserve) {
      observerRef.current.observe(elementToObserve);
    } else {
      // If element is not available yet, load immediately as fallback
      // This can happen if the component mounts before the DOM is ready
      setImageSrc(normalizedSrc);
      setIsLoading(true);
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

  // Handle image error with retry logic
  const handleError = (e) => {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === 'development') {
      console.error('[LazyImage] Image error:', {
        src: e.target.src,
        alt: alt,
        currentSrc: e.target.currentSrc,
        naturalWidth: e.target.naturalWidth,
        naturalHeight: e.target.naturalHeight,
      });
    }
    
    // If current src is the normalized src (first attempt), try loading again with a slight delay
    if (imageSrc === normalizedSrc && imageSrc !== fallback) {
      // eslint-disable-next-line no-undef
      if (process.env.NODE_ENV === 'development') {
        console.log('[LazyImage] Retrying image load after 500ms...');
      }
      // Give a small delay before retrying (helps with temporary network issues)
      setTimeout(() => {
        setImageSrc(normalizedSrc);
      }, 500);
      return;
    }
    
    // If retry failed or current src is not the normalized src, use fallback
    if (imageSrc !== fallback) {
      // eslint-disable-next-line no-undef
      if (process.env.NODE_ENV === 'development') {
        console.log('[LazyImage] Using fallback image');
      }
      setImageSrc(fallback);
      setHasError(true);
      setIsLoading(false);
    } else {
      // Already using fallback, mark as error
      setHasError(true);
      setIsLoading(false);
      if (onError) {
        onError(e);
      }
    }
  };

  // If loading is 'eager', load immediately
  useEffect(() => {
    if (loading === 'eager') {
      setImageSrc(normalizedSrc);
      setIsLoading(true); // Set loading state when starting to load
    }
  }, [loading, normalizedSrc]);

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
            onLoad={handleLoad}
            onError={handleError}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
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
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
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

