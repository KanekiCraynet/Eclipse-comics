import React from "react"
import { NavLink } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import PropTypes from "prop-types"
import { useKomikcastRoute } from "@/hooks/useKomikcastAPI"
import { komikcastAPI } from "@/services/api"
import { safeStringTrim, safeImageUrl, safeEndpoint } from "@/utils/apiHelpers"
import { KomikGridSkeleton } from "@/components/ui/LoadingSkeleton"
import LazyImage from "@/components/ui/LazyImage"

const ViewAll = ({ url }) => {
    const [page, setPage] = useState(1)

    useEffect(() => {
        window.scrollTo({
            behavior: "smooth",
            top: 0
        })
    }, [page])

    // Determine API function based on URL
    const apiFunction = useMemo(() => {
        if (url.startsWith('genre/')) {
            const genre = url.replace('genre/', '').split('?')[0];
            return () => komikcastAPI.getGenreComics(genre, page);
        } else if (url.startsWith('search/')) {
            const keyword = url.split('/')[1];
            return () => komikcastAPI.search(keyword);
        }
        return null;
    }, [url, page]);

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
                        className="bg-my text-black font-medium px-4 py-2 rounded-lg hover:bg-opacity-80"
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
                    const thumbnail = safeImageUrl(komik.image || komik.imageSrc || komik.thumbnail);
                    const endpoint = safeEndpoint(komik.url || komik.link || komik.endpoint);
                    const latestChapter = safeStringTrim(komik.latestChapter, 'N/A');
                    const title = safeStringTrim(komik.title, 'Untitled');

                    return (
                        <NavLink
                            className="relative bg-cover bg-center inner-shadow-bottom w-full h-[170px] md:h-[100px] rounded-sm cursor-pointer overflow-hidden"
                            style={{backgroundImage: `url(${thumbnail})`}}
                            to={`/komik/${endpoint}`}
                            key={komik.endpoint || komik.link || index}
                        >
                            <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">
                                Ch. {String(latestChapter).replace("Chapter","").trim()}
                            </span>
                            <span className="absolute bottom-0 text-sm font-bold line-clamp-2 p-1">{title}</span>
                        </NavLink>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-2 py-4">
                {page === 1 ? null : (
                    <button
                        className="bg-my text-black font-medium px-2 py-1 rounded-lg"
                        onClick={() => setPage(page - 1)}
                    >
                        Prev
                    </button>
                )}
                <h3 className="bg-my text-black font-medium px-3 py-1 rounded-full">{page}</h3>
                {data?.pagination && Array.isArray(data.pagination) && data.pagination.length > 0 ? (
                    <button
                        className="bg-my text-black font-medium px-2 py-1 rounded-lg"
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