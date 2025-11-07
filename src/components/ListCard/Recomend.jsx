
import { NavLink } from "react-router-dom"
import { useFetch } from '../../hooks/useFetch';
import { komikcastAPI } from '../../services/api';
import { safeStringSplit, safeImageUrl, safeEndpoint } from '../../utils/apiHelpers';

const Recomend = () => {
    const { data, loading, error, refetch } = useFetch(komikcastAPI.getRecommended);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-50 rounded-lg">
                <p className="text-red-600 mb-4">⚠️ {error}</p>
                <button
                    onClick={refetch}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500">
                <p>📭 Tidak ada rekomendasi komik</p>
            </div>
        );
    }
    
    return (
        <div className="flex items-center scroll-page snap-x snap-mandatory pt-4 pb-2 overflow-x-auto">
            {data.map((komik, index) => {
                // Safe data access dengan optional chaining & fallback
                const genres = safeStringSplit(komik.genres || komik.genre);
                const title = komik.title || 'Untitled';
                const thumbnail = safeImageUrl(komik.image || komik.imageSrc);
                const endpoint = safeEndpoint(komik.url || komik.endpoint);

                return (
                    <NavLink
                        className="relative flex shrink-0 snap-center w-full h-36 md:h-48 bg-black bg-cover bg-center text-white"
                        style={{backgroundImage: `url(${thumbnail})`}}
                        to={`/komik/${endpoint}`}
                        key={komik.endpoint || index}
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
                            <img className="w-full h-full" src={thumbnail} alt={title} />
                        </div>
                    </NavLink>
                );
            })}
        </div>
    )
}

export default Recomend