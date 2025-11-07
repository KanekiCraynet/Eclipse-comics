import { NavLink } from "react-router-dom"
import { useKomikcastAPI } from '@/hooks/useKomikcastAPI';
import { komikcastAPI } from '@/services/api';
import { safeStringSplit, safeStringTrim, safeImageUrl, safeEndpoint } from '@/utils/apiHelpers';
import { KomikCardSkeleton } from '@/components/ui/LoadingSkeleton';
import LazyImage from '@/components/ui/LazyImage';

const Recomend = () => {
    const { data, loading, error, refetch } = useKomikcastAPI(
        () => komikcastAPI.getRecommended(),
        {
            cacheKey: 'komik_recommended',
            cacheTTL: 30 * 60 * 1000, // 30 minutes
            enableCache: true,
        }
    );

    if (loading) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Rekomendasi</span>
                <KomikCardSkeleton count={3} className="pt-4 pb-2" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Rekomendasi</span>
                <div className="text-center p-8">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={refetch}
                        className="px-4 py-2 bg-my text-black rounded-lg hover:bg-opacity-80 font-medium"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Rekomendasi</span>
                <div className="text-center p-8 text-gray-500">
                    <p>Tidak ada rekomendasi komik</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-2">
            <span className="py-2 text-2xl font-extrabold">Rekomendasi</span>
            <div className="flex items-center scroll-page snap-x snap-mandatory pt-4 pb-2 overflow-x-auto">
                {data.map((komik, index) => {
                    // Safe data access dengan normalization functions
                    const genres = safeStringSplit(komik.genres || komik.genre);
                    const title = safeStringTrim(komik.title, 'Untitled');
                    const thumbnail = safeImageUrl(komik.image || komik.imageSrc || komik.thumbnail);
                    const endpoint = safeEndpoint(komik.href || komik.url || komik.endpoint || komik.link);

                    return (
                        <NavLink
                            className="relative flex shrink-0 snap-center w-full h-36 md:h-48 bg-black bg-cover bg-center text-white"
                            style={{backgroundImage: `url(${thumbnail})`}}
                            to={`/komik/${endpoint}`}
                            key={komik.endpoint || komik.link || index}
                        >
                            <div className="absolute inset-0 bg-black opacity-85 brightness-75"></div>
                            <div className="flex flex-col items-start justify-center gap-y-2 w-2/3 md:3/4 p-4 z-10">
                                <div className="relative -top-4 w-full">
                                    <span className="text-xl font-bold line-clamp-2">{title}</span>
                                    <span className="text-xs line-clamp-2">
                                        {genres.map((genre) => genre.replace("Genre:", "").trim()).join(", ")}
                                    </span>
                                </div>
                                <button className="absolute bottom-2 bg-my text-black text-sm font-semibold px-2 py-1 rounded-md">
                                    Baca Sekarang
                                </button >
                            </div>
                            <div className="w-1/3 md:1/4 z-10">
                                <LazyImage className="w-full h-full object-cover" src={thumbnail} alt={title} loading="lazy" />
                            </div>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    )
}

export default Recomend