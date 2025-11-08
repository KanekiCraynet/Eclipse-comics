import { NavLink } from "react-router-dom"
import { memo } from "react"
import { useKomikcastAPI } from '@/hooks/useKomikcastAPI';
import { komikcastAPI } from '@/services/api';
import { safeStringSplit, safeStringTrim, safeImageUrl, safeEndpoint } from '@/utils/apiHelpers';
import { KomikCardSkeleton } from '@/components/ui/LoadingSkeleton';
import LazyImage from '@/components/ui/LazyImage';

const Recomend = memo(() => {
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
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
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
    
    // Get first comic as featured
    const featuredComic = data[0];
    
    if (!featuredComic) {
        return null;
    }

    const featuredGenres = safeStringSplit(featuredComic.genres || featuredComic.genre);
    const featuredTitle = safeStringTrim(featuredComic.title, 'Untitled');
    const featuredThumbnail = safeImageUrl(featuredComic.image || featuredComic.imageSrc || featuredComic.thumbnail);
    const featuredEndpoint = safeEndpoint(featuredComic.href || featuredComic.url || featuredComic.endpoint || featuredComic.link);

    return (
        <div className="p-2">
            <div className="relative flex flex-col md:flex-row items-center gap-4 p-4 bg-gradient-to-br from-[#1a1a1a] to-[#111111] rounded-lg mb-4">
                <div className="flex-1 flex flex-col gap-3 z-10">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white line-clamp-2">{featuredTitle}</h2>
                    <div className="flex flex-wrap gap-2">
                        {featuredGenres.slice(0, 6).map((genre, idx) => (
                            <span key={idx} className="text-xs text-gray-400">
                                {genre.replace("Genre:", "").trim()}
                                {idx < featuredGenres.slice(0, 6).length - 1 && ","}
                            </span>
                        ))}
                    </div>
                    <NavLink
                        to={`/komik/${featuredEndpoint}`}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg w-fit transition-colors"
                    >
                        Baca Sekarang
                    </NavLink>
                </div>
                <div className="w-full md:w-1/3 max-w-[200px] z-10">
                    <NavLink to={`/komik/${featuredEndpoint}`}>
                        <LazyImage 
                            className="w-full aspect-[3/4] object-cover rounded-lg shadow-2xl" 
                            src={featuredThumbnail} 
                            alt={featuredTitle} 
                            loading="eager" 
                        />
                    </NavLink>
                </div>
            </div>
        </div>
    )
})

Recomend.displayName = 'Recomend'

export default Recomend