import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useKomikcastAPI } from "@/hooks/useKomikcastAPI";
import { komikcastAPI } from "@/services/api";
import { getJSONItem, setJSONItem } from "@/utils/storageHelpers";
import { safeImageUrl, safeEndpoint } from "@/utils/apiHelpers";
import { FaArrowLeft } from "react-icons/fa6";
import { ChapterDetailSkeleton } from "@/components/ui/LoadingSkeleton";
import LazyImage from "@/components/ui/LazyImage";

const ChapterDetail = () => {
    const [showNavbar, setShowNavbar] = useState(false);
    const { chapter } = useParams();
    const navigate = useNavigate();
    const chapterContainerRef = useRef(null);

    // Extract komik endpoint from chapter
    const komikEndpoint = chapter.split("-chapter")[0];

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
    // Chapter response format: { status: "success", data: [{ title: "...", panel: [...] }] }
    const chapterResponseData = chapterData?.data || chapterData;
    const chapterResponse = Array.isArray(chapterResponseData) && chapterResponseData.length > 0 
      ? chapterResponseData[0] 
      : chapterResponseData;
    
    const komikResponse = komikData?.data || komikData;

    const loading = chapterLoading || komikLoading;
    const error = chapterError || komikError;

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
    const chapterTitle = chapterResponse?.title || "Chapter";
    const chapterNumber = chapterTitle.split("Chapter ")[1] || "";
    const komikTitle = komikResponse?.title?.replace("Bahasa Indonesia", "") || "Unknown";
    const komikThumbnail = safeImageUrl(komikResponse?.thumbnail || komikResponse?.imageSrc);
    const prevChapterEndpoint = safeEndpoint(chapterResponse?.prevChapter || "", "");
    const nextChapterEndpoint = safeEndpoint(chapterResponse?.nextChapter || "", "");

    return (
        <div ref={chapterContainerRef}>
            <div className="flex flex-col items-center">
                {images.length > 0 ? (
                    images.map((image, index) => (
                        <LazyImage
                            key={index}
                            className="w-full h-auto"
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