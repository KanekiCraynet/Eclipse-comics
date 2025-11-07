import { useState, useEffect, useCallback, useRef } from 'react';
import { getJSONItem, setJSONItem } from '@/utils/storageHelpers';

/**
 * Hook for tracking reading progress
 * Tracks scroll position and saves last read position
 */
export const useReadingProgress = (chapterEndpoint, komikEndpoint) => {
  const [progress, setProgress] = useState(0);
  const [lastReadPosition, setLastReadPosition] = useState(0);
  const scrollTimeoutRef = useRef(null);

  // Load saved progress
  useEffect(() => {
    try {
      const savedProgress = getJSONItem(`reading_progress_${chapterEndpoint}`, null);
      if (savedProgress) {
        setProgress(savedProgress.progress || 0);
        setLastReadPosition(savedProgress.position || 0);
      }
    } catch (error) {
      console.error('Error loading reading progress:', error);
    }
  }, [chapterEndpoint]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // Calculate progress percentage
      const scrollableHeight = documentHeight - windowHeight;
      const currentProgress = scrollableHeight > 0 
        ? Math.min(100, Math.round((scrollTop / scrollableHeight) * 100))
        : 0;

      setProgress(currentProgress);
      setLastReadPosition(scrollTop);

      // Save progress to localStorage
      try {
        setJSONItem(`reading_progress_${chapterEndpoint}`, {
          progress: currentProgress,
          position: scrollTop,
          timestamp: Date.now(),
        });

        // Also save to komik-level progress
        const komikProgress = getJSONItem(`komik_progress_${komikEndpoint}`, {});
        komikProgress[chapterEndpoint] = {
          progress: currentProgress,
          position: scrollTop,
          timestamp: Date.now(),
        };
        setJSONItem(`komik_progress_${komikEndpoint}`, komikProgress);
      } catch (error) {
        console.error('Error saving reading progress:', error);
      }
    }, 500); // Debounce scroll tracking
  }, [chapterEndpoint, komikEndpoint]);

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Resume reading from last position
  const resumeReading = useCallback(() => {
    if (lastReadPosition > 0) {
      window.scrollTo({
        top: lastReadPosition,
        behavior: 'smooth',
      });
    }
  }, [lastReadPosition]);

  // Get progress for a specific chapter
  const getChapterProgress = useCallback((endpoint) => {
    try {
      const saved = getJSONItem(`reading_progress_${endpoint}`, null);
      return saved ? saved.progress : 0;
    } catch (error) {
      console.error('Error getting chapter progress:', error);
      return 0;
    }
  }, []);

  // Get all progress for a komik
  const getKomikProgress = useCallback((endpoint) => {
    try {
      return getJSONItem(`komik_progress_${endpoint}`, {});
    } catch (error) {
      console.error('Error getting komik progress:', error);
      return {};
    }
  }, []);

  return {
    progress,
    lastReadPosition,
    resumeReading,
    getChapterProgress,
    getKomikProgress,
  };
};

export default useReadingProgress;

