import { NavLink } from "react-router-dom"
import { useFetch } from "@/libs/api-libs"
import { FaStar } from "react-icons/fa6"

const Populer = () => {
    const { data, loading, error, retry } = useFetch('popular', {
        cacheKey: 'manhwa-popular',
        cacheExpiry: 2 * 60 * 1000 // 2 minutes
    });

    if (loading) {
        return <div></div>
    }

    if (error) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Populer</span>
                <div className="flex items-center justify-center py-4">
                    <p className="text-red-500 text-center mb-2">{error}</p>
                    <button
                        onClick={retry}
                        className="bg-my text-black font-medium px-4 py-2 rounded-lg hover:bg-opacity-80"
                    >
                        Try Again
                    </button>
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
                {data.map((komik, index) => (
                    <NavLink
                        className="relative bg-cover inner-shadow-bottom w-auto min-w-[100px] md:min-w-[144px] h-[144px] md:h-[192px] rounded-lg cursor-pointer overflow-hidden"
                        style={{
                            backgroundImage: `url(${komik.imageSrc.split("?resize")[0]})`,
                            boxShadow: 'inset 0 -40px 20px rgba(0, 0, 0, 0.9)'
                        }}
                        to={`/komik/${komik.link.split("/")[4]}`}
                        key={index}
                    >
                        <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">Ch. {komik.chapter.replace("Chapter", "")}</span>
                        <div className="absolute bottom-0 left-0 p-1">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                    <FaStar className="text-yellow-300 text-xs z-50" />
                                    <span className="text-white text-xs font-medium z-50">{komik.rating.slice(0, 3)}</span>
                                </div>
                                <span className="text-white text-sm font-semibold line-clamp-2">{komik.title}</span>
                            </div>
                        </div>
                    </NavLink>
                ))}
            </div>
        </div>
    )
}

export default Populer
