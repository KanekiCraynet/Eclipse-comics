import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useKomikcastAPI } from "@/hooks/useKomikcastAPI";
import { komikcastAPI } from "@/services/api";
import { getJSONItem, setJSONItem } from "@/utils/storageHelpers";
import { safeStringTrim, safeImageUrl, safeEndpoint, normalizeError, ERROR_TYPES } from "@/utils/apiHelpers";
import { useToast } from "@/context/ToastContext";
import { useReadingPreferences, READING_MODES } from "@/hooks/useReadingPreferences";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import ReadingModeSelector from "@/components/ReadingModeSelector";
import { FaArrowLeft, FaMagnifyingGlassPlus, FaMagnifyingGlassMinus, FaExpand, FaCompress, FaPlay, FaPause } from "react-icons/fa6";
import { ChapterDetailSkeleton } from "@/components/ui/LoadingSkeleton";
import LazyImage from "@/components/ui/LazyImage";

const ChapterDetail = () => {
    const [showNavbar, setShowNavbar] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isAutoScroll, setIsAutoScroll] = useState(false);
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(50);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { chapter } = useParams();
    const navigate = useNavigate();
    const chapterContainerRef = useRef(null);
    const autoScrollIntervalRef = useRef(null);
    const { preferences, updatePreference } = useReadingPreferences();
    const { error: showErrorToast } = useToast();
    
    // Extract komik endpoint from chapter
    const komikEndpoint = chapter.split("-chapter")[0];
    const { progress, resumeReading } = useReadingProgress(chapter, komikEndpoint);

    // Fetch chapter data and komik detail in parallel using Promise.all
    const { data: chapterData, loading: chapterLoading, error: chapterError, refetch: refetchChapter } = useKomikcastAPI(
        () => komikcastAPI.readChapter(chapter),
        {
            cacheKey: `chapter_${chapter}`,
            cacheTTL: 60 * 60 * 1000, // 1 hour for chapters
            enableCache: true,
        }
    );

    const { data: komikData, loading: komikLoading, error: komikError } = useKomikcastAPI(
        () => komikcastAPI.getDetail(komikEndpoint),
        {
            cacheKey: `komik_detail_${komikEndpoint}`,
            cacheTTL: 30 * 60 * 1000, // 30 minutes
            enableCache: true,
        }
    );

    // Extract data from responses
    // Data is already extracted by useKomikcastAPI using extractApiData
    // Chapter response format: [{ title: "...", panel: [...] }] or { title: "...", panel: [...] }
    // Handle multiple possible data structures:
    // 1. Array: [{ title: "...", panel: [...] }]
    // 2. Object: { title: "...", panel: [...] }
    // 3. Array of arrays: [[{ title: "...", panel: [...] }]]
    // Memoized to prevent unnecessary recalculations and ensure stable reference
    const chapterResponse = useMemo(() => {
      if (!chapterData) return null;
      
      if (Array.isArray(chapterData)) {
        if (chapterData.length > 0) {
          // Check if first element is an object with panel/images
          if (typeof chapterData[0] === 'object' && chapterData[0] !== null) {
            return chapterData[0];
          } else if (Array.isArray(chapterData[0]) && chapterData[0].length > 0) {
            // Nested array case: [[{ title: "...", panel: [...] }]]
            return chapterData[0][0];
          } else {
            // Fallback: use first element as-is
            return chapterData[0];
          }
        }
      } else if (typeof chapterData === 'object' && chapterData !== null) {
        // Direct object format
        return chapterData;
      }
      
      return null;
    }, [chapterData]);
    
    const komikResponse = komikData;

    const loading = chapterLoading || komikLoading;
    const error = chapterError || komikError;

    // Show toast notification for errors
    useEffect(() => {
      if (error) {
        const normalizedError = normalizeError({ message: error });
        if (normalizedError.type === ERROR_TYPES.NOT_FOUND) {
          showErrorToast('Chapter tidak ditemukan. Silakan periksa URL atau coba chapter lain.');
        } else {
          showErrorToast(error);
        }
      }
    }, [error, showErrorToast]);

    // Debug logging (only in development)
    useEffect(() => {
      // eslint-disable-next-line no-undef
      if (process.env.NODE_ENV === 'development') {
        console.log('[ChapterDetail] Data extraction:', {
          hasChapterData: !!chapterData,
          chapterDataType: typeof chapterData,
          isArray: Array.isArray(chapterData),
          chapterDataLength: Array.isArray(chapterData) ? chapterData.length : 'N/A',
          chapterDataKeys: chapterData && typeof chapterData === 'object' && !Array.isArray(chapterData) ? Object.keys(chapterData) : 'N/A',
          hasChapterResponse: !!chapterResponse,
          chapterResponseType: typeof chapterResponse,
          chapterResponseKeys: chapterResponse && typeof chapterResponse === 'object' ? Object.keys(chapterResponse) : 'N/A',
          hasPanel: !!chapterResponse?.panel,
          panelType: typeof chapterResponse?.panel,
          isPanelArray: Array.isArray(chapterResponse?.panel),
          panelLength: Array.isArray(chapterResponse?.panel) ? chapterResponse.panel.length : 0,
          hasImages: !!chapterResponse?.images,
          imagesType: typeof chapterResponse?.images,
          isImagesArray: Array.isArray(chapterResponse?.images),
          imagesLength: Array.isArray(chapterResponse?.images) ? chapterResponse.images.length : 0,
        });
      }
    }, [chapterData, chapterResponse]);

    // Resume reading from last position on mount
    useEffect(() => {
        if (!loading && chapterResponse && progress > 0) {
            // Small delay to ensure images are loaded
            setTimeout(() => {
                resumeReading();
            }, 500);
        }
    }, [loading, chapterResponse, progress, resumeReading]);

    // Effect untuk menyimpan history jika komik data sudah ada
    useEffect(() => {
        if (!komikResponse) return;
        
        try {
            const timeNow = new Date().toISOString();
            const history = getJSONItem("historyKomik", []);
            
            if (!Array.isArray(history)) {
                console.error("History data is not an array");
                return;
            }

            const existingIndex = history.findIndex((item) => item?.title === komikResponse?.title);

            const updatedHistory = {
                title: komikResponse?.title || "Unknown",
                link: chapter,
                imageSrc: safeImageUrl(komikResponse?.thumbnail || komikResponse?.imageSrc),
                rating: komikResponse?.rating || 0,
                date: timeNow,
            };

            let newHistory;
            if (existingIndex !== -1) {
                newHistory = [...history];
                newHistory[existingIndex] = updatedHistory;
            } else {
                newHistory = [...history, updatedHistory];
            }

            setJSONItem("historyKomik", newHistory);
        } catch (error) {
            console.error("Error saving history:", error);
        }
    }, [komikResponse, chapter]);
    if (loading) {
        return <ChapterDetailSkeleton />;
    }

    if (error) {
        const normalizedError = normalizeError({ message: error });
        const isNotFound = normalizedError.type === ERROR_TYPES.NOT_FOUND;
        
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <p className="text-red-500 mb-2 text-lg font-semibold">
                        {isNotFound ? 'Chapter tidak ditemukan' : 'Gagal memuat chapter'}
                    </p>
                    <p className="text-gray-400 text-sm mb-6">
                        {isNotFound 
                            ? 'Chapter yang Anda cari tidak tersedia. Mungkin telah dihapus atau URL tidak valid.'
                            : error
                        }
                    </p>
                    <div className="flex gap-3 justify-center">
                        {!isNotFound && (
                            <button
                                onClick={refetchChapter}
                                className="bg-blue-500 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Coba Lagi
                            </button>
                        )}
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-[#212121] text-white font-medium px-6 py-2 rounded-lg hover:bg-[#171717] transition-colors"
                        >
                            Kembali
                        </button>
                        {komikEndpoint && (
                            <button
                                onClick={() => navigate(`/komik/${komikEndpoint}`)}
                                className="bg-blue-500 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Detail Komik
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!chapterResponse) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <p className="text-gray-400 mb-4 text-lg font-semibold">Chapter tidak ditemukan</p>
                    <p className="text-gray-500 text-sm mb-6">
                        Chapter yang Anda cari tidak tersedia. Silakan coba chapter lain.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-[#212121] text-white font-medium px-6 py-2 rounded-lg hover:bg-[#171717] transition-colors"
                        >
                            Kembali
                        </button>
                        {komikEndpoint && (
                            <button
                                onClick={() => navigate(`/komik/${komikEndpoint}`)}
                                className="bg-blue-500 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Detail Komik
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!komikResponse) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <p className="text-gray-400 mb-4 text-lg font-semibold">Detail komik tidak ditemukan</p>
                    <p className="text-gray-500 text-sm mb-6">
                        Tidak dapat memuat detail komik. Silakan coba lagi nanti.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-[#212121] text-white font-medium px-6 py-2 rounded-lg hover:bg-[#171717] transition-colors"
                        >
                            Kembali
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-blue-500 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Beranda
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Fungsi untuk menangani scroll saat area kanan layar diklik
    const handleImageClick = (event) => {
        const containerRect = chapterContainerRef.current.getBoundingClientRect();
        const clickPosition = event.clientX;
        const rightBoundary = containerRect.right * 0.85; // Hanya 85% sisi kanan yang bisa di-scroll

        if (clickPosition > rightBoundary) {
            // Klik di area kanan yang diizinkan
            window.scrollTo({
                top: window.scrollY + window.innerHeight,
                behavior: "smooth",
            });
        } else {
            // Klik di area lainnya (misalnya di kiri atau di tengah)
            setShowNavbar(!showNavbar);
        }
    };

    // Extract panel images from chapter response (API returns { title: "...", panel: [...] })
    // Handle multiple possible data structures
    // Memoized to prevent unnecessary re-renders and useEffect re-executions
    // Returns stable array reference - empty array is reused to prevent unnecessary re-renders
    const emptyArrayRef = useRef([]);
    const images = useMemo(() => {
      let extractedImages = null;
      
      if (chapterResponse) {
        // Primary: check panel array
        if (Array.isArray(chapterResponse.panel) && chapterResponse.panel.length > 0) {
          extractedImages = chapterResponse.panel;
        } 
        // Secondary: check images array
        else if (Array.isArray(chapterResponse.images) && chapterResponse.images.length > 0) {
          extractedImages = chapterResponse.images;
        }
        // Fallback: check if chapterResponse itself is an array of URLs
        else if (Array.isArray(chapterResponse) && chapterResponse.length > 0 && typeof chapterResponse[0] === 'string') {
          extractedImages = chapterResponse;
        }
      }
      
      // Additional fallback: if images is still empty, try to extract from chapterData directly
      if (!extractedImages && chapterData) {
        if (Array.isArray(chapterData) && chapterData.length > 0) {
          const firstItem = chapterData[0];
          if (firstItem && typeof firstItem === 'object') {
            if (Array.isArray(firstItem.panel) && firstItem.panel.length > 0) {
              extractedImages = firstItem.panel;
            } else if (Array.isArray(firstItem.images) && firstItem.images.length > 0) {
              extractedImages = firstItem.images;
            }
          } else if (Array.isArray(firstItem) && firstItem.length > 0 && typeof firstItem[0] === 'string') {
            // First item is array of URLs
            extractedImages = firstItem;
          }
        } else if (typeof chapterData === 'object' && chapterData !== null) {
          if (Array.isArray(chapterData.panel) && chapterData.panel.length > 0) {
            extractedImages = chapterData.panel;
          } else if (Array.isArray(chapterData.images) && chapterData.images.length > 0) {
            extractedImages = chapterData.images;
          }
        }
      }
      
      // Return extracted images or stable empty array reference
      return extractedImages || emptyArrayRef.current;
    }, [chapterResponse, chapterData]);
    
    // Debug logging for images
    // Only log when images array actually changes, not on every render
    // Since images is memoized, it will only change when chapterResponse or chapterData changes
    const imagesLengthRef = useRef(0);
    useEffect(() => {
      // Only log if images length changed or if we're in development and want detailed logs
      // eslint-disable-next-line no-undef
      if (process.env.NODE_ENV === 'development') {
        const lengthChanged = imagesLengthRef.current !== images.length;
        imagesLengthRef.current = images.length;
        
        // Only log on significant changes to avoid spam
        if (lengthChanged || images.length === 0) {
          if (images.length > 0) {
            console.log('[ChapterDetail] Images extracted successfully:', {
              count: images.length,
              firstImage: images[0],
              lastImage: images[images.length - 1],
              firstImageType: typeof images[0],
              isValidUrl: images[0] && typeof images[0] === 'string' && images[0].startsWith('http'),
            });
          } else if (!loading && !error) {
            // Only warn if we're not loading and there's no error (data loaded but no images)
            console.warn('[ChapterDetail] No images found - Debugging info:', {
              extractedImagesLength: images.length,
              chapterResponse: chapterResponse,
              chapterResponseType: typeof chapterResponse,
              chapterResponseKeys: chapterResponse && typeof chapterResponse === 'object' ? Object.keys(chapterResponse) : 'N/A',
              chapterData: chapterData,
              chapterDataType: typeof chapterData,
              chapterDataIsArray: Array.isArray(chapterData),
              chapterDataLength: Array.isArray(chapterData) ? chapterData.length : 'N/A',
              hasPanel: !!chapterResponse?.panel,
              panelType: typeof chapterResponse?.panel,
              panelIsArray: Array.isArray(chapterResponse?.panel),
              panelLength: Array.isArray(chapterResponse?.panel) ? chapterResponse.panel.length : 'N/A',
              hasImages: !!chapterResponse?.images,
              imagesType: typeof chapterResponse?.images,
              imagesIsArray: Array.isArray(chapterResponse?.images),
              chapterResponseImagesLength: Array.isArray(chapterResponse?.images) ? chapterResponse.images.length : 'N/A',
              loading: loading,
              error: error,
            });
          }
        }
      }
    }, [images, loading, error, chapterResponse, chapterData]); // images is memoized, so this won't cause excessive re-runs
    const chapterTitle = safeStringTrim(chapterResponse?.title, "Chapter");
    const chapterNumber = chapterTitle.split("Chapter ")[1] || "";
    const komikTitle = safeStringTrim(komikResponse?.title?.replace("Bahasa Indonesia", ""), "Unknown");
    const komikThumbnail = safeImageUrl(komikResponse?.thumbnail || komikResponse?.imageSrc);
    const prevChapterEndpoint = safeEndpoint(chapterResponse?.prevChapter || "", "");
    const nextChapterEndpoint = safeEndpoint(chapterResponse?.nextChapter || "", "");

    // Navigation functions
    const goToPrevChapter = useCallback(() => {
        if (prevChapterEndpoint) {
            navigate(`/chapter/${prevChapterEndpoint}`);
        }
    }, [prevChapterEndpoint, navigate]);

    const goToNextChapter = useCallback(() => {
        if (nextChapterEndpoint) {
            navigate(`/chapter/${nextChapterEndpoint}`);
        }
    }, [nextChapterEndpoint, navigate]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'arrowleft': goToPrevChapter,
        'arrowright': goToNextChapter,
        ' ': (e) => {
            e.preventDefault();
            if (isAutoScroll) {
                setIsAutoScroll(false);
            } else {
                window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
            }
        },
        'escape': () => {
            setShowNavbar(!showNavbar);
            setIsFullscreen(false);
        },
        'f': () => {
            if (!document.fullscreenElement) {
                chapterContainerRef.current?.requestFullscreen?.();
                setIsFullscreen(true);
            } else {
                document.exitFullscreen?.();
                setIsFullscreen(false);
            }
        },
        '+': () => setZoomLevel(prev => Math.min(prev + 0.1, 3)),
        '-': () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5)),
        '0': () => setZoomLevel(1),
    }, true);

    // Swipe gestures
    const swipeHandlers = useSwipeGestures({
        onSwipeLeft: goToNextChapter,
        onSwipeRight: goToPrevChapter,
    }, { threshold: 50, enabled: true });

    // Auto-scroll effect
    useEffect(() => {
        if (isAutoScroll) {
            autoScrollIntervalRef.current = setInterval(() => {
                window.scrollBy({
                    top: autoScrollSpeed,
                    behavior: 'smooth'
                });
            }, 100);
        } else {
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current);
                autoScrollIntervalRef.current = null;
            }
        }

        return () => {
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current);
            }
        };
    }, [isAutoScroll, autoScrollSpeed]);

    // Reading mode styles
    const readingModeStyles = useMemo(() => {
        switch (preferences.readingMode) {
            case READING_MODES.MANGA:
                return {
                    container: 'max-w-4xl mx-auto',
                    image: 'w-full h-auto',
                };
            case READING_MODES.LONG_STRIP:
                return {
                    container: 'w-full',
                    image: 'w-full h-auto',
                };
            case READING_MODES.WEBTOON:
            default:
                return {
                    container: 'w-full',
                    image: 'w-full h-auto',
                };
        }
    }, [preferences.readingMode]);

    // Zoom styles
    const zoomStyles = useMemo(() => {
        return {
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
        };
    }, [zoomLevel]);

    return (
        <div 
            ref={chapterContainerRef}
            {...swipeHandlers}
            className="relative"
        >
            {/* Reading Controls */}
            <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
                <ReadingModeSelector
                    currentMode={preferences.readingMode}
                    onModeChange={(mode) => updatePreference('readingMode', mode)}
                />
                <div className="flex flex-col gap-2 bg-[#212121] rounded-lg p-2">
                    <button
                        onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 3))}
                        className="p-2 hover:bg-[#171717] rounded"
                        aria-label="Zoom in"
                    >
                        <FaMagnifyingGlassPlus className="text-sm" />
                    </button>
                    <button
                        onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}
                        className="p-2 hover:bg-[#171717] rounded"
                        aria-label="Zoom out"
                    >
                        <FaMagnifyingGlassMinus className="text-sm" />
                    </button>
                    <button
                        onClick={() => setZoomLevel(1)}
                        className="p-2 hover:bg-[#171717] rounded text-xs"
                        aria-label="Reset zoom"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => setIsAutoScroll(!isAutoScroll)}
                        className={`p-2 hover:bg-[#171717] rounded ${isAutoScroll ? 'bg-blue-500 text-white' : ''}`}
                        aria-label="Auto scroll"
                    >
                        {isAutoScroll ? <FaPause className="text-sm" /> : <FaPlay className="text-sm" />}
                    </button>
                </div>
            </div>

            <div className={`flex flex-col items-center ${readingModeStyles.container}`} style={zoomStyles}>
                {images.length > 0 ? (
                    images.map((image, index) => {
                        const imageUrl = safeImageUrl(image);
                        // Use original image URL or index for stable key generation
                        // Prefer using the original image string if available, otherwise use index
                        const stableKey = typeof image === 'string' 
                          ? `image-${index}-${image.substring(0, 50)}` // Use first 50 chars of original URL
                          : `image-${index}`;
                        
                        // eslint-disable-next-line no-undef
                        if (process.env.NODE_ENV === 'development' && index === 0) {
                          console.log('[ChapterDetail] Rendering first image:', {
                            index,
                            imageUrl,
                            originalImage: image,
                            isValidUrl: typeof imageUrl === 'string' && imageUrl.startsWith('http'),
                          });
                        }
                        return (
                          <LazyImage
                            key={stableKey}
                            className={readingModeStyles.image}
                            src={imageUrl}
                            alt={`${chapterTitle} - Page ${index + 1}`}
                            onClick={handleImageClick}
                            loading={index < 3 ? "eager" : "lazy"} // Load first 3 images eagerly for better UX
                            onError={(e) => {
                              // eslint-disable-next-line no-undef
                              if (process.env.NODE_ENV === 'development') {
                                console.error(`[ChapterDetail] Failed to load image ${index + 1}:`, {
                                  index,
                                  imageUrl,
                                  error: e,
                                });
                              }
                            }}
                          />
                        );
                    })
                ) : (
                    <div className="min-h-screen flex items-center justify-center px-4">
                        <div className="text-center">
                            <p className="text-gray-500 mb-2">No images available</p>
                            {/* eslint-disable-next-line no-undef */}
                            {process.env.NODE_ENV === 'development' && (
                                <p className="text-gray-600 text-xs mt-2">
                                    Debug: images.length = {images.length}, chapterResponse = {chapterResponse ? 'exists' : 'null'}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div>
                <div
                    className={`fixed top-0 flex items-center justify-center bg-[#111111] w-full rounded-b-lg animated-topbar z-50 ${
                        showNavbar ? "show" : "hide"
                    }`}
                >
                    <button className="absolute left-4" onClick={() => navigate(-1)}>
                        <FaArrowLeft className="text-xl" />
                    </button>
                    <span className="font-extrabold p-2">Mode Baca</span>
                    {/* Reading Progress Indicator */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 w-32 h-1 bg-[#212121] rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                    </div>
                    <div className="absolute right-4 flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (!document.fullscreenElement) {
                                    chapterContainerRef.current?.requestFullscreen?.();
                                    setIsFullscreen(true);
                                } else {
                                    document.exitFullscreen?.();
                                    setIsFullscreen(false);
                                }
                            }}
                            className="p-2 hover:bg-[#171717] rounded"
                            aria-label="Toggle fullscreen"
                        >
                            {isFullscreen ? <FaCompress className="text-sm" /> : <FaExpand className="text-sm" />}
                        </button>
                    </div>
                </div>
                <div
                    className={`fixed bottom-0 transition-all bg-[#111111] w-full h-38 rounded-t-2xl animated-navbar z-50 ${
                        showNavbar ? "show" : "hide"
                    }`}
                >
                    <div className="flex items-center gap-2 p-4">
                        <NavLink className="w-1/4" to={`/komik/${komikEndpoint}`}>
                            <LazyImage
                                className="w-full h-full border-2 rounded-lg"
                                src={komikThumbnail}
                                alt={komikTitle}
                                loading="eager"
                            />
                        </NavLink>
                        <div className="flex flex-col justify-center w-3/4">
                            <span className="font-extrabold line-clamp-2">
                                {komikTitle}
                            </span>
                            <span className="text-xs">Chapter {chapterNumber}</span>
                            <div className="flex items-center justify-center gap-2 py-2">
                                {prevChapterEndpoint ? (
                                    <NavLink
                                        className="flex items-center bg-[#212121] hover:bg-[#171717] px-4 py-2 rounded-full"
                                        to={`/chapter/${prevChapterEndpoint}`}
                                    >
                                        <span className="text-sm font-semibold">Sebelumnya</span>
                                    </NavLink>
                                ) : null}
                                {nextChapterEndpoint ? (
                                    <NavLink
                                        className="flex items-center bg-[#212121] hover:bg-[#171717] px-4 py-2 rounded-full"
                                        to={`/chapter/${nextChapterEndpoint}`}
                                    >
                                        <span className="text-sm font-semibold">Selanjutnya</span>
                                    </NavLink>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChapterDetail;