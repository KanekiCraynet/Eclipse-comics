import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useKomikcastAPI } from "@/hooks/useKomikcastAPI";
import { komikcastAPI } from "@/services/api";
import { getJSONItem, setJSONItem } from "@/utils/storageHelpers";
import { safeStringTrim, safeImageUrl, safeEndpoint } from "@/utils/apiHelpers";
import { useReadingPreferences, READING_MODES } from "@/hooks/useReadingPreferences";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSwipeGestures } from "@/hooks/useSwipeGestures";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import ReadingModeSelector from "@/components/ReadingModeSelector";
import { FaArrowLeft, FaSearchPlus, FaSearchMinus, FaExpand, FaCompress, FaPlay, FaPause } from "react-icons/fa6";
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
    const chapterResponse = Array.isArray(chapterData) && chapterData.length > 0 
      ? chapterData[0] 
      : chapterData;
    
    const komikResponse = komikData;

    const loading = chapterLoading || komikLoading;
    const error = chapterError || komikError;

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
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-2">Gagal memuat chapter</p>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
                    <button
                        onClick={refetchChapter}
                        className="bg-my text-black font-medium px-4 py-2 rounded-lg hover:bg-opacity-80"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    if (!chapterResponse) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Chapter tidak ditemukan</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-my text-black font-medium px-4 py-2 rounded-lg hover:bg-opacity-80"
                    >
                        Kembali
                    </button>
                </div>
            </div>
        );
    }

    if (!komikResponse) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Detail komik tidak ditemukan</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-my text-black font-medium px-4 py-2 rounded-lg hover:bg-opacity-80"
                    >
                        Kembali
                    </button>
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
    const images = Array.isArray(chapterResponse?.panel) 
      ? chapterResponse.panel 
      : Array.isArray(chapterResponse?.images) 
        ? chapterResponse.images 
        : [];
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
                        <FaSearchPlus className="text-sm" />
                    </button>
                    <button
                        onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}
                        className="p-2 hover:bg-[#171717] rounded"
                        aria-label="Zoom out"
                    >
                        <FaSearchMinus className="text-sm" />
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
                        className={`p-2 hover:bg-[#171717] rounded ${isAutoScroll ? 'bg-my text-black' : ''}`}
                        aria-label="Auto scroll"
                    >
                        {isAutoScroll ? <FaPause className="text-sm" /> : <FaPlay className="text-sm" />}
                    </button>
                </div>
            </div>

            <div className={`flex flex-col items-center ${readingModeStyles.container}`} style={zoomStyles}>
                {images.length > 0 ? (
                    images.map((image, index) => (
                        <LazyImage
                            key={index}
                            className={readingModeStyles.image}
                            src={safeImageUrl(image)}
                            alt={`${chapterTitle} - Page ${index + 1}`}
                            onClick={handleImageClick}
                            loading="lazy"
                        />
                    ))
                ) : (
                    <div className="min-h-screen flex items-center justify-center">
                        <p className="text-gray-500">No images available</p>
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
                            className="h-full bg-my transition-all duration-300"
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