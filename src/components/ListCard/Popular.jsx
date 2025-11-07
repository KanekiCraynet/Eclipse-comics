import { useMemo } from "react"
import { NavLink } from "react-router-dom"
import { useKomikcastAPI } from '@/hooks/useKomikcastAPI';
import { useBatchFetch } from '@/hooks/useBatchFetch';
import { komikcastAPI } from '@/services/api';
import { safeStringTrim, safeImageUrl, safeEndpoint, extractApiData, extractChapter, extractRating } from '@/utils/apiHelpers';
import { FaStar } from "react-icons/fa6"
import { KomikCardSkeleton } from '@/components/ui/LoadingSkeleton';

const Popular = () => {
    const { data: popularData, loading: popularLoading, error: popularError, refetch: refetchPopular } = useKomikcastAPI(
        () => komikcastAPI.getPopular(),
        {
            cacheKey: 'komik_popular',
            cacheTTL: 30 * 60 * 1000, // 30 minutes
            enableCache: true,
        }
    );

    // Prepare items for batch fetching (limit to first 9 comics)
    const comicsToFetch = useMemo(() => {
        if (!popularData || !Array.isArray(popularData) || popularData.length === 0) {
            return [];
        }
        return popularData.slice(0, 9).map(komik => {
            const href = komik.href || komik.link || komik.url || '';
            const endpoint = safeEndpoint(href);
            return { ...komik, endpoint };
        }).filter(komik => komik.endpoint);
    }, [popularData]);

    // Batch fetch details with rate limiting
    const fetchDetail = useMemo(() => async (komik) => {
        if (!komik.endpoint) {
            return null;
        }
        try {
            const detailResponse = await komikcastAPI.getDetail(komik.endpoint, {
                enableDeduplication: true,
            });
            return extractApiData(detailResponse);
        } catch (error) {
            console.warn(`Failed to fetch detail for ${komik.title}:`, error);
            return null;
        }
    }, []);

    const { data: batchResults, loading: loadingDetails } = useBatchFetch(
        comicsToFetch,
        fetchDetail,
        {
            batchSize: 3, // Fetch 3 at a time
            delay: 150, // 150ms delay between batches
            enabled: comicsToFetch.length > 0,
        }
    );

    // Merge popular data with detail data
    const enrichedData = useMemo(() => {
        if (!batchResults || batchResults.length === 0) {
            // Return original data with defaults if batch fetch hasn't completed
            return comicsToFetch.map(komik => ({
                ...komik,
                thumbnail: '',
                rating: '0',
                latestChapter: 'N/A',
            }));
        }

        return batchResults.map(({ item: komik, result: detailData }) => {
            if (!detailData) {
                return {
                    ...komik,
                    thumbnail: '',
                    rating: '0',
                    latestChapter: 'N/A',
                };
            }

            const cleanChapter = extractChapter(
                detailData?.chapter || detailData?.latestChapter,
                'N/A'
            );
            const normalizedRating = extractRating(detailData?.rating, '0');

            return {
                ...komik,
                title: detailData?.title || komik.title || 'Untitled',
                thumbnail: detailData?.thumbnail || '',
                rating: normalizedRating,
                latestChapter: cleanChapter,
            };
        });
    }, [batchResults, comicsToFetch]);

    const loading = popularLoading || loadingDetails;
    const error = popularError;
    const data = enrichedData.length > 0 ? enrichedData : (popularData?.slice(0, 9) || []);

    if (loading) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Populer</span>
                <KomikCardSkeleton count={5} className="py-2" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Populer</span>
                <div className="flex items-center justify-center py-4">
                    <p className="text-red-500 text-center mb-2">{error}</p>
                    <button
                        onClick={refetchPopular}
                        className="bg-my text-black font-medium px-4 py-2 rounded-lg hover:bg-opacity-80"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Populer</span>
                <div className="flex items-center justify-center py-4">
                    <p className="text-gray-500 text-center">Tidak ada komik populer</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2">
            <span className="py-2 text-2xl font-extrabold">Komik Populer</span>
            <div className="flex items-center scroll-page gap-2 py-2">
                {data.map((komik, index) => {
                    const title = safeStringTrim(komik.title, 'Untitled');
                    const thumbnail = safeImageUrl(komik.thumbnail || komik.imageSrc || komik.image);                                                           
                    const endpoint = safeEndpoint(komik.endpoint || komik.href || komik.link || komik.url);                                                     
                    const rating = extractRating(komik.rating, '0');
                    const cleanChapter = extractChapter(
                        komik.latestChapter || komik.chapter,
                        'N/A'
                    );

                    return (
                        <NavLink
                            className="relative bg-cover inner-shadow-bottom w-auto min-w-[130px] md:min-w-[250px] h-[170px] md:h-[170px] rounded-lg cursor-pointer overflow-hidden"
                            style={{
                                backgroundImage: `url(${thumbnail})`,
                                boxShadow: 'inset 0 -40px 20px rgba(0, 0, 0, 0.9)'
                            }}
                            to={`/komik/${endpoint}`}
                            key={endpoint || index}
                        >
                            <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">
                                Ch. {cleanChapter}
                            </span>
                            <div className="absolute bottom-0 left-0 p-1">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1">
                                        <FaStar className="text-yellow-300 text-xs z-50" />
                                        <span className="text-white text-xs font-medium z-50">{rating.slice(0, 3)}</span>
                                    </div>
                                    <span className="text-white text-sm font-semibold line-clamp-2">{title}</span>
                                </div>
                            </div>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    )
}

export default Popular