import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useKomikcastAPI } from "@/hooks/useKomikcastAPI";
import { komikcastAPI } from "@/services/api";
import { getJSONItem, setJSONItem } from "@/utils/storageHelpers";
import { safeStringTrim, safeImageUrl, safeEndpoint } from "@/utils/apiHelpers";
import { FaPaperPlane, FaUser, FaBookmark, FaTrash, FaArrowLeft, FaStar, FaCalendarDays, FaReadme } from "react-icons/fa6";
import { IoMdEye } from "react-icons/io";
import { KomikDetailSkeleton } from "@/components/ui/LoadingSkeleton";
import LazyImage from "@/components/ui/LazyImage";

const KomikDetail = () => {
  const [isBookmark, setIsBookmark] = useState(false);
  const navigate = useNavigate();
  const { komik } = useParams();
  
  // Validate komik endpoint - redirect to home if empty or invalid
  useEffect(() => {
    if (!komik || komik.trim() === '') {
      navigate('/', { replace: true });
    }
  }, [komik, navigate]);
  
  // Use unified hook with caching
  // Data is already extracted by useKomikcastAPI using extractApiData
  const { data, loading, error, refetch } = useKomikcastAPI(
    () => komikcastAPI.getDetail(komik),
    {
      cacheKey: `komik_detail_${komik}`,
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      enableCache: true,
      skip: !komik || komik.trim() === '', // Skip API call if endpoint is invalid
    }
  );
  
  const commentBoxRef = useRef(null);
  const scriptRef = useRef(null);

  // Check bookmark status with safe JSON parsing
  useEffect(() => {
    if (data?.title) {
      try {
        const checkBookmark = getJSONItem("bookmarkKomik", []);
        const isBookmarked = Array.isArray(checkBookmark) && 
          checkBookmark.some((item) => item?.title === data.title);
        setIsBookmark(isBookmarked);
      } catch (error) {
        console.error("Error checking bookmark:", error);
        setIsBookmark(false);
      }
    }
  }, [data]);

  // Defer CommentBox loading to improve initial page performance
  useEffect(() => {
    let timeoutId;
    let idleCallbackId;
    
    const loadCommentBox = async () => {
      try {
        // Wait for page to be fully loaded before loading CommentBox
        if (document.readyState === 'loading') {
          await new Promise((resolve) => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              document.addEventListener('DOMContentLoaded', resolve, { once: true });
            }
          });
        }

        // Additional delay to prevent blocking main thread
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 500);
        });

        if (!scriptRef.current) {
          scriptRef.current = document.createElement("script");
          scriptRef.current.src = "https://unpkg.com/commentbox.io/dist/commentBox.min.js";
          scriptRef.current.async = true;
          scriptRef.current.defer = true;
          scriptRef.current.onerror = () => {
            console.error("Failed to load CommentBox script");
          };
          document.body.appendChild(scriptRef.current);

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("CommentBox script load timeout"));
            }, 10000);
            
            scriptRef.current.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            scriptRef.current.onerror = (error) => {
              clearTimeout(timeout);
              reject(error);
            };
          });
        }

        // Use requestIdleCallback if available for better performance
        const initCommentBox = () => {
          if (window.commentBox) {
            try {
              commentBoxRef.current = window.commentBox('5660104556806144-proj', {
                className: 'commentbox',
                defaultBoxId: `${komik}`,
                textColor: 'white',
              });
            } catch (error) {
              console.error("Error initializing CommentBox:", error);
            }
          }
        };

        if (window.requestIdleCallback) {
          idleCallbackId = window.requestIdleCallback(initCommentBox, { timeout: 2000 });
        } else {
          idleCallbackId = setTimeout(initCommentBox, 100);
        }
      } catch (error) {
        console.error("Error loading CommentBox:", error);
      }
    };

    loadCommentBox();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (idleCallbackId) {
        if (window.cancelIdleCallback) {
          window.cancelIdleCallback(idleCallbackId);
        } else {
          clearTimeout(idleCallbackId);
        }
      }
      if (commentBoxRef.current) {
        try {
          commentBoxRef.current.destroy();
          commentBoxRef.current = null;
        } catch (error) {
          console.error("Error destroying CommentBox:", error);
        }
      }
    };
  }, [komik]);

  if (loading) {
    return <KomikDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-2 text-lg font-semibold">Gagal memuat detail komik</p>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={refetch}
              className="bg-my text-black font-medium px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => navigate(-1)}
              className="bg-[#212121] text-white font-medium px-6 py-2 rounded-lg hover:bg-[#171717] transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.title) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-gray-400 mb-4 text-lg">Komik tidak ditemukan</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-my text-black font-medium px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const chapterCount = Array.isArray(data?.chapter) ? data.chapter.length : 0;

  // Fallback image when API thumbnail is missing or relative
  const DEFAULT_THUMBNAIL = "https://files.catbox.moe/hu8n6y.jpg";
  const getThumbnailUrl = (thumb) => {
    return safeImageUrl(thumb, DEFAULT_THUMBNAIL);
  };


  const handleBookmark = () => {
    try {
      const bookmarkKomik = getJSONItem("bookmarkKomik", []);
      
      if (!Array.isArray(bookmarkKomik)) {
        console.error("Bookmark data is not an array");
        return;
      }
      
      if (isBookmark) {
        const removeBookmark = bookmarkKomik.filter(item => item?.title !== data?.title);
        setJSONItem("bookmarkKomik", removeBookmark);
        setIsBookmark(false);
      } else {
        const updatedData = { ...data, link: komik };
        const newBookmarks = [...bookmarkKomik, updatedData];
        setJSONItem("bookmarkKomik", newBookmarks);
        setIsBookmark(true);
      }
    } catch (error) {
      console.error("Error handling bookmark:", error);
    }
  };

  const shareUrl = () => {
    const shareData = {
      title: "Bagikan Komik Ini",
      text: `Ayo ajak temanmu untuk baca komik ini : ${window.location.href}`,
    };

    if (navigator.share) {
      try {
        navigator.share(shareData);
        console.log("Berhasil dibagikan!");
      } catch (error) {
        console.error("Gagal membagikan:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const thumbnailUrl = getThumbnailUrl(data?.thumbnail);
  const title = safeStringTrim(data?.title?.replace("Bahasa Indonesia", ""), "Untitled");
  const chapters = Array.isArray(data?.chapter) ? data.chapter : [];

  return (
    <div className="pb-4">
      <div className="relative flex flex-col items-center justify-center gap-3 px-2 pt-10 pb-4">
        <LazyImage
          className="absolute top-0 w-screen h-52 blur-2xl opacity-50"
          src={thumbnailUrl}
          alt={`${title} background`}
          loading="eager"
        />
        <button 
          className="absolute top-2 left-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors" 
          onClick={() => navigate(-1)}
          aria-label="Kembali"
        >
          <FaArrowLeft className="text-xl text-white" />
        </button>
        <div className="w-1/3 max-w-[200px] relative z-10">
          <LazyImage
            className="relative bg-cover bg-center w-full aspect-[3/4] rounded-lg overflow-hidden shadow-2xl"
            src={thumbnailUrl}
            alt={`${title} thumbnail`}
            loading="eager"
          />
        </div>
        <span className="relative text-2xl md:text-3xl font-extrabold z-10 text-center px-4 line-clamp-2">{title}</span>
      </div>
      <div className="flex items-center gap-1 pl-3 pb-3">
        <IoMdEye className="text-sm text-gray-400" />
        <span className="text-xs text-gray-400">{chapterCount} Chapters</span>
      </div>
      <div className="flex items-center gap-2 whitespace-nowrap scroll-page px-2 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 text-sm bg-[#212121] px-3 py-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors">
          <FaCalendarDays className="text-sm text-gray-300" />
          <span className="text-gray-200">{data?.released || "Unknown"}</span>
        </div>
        <div className="flex items-center gap-1 text-sm bg-[#212121] px-3 py-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors">
          <FaUser className="text-sm text-gray-300" />
          <span className="text-gray-200">{data?.author || "Unknown"}</span>
        </div>
        <div className="flex items-center gap-1 text-sm bg-[#212121] px-3 py-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors">
          <FaStar className="text-sm text-yellow-300" />
          <span className="text-gray-200">{data?.rating ?? "N/A"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 whitespace-nowrap scroll-page px-2 py-2 overflow-x-auto">
        {(Array.isArray(data?.genre) ? data.genre : []).map((genre, index) => (
          <div className="text-sm bg-[#212121] px-3.5 py-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors" key={index}>
            <span className="text-gray-200">{genre?.title || genre}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 px-4 py-6">
        {isBookmark ?
          <button
            className="flex items-center justify-center gap-3 bg-[#212121] hover:bg-[#2a2a2a] w-1/2 text-white p-3 rounded-full transition-colors"
            onClick={handleBookmark}
          >
            <FaTrash className="text-lg text-red-500" />
            <span className="text-base font-semibold">Remove</span>
          </button>
          :
          <button
            className="flex items-center justify-center gap-3 bg-[#212121] hover:bg-[#2a2a2a] w-1/2 text-white p-3 rounded-full transition-colors"
            onClick={handleBookmark}
          >
            <FaBookmark className="text-lg text-my" />
            <span className="text-base font-semibold">Bookmark</span>
          </button>
        }
        <button
          onClick={shareUrl}
          className="flex items-center justify-center gap-3 bg-[#212121] hover:bg-[#2a2a2a] w-1/2 text-white p-3 rounded-full transition-colors"
        >
          <FaPaperPlane className="text-lg text-my" />
          <span className="text-base font-semibold">Bagikan</span>
        </button>
      </div>
      <div className="px-4 pb-4">
        <p className="text-sm text-gray-300 leading-relaxed">{data?.description || "No description available"}</p>
      </div>

      {/* Chapter List */}
      <div className="px-4 py-2">
        <span className="text-2xl font-extrabold">Chapter List</span>
      </div>
      <div className="container max-h-[400px] flex flex-col overflow-y-auto gap-2 rounded-md px-4 pb-4">
        {chapters.length > 0 ? (
          chapters.map((chapter, index) => {
            const chapterEndpoint = safeEndpoint(chapter?.href || chapter?.url || "", "");
            return (
              <NavLink
                key={index}
                className="flex items-center justify-between bg-[#212121] px-4 py-3 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                to={`/chapter/${chapterEndpoint}`}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-white truncate">{chapter?.title || `Chapter ${index + 1}`}</span>
                  {chapter?.date && (
                    <span className="text-xs text-gray-400 mt-0.5">{chapter.date}</span>
                  )}
                </div>
                <FaReadme className="text-lg text-gray-400 ml-3 flex-shrink-0" />
              </NavLink>
            );
          })
        ) : (
          <div className="text-center text-gray-400 py-8">
            <p>Tidak ada chapter tersedia</p>
          </div>
        )}
      </div>

      {/* Comments Section moved below Chapter List */}
      <div className="px-4 mt-6 mb-4">
        <div className="bg-[#212121] rounded-lg p-4 max-h-[600px] overflow-y-auto">
          <div className="commentbox" />
        </div>
      </div>
    </div>
  );
};

export default KomikDetail