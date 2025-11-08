import { NavLink } from "react-router-dom"
import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import { useKomikcastRoute } from "@/hooks/useKomikcastAPI"
import { safeStringTrim, safeImageUrl, safeEndpoint, extractChapter, normalizeError, ERROR_TYPES } from "@/utils/apiHelpers"
import { useToast } from "@/context/ToastContext"
import { KomikGridSkeleton } from "@/components/ui/LoadingSkeleton"

const ViewAll = ({ url }) => {
    const [page, setPage] = useState(1)
    const { error: showErrorToast } = useToast()

    useEffect(() => {
        window.scrollTo({
            behavior: "smooth",
            top: 0
        })
    }, [page])

    // Extract page from URL if present and validate
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');
        if (pageParam) {
            const pageNum = parseInt(pageParam, 10);
            // Validate page number: must be between 1 and 1000
            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= 1000) {
                setPage(pageNum);
            } else if (pageNum <= 0) {
                setPage(1);
                showErrorToast('Nomor halaman tidak valid. Menggunakan halaman 1.');
            } else if (pageNum > 1000) {
                setPage(1000);
                showErrorToast('Nomor halaman terlalu besar. Menggunakan halaman 1000.');
            }
        }
    }, [url, showErrorToast]);

    // Handle page changes - update URL without reload
    const handlePageChange = (newPage) => {
        // Validate page number
        if (newPage < 1) {
            newPage = 1;
        } else if (newPage > 1000) {
            newPage = 1000;
        }
        
        setPage(newPage);
        
        // Update URL without page reload
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', newPage.toString());
        window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    };

    // Normalize URL for route matching
    const normalizedUrl = url.startsWith('genre/') 
        ? `genre/${url.replace('genre/', '').split('?')[0]}` 
        : url.startsWith('search/') 
            ? `search/${url.split('/')[1]}` 
            : url.startsWith('terbaru')
                ? `terbaru?page=${page}`
                : url;

    const { data, loading, error, refetch } = useKomikcastRoute(
        normalizedUrl,
        {
            cacheKey: `viewall_${normalizedUrl}_page_${page}`,
            cacheTTL: 10 * 60 * 1000, // 10 minutes
            enableCache: true,
            page: page, // Pass page parameter for terbaru and genre endpoints
        }
    )

    // Show toast notification for errors
    useEffect(() => {
        if (error) {
            const normalizedError = normalizeError({ message: error });
            if (normalizedError.type === ERROR_TYPES.VALIDATION && error.includes('page')) {
                showErrorToast('Parameter halaman tidak valid. Menggunakan halaman 1.');
                setPage(1);
            } else if (normalizedError.type === ERROR_TYPES.NOT_FOUND) {
                showErrorToast('Data tidak ditemukan untuk halaman ini.');
            } else {
                showErrorToast(error);
            }
        }
    }, [error, showErrorToast]);

    if (loading) {
        return <KomikGridSkeleton count={9} className="py-2" />
    }

    if (error) {
        const normalizedError = normalizeError({ message: error });
        const isValidation = normalizedError.type === ERROR_TYPES.VALIDATION;
        const isNotFound = normalizedError.type === ERROR_TYPES.NOT_FOUND;
        
        return (
            <div className="py-2 flex items-center justify-center min-h-[200px]">
                <div className="text-center max-w-md">
                    <p className="text-red-500 mb-2 text-lg font-semibold">
                        {isNotFound ? 'Data tidak ditemukan' : isValidation ? 'Parameter tidak valid' : 'Gagal memuat data'}
                    </p>
                    <p className="text-gray-400 text-sm mb-6">
                        {isValidation && error.includes('page')
                            ? 'Parameter halaman tidak valid. Silakan gunakan nomor halaman yang valid (1-1000).'
                            : isNotFound
                                ? 'Data untuk halaman ini tidak tersedia. Silakan coba halaman lain.'
                                : error
                        }
                    </p>
                    <div className="flex gap-3 justify-center">
                        {!isValidation && (
                            <button
                                onClick={refetch}
                                className="bg-blue-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Coba Lagi
                            </button>
                        )}
                        {isValidation && (
                            <button
                                onClick={() => setPage(1)}
                                className="bg-blue-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Ke Halaman 1
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Handle different response structures
    // Data is already extracted by useKomikcastAPI using extractApiData
    // Search results: { seriesList: [...], pagination: [...] }
    // Genre results: [...]
    const seriesList = Array.isArray(data) 
      ? data 
      : data?.seriesList && Array.isArray(data.seriesList)
        ? data.seriesList 
        : [];
    
    if (!seriesList || !Array.isArray(seriesList) || seriesList.length === 0) {
        return (
            <div className="py-2 flex items-center justify-center min-h-[200px]">
                <p className="text-gray-500 text-center">Tidak ada data tersedia</p>
            </div>
        );
    }
    
    return (
        <div className="py-2">
            <div className="grid grid-cols-3 gap-2">
                {seriesList.map((komik, index) => {
                    const thumbnail = safeImageUrl(komik.image || komik.imageSrc || komik.thumbnail || 'https://files.catbox.moe/hu8n6y.jpg');
                    const endpoint = safeEndpoint(komik.url || komik.link || komik.endpoint);
                    const chapters = Array.isArray(komik.chapter) ? komik.chapter : [];
                    const chapterCount = chapters.length;
                    // Use extractChapter helper to properly handle string/object/array formats
                    const latestChapter = extractChapter(
                        komik.latestChapter || komik.chapter,
                        'N/A'
                    );
                    const title = safeStringTrim(komik.title, 'Untitled');
                    const displayChapter = chapterCount > 0 ? `${chapterCount} Ch.` : `Ch. ${latestChapter}`;

                    return (
                        <NavLink
                            className="relative bg-cover bg-center inner-shadow-bottom w-full h-[170px] md:h-[200px] rounded-sm cursor-pointer overflow-hidden group"
                            style={{
                                backgroundImage: `url(${thumbnail})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                            to={`/komik/${endpoint}`}
                            key={komik.endpoint || komik.link || index}
                        >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                            <span className="absolute top-0 left-0 bg-blue-500 text-white text-xs font-bold rounded-br-xl px-2 py-1 z-10">
                                {displayChapter}
                            </span>
                            <span className="absolute bottom-0 left-0 right-0 text-sm font-bold line-clamp-2 p-2 text-white drop-shadow-lg z-10">{title}</span>
                        </NavLink>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-2 py-4">
                <button
                    className={`font-medium px-4 py-2 rounded-lg transition-colors ${
                        page === 1
                            ? 'bg-[#212121] text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Halaman sebelumnya"
                >
                    Prev
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Halaman</span>
                    <h3 className="bg-blue-500 text-white font-medium px-3 py-1 rounded-full">{page}</h3>
                    <span className="text-gray-400 text-sm">dari {data?.pagination?.length > 0 ? data.pagination.length : '?'}</span>
                </div>
                <button
                    className={`font-medium px-4 py-2 rounded-lg transition-colors ${
                        (data?.pagination && Array.isArray(data.pagination) && data.pagination.length > 0 && page >= data.pagination.length) || 
                        (!data?.pagination && seriesList.length === 0)
                            ? 'bg-[#212121] text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    onClick={() => handlePageChange(page + 1)}
                    disabled={
                        (data?.pagination && Array.isArray(data.pagination) && data.pagination.length > 0 && page >= data.pagination.length) ||
                        (!data?.pagination && seriesList.length === 0)
                    }
                    aria-label="Halaman berikutnya"
                >
                    Next
                </button>
            </div>
        </div>
    )
}

ViewAll.propTypes = {
    url: PropTypes.string.isRequired
}

export default ViewAll