import { NavLink } from "react-router-dom"
import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import { useKomikcastRoute } from "@/hooks/useKomikcastAPI"
import { safeStringTrim, safeImageUrl, safeEndpoint } from "@/utils/apiHelpers"
import { KomikGridSkeleton } from "@/components/ui/LoadingSkeleton"

const ViewAll = ({ url }) => {
    const [page, setPage] = useState(1)

    useEffect(() => {
        window.scrollTo({
            behavior: "smooth",
            top: 0
        })
    }, [page])

    const { data, loading, error, refetch } = useKomikcastRoute(
        url.startsWith('genre/') ? `genre/${url.replace('genre/', '').split('?')[0]}` : 
        url.startsWith('search/') ? `search/${url.split('/')[1]}` : url,
        {
            cacheKey: `viewall_${url}_${page}`,
            cacheTTL: 10 * 60 * 1000, // 10 minutes
            enableCache: true,
        }
    )

    if (loading) {
        return <KomikGridSkeleton count={9} className="py-2" />
    }

    if (error) {
        return (
            <div className="py-2 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <p className="text-red-500 mb-2">Gagal memuat data</p>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
                    <button
                        onClick={refetch}
                        className="bg-blue-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                        Coba Lagi
                    </button>
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
                {page === 1 ? null : (
                    <button
                        className="bg-blue-500 text-white font-medium px-2 py-1 rounded-lg"
                        onClick={() => setPage(page - 1)}
                    >
                        Prev
                    </button>
                )}
                <h3 className="bg-blue-500 text-white font-medium px-3 py-1 rounded-full">{page}</h3>
                {data?.pagination && Array.isArray(data.pagination) && data.pagination.length > 0 ? (
                    <button
                        className="bg-blue-500 text-white font-medium px-2 py-1 rounded-lg"
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                    </button>
                ) : null}
            </div>
        </div>
    )
}

ViewAll.propTypes = {
    url: PropTypes.string.isRequired
}

export default ViewAll