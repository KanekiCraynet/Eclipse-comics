import React, { useState, useEffect } from "react"
import { NavLink } from "react-router-dom"
import { useKomikcastAPI } from "@/hooks/useKomikcastAPI"
import { komikcastAPI } from "@/services/api"
import { safeStringTrim, safeImageUrl, safeEndpoint, extractApiData } from "@/utils/apiHelpers"
import { FaStar } from "react-icons/fa6"
import { KomikCardSkeleton } from "@/components/ui/LoadingSkeleton"
import { memo } from "react"

const Populer = () => {
    // Fetch popular comics list
    const { data: popularData, loading: popularLoading, error: popularError, refetch: refetchPopular } = useKomikcastAPI(
        () => komikcastAPI.getPopular(),
        {
            cacheKey: 'komik_popular',
            cacheTTL: 30 * 60 * 1000, // 30 minutes
            enableCache: true,
        }
    );

    const [enrichedData, setEnrichedData] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Fetch detail data for each popular comic to get thumbnail, rating, and chapter
    // Note: /popular endpoint only returns title, href, genre, year - we need to fetch details
    useEffect(() => {
        if (!popularData || !Array.isArray(popularData) || popularData.length === 0) {
            setEnrichedData([]);
            return;
        }

        const fetchDetails = async () => {
            setLoadingDetails(true);
            try {
                // Limit to first 9 comics to avoid too many API calls
                const comicsToFetch = popularData.slice(0, 9);
                
                // Fetch details in parallel
                const detailPromises = comicsToFetch.map(async (komik) => {
                    try {
                        // Extract endpoint from href (e.g., "/murim-login/" -> "murim-login")
                        const href = komik.href || komik.link || komik.url || '';
                        const endpoint = safeEndpoint(href);
                        
                        if (!endpoint) {
                            return {
                                ...komik,
                                endpoint: '',
                                thumbnail: '',
                                rating: '0',
                                latestChapter: 'N/A',
                            };
                        }
                        
                        const detailResponse = await komikcastAPI.getDetail(endpoint, {
                            enableDeduplication: true,
                        });
                        const detailData = extractApiData(detailResponse);
                        
                        // Extract chapter from chapter array (first item is latest)
                        const latestChapter = detailData?.chapter?.[0]?.title || 
                                            detailData?.latestChapter || 
                                            'N/A';
                        
                        // Clean chapter string
                        const cleanChapter = String(latestChapter)
                            .replace(/^Ch\.?\s*/i, '')
                            .replace(/^Chapter\s*/i, '')
                            .trim() || 'N/A';
                        
                        // Merge popular data with detail data
                        return {
                            ...komik,
                            title: detailData?.title || komik.title || 'Untitled',
                            thumbnail: detailData?.thumbnail || '',
                            rating: detailData?.rating || '0',
                            latestChapter: cleanChapter,
                            endpoint: endpoint,
                        };
                    } catch (error) {
                        // If detail fetch fails, return original data with defaults
                        console.warn(`Failed to fetch detail for ${komik.title}:`, error);
                        const href = komik.href || komik.link || komik.url || '';
                        const endpoint = safeEndpoint(href);
                        return {
                            ...komik,
                            endpoint: endpoint,
                            thumbnail: '',
                            rating: '0',
                            latestChapter: 'N/A',
                        };
                    }
                });

                const enriched = await Promise.all(detailPromises);
                setEnrichedData(enriched);
            } catch (error) {
                console.error('Error fetching comic details:', error);
                // Fallback to original data if all fails
                setEnrichedData(popularData.slice(0, 9).map(komik => {
                    const href = komik.href || komik.link || komik.url || '';
                    const endpoint = safeEndpoint(href);
                    return {
                        ...komik,
                        endpoint: endpoint,
                        thumbnail: '',
                        rating: '0',
                        latestChapter: 'N/A',
                    };
                }));
            } finally {
                setLoadingDetails(false);
            }
        };

        fetchDetails();
    }, [popularData]);

    const loading = popularLoading || loadingDetails;
    const error = popularError;
    const data = enrichedData.length > 0 ? enrichedData : (popularData || []);

    if (loading) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Populer</span>
                <KomikCardSkeleton count={5} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Populer</span>                                                                             
                <div className="flex items-center justify-center py-4">
                    <div className="text-center">
                        <p className="text-red-500 text-center mb-2">{error}</p>
                        <button
                            onClick={refetchPopular}
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
            <span className="py-2 text-2xl font-extrabold">Komik Populer</span>
            <div className="flex items-center scroll-page gap-2 py-2">
                {data.map((komik, index) => {
                    const title = safeStringTrim(komik.title, 'Untitled');
                    const thumbnail = safeImageUrl(komik.thumbnail || komik.imageSrc || komik.image);                                                           
                    const endpoint = safeEndpoint(komik.endpoint || komik.href || komik.link || komik.url);                                                                   
                    const rating = String(komik.rating || '0');
                    const chapter = safeStringTrim(komik.latestChapter || komik.chapter, 'N/A');                                                                

                    // Clean chapter string
                    const cleanChapter = String(chapter)
                        .replace(/^Ch\.?\s*/i, '')
                        .replace(/^Chapter\s*/i, '')
                        .trim() || 'N/A';

                    return (
                        <NavLink
                            className="relative bg-cover inner-shadow-bottom w-auto min-w-[100px] md:min-w-[144px] h-[144px] md:h-[192px] rounded-lg cursor-pointer overflow-hidden"                                                            
                            style={{
                                backgroundImage: `url(${thumbnail})`,
                                boxShadow: 'inset 0 -40px 20px rgba(0, 0, 0, 0.9)'                                                                              
                            }}
                            to={`/komik/${endpoint}`}
                            key={endpoint || index}
                        >
                            <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">Ch. {cleanChapter}</span>                                                       
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

export default memo(Populer)
