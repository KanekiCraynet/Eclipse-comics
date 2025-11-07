import React from "react"
import { NavLink } from "react-router-dom"
import { useKomikcastAPI } from "@/hooks/useKomikcastAPI"
import { komikcastAPI } from "@/services/api"
import { safeImageUrl, safeEndpoint } from "@/utils/apiHelpers"
import { FaStar } from "react-icons/fa6"
import { KomikCardSkeleton } from "@/components/ui/LoadingSkeleton"
import { memo } from "react"

const Viewed = () => {
    const { data, loading, error, refetch } = useKomikcastAPI(
        () => komikcastAPI.getRecommended(),
        {
            cacheKey: 'komik_recommendation',
            cacheTTL: 2 * 60 * 1000, // 2 minutes
            enableCache: true,
        }
    );

    if (loading) {
        return (
            <div className="p-2">
                <KomikCardSkeleton count={5} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Rekomendasi</span>
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
            <span className="py-2 text-2xl font-extrabold">Komik Rekomendasi</span>
            <div className="flex items-center scroll-page gap-2 py-2">
                {data.map((komik, index) => {
                    const title = komik.title || 'Untitled';
                    const thumbnail = safeImageUrl(komik.imageSrc || komik.image || komik.thumbnail);
                    const endpoint = safeEndpoint(komik.link || komik.endpoint || komik.url);
                    const rating = String(komik.rating || '0');
                    const chapter = komik.chapter || komik.latestChapter || 'N/A';

                    return (
                        <NavLink
                            className="relative bg-cover inner-shadow-bottom w-auto min-w-[107px] md:min-w-36 h-36 md:h-48 rounded-lg cursor-pointer overflow-hidden"
                            style={{backgroundImage: `url(${thumbnail})`}}
                            to={`/komik/${endpoint}`}
                            key={endpoint || index}
                        >
                            <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">Ch. {String(chapter).replace("Chapter","").trim()}</span>
                            <div className="absolute top-[76px] left-0 flex items-center gap-1 p-1">
                                <FaStar className="text-yellow-300 text-xs z-50" />
                                <span className="text-white text-xs font-medium z-50">{rating.slice(0,3)}</span>
                            </div>
                            <span className="absolute bottom-0 text-white text-sm font-semibold line-clamp-2 p-1">{title}</span>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    )
}

export default memo(Viewed)
