import React from "react"
import { NavLink } from "react-router-dom"
import { useKomikcastAPI } from "@/hooks/useKomikcastAPI"
import { komikcastAPI } from "@/services/api"
import { safeStringTrim, safeImageUrl, safeEndpoint } from "@/utils/apiHelpers"
import { KomikGridSkeleton } from "@/components/ui/LoadingSkeleton"
import LazyImage from "@/components/ui/LazyImage"
import { memo } from "react"

const Update = () => {
    const { data, loading, error, refetch } = useKomikcastAPI(
        () => komikcastAPI.getPopular(),
        {
            cacheKey: 'komik_new',
            cacheTTL: 2 * 60 * 1000, // 2 minutes
            enableCache: true,
        }
    );

    if (loading) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Terbaru</span>
                <KomikGridSkeleton count={6} className="py-2" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Terbaru</span>
                <div className="flex items-center justify-center py-4">
                    <div className="text-center">
                        <p className="text-red-500 text-center mb-2">{error}</p>
                        <button
                            onClick={refetch}
                            className="bg-my text-black font-medium px-4 py-2 rounded-lg hover:bg-opacity-80"
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
        return <div></div>;
    }
    
    return (
        <div className="p-2">
            <span className="py-2 text-2xl font-extrabold">Komik Terbaru</span>
            <div className="grid grid-cols-3 gap-2 py-2">
                {data.slice(0,21).map((komik, index) => {
                    const title = safeStringTrim(komik.title, 'Untitled');
                    const thumbnail = safeImageUrl(komik.imageSrc || komik.image || komik.thumbnail);
                    const endpoint = safeEndpoint(komik.link || komik.endpoint || komik.url);
                    const chapterTitle = safeStringTrim(komik.chapters?.[0]?.chapterTitle || komik.latestChapter, 'N/A');

                    return (
                        <NavLink
                            className="relative bg-cover bg-center w-full h-[170px] md:h-[100px] rounded-sm cursor-pointer overflow-hidden"
                            style={{
                                backgroundImage: `url(${thumbnail})`,
                                boxShadow: 'inset 0 -40px 20px rgba(0, 0, 0, 0.8)',
                                borderRadius: '8px'
                            }}
                            to={`/komik/${endpoint}`}
                            key={endpoint || index}
                        >
                            <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">
                                Ch. {String(chapterTitle).replace("Ch.", "").replace("Chapter", "").trim()}
                            </span>
                            <span className="absolute bottom-0 text-sm font-bold line-clamp-2 p-1">{title}</span>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    )
}

export default memo(Update)
