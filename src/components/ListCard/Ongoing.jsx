import { NavLink } from "react-router-dom"
import { useFetch } from "@/libs/api-libs"

const Ongoing = () => {
    const { data, loading, error, retry } = useFetch('ongoing', {
        cacheKey: 'manhwa-ongoing',
        cacheExpiry: 30 * 60 * 1000 // 30 minutes
    });

    if (loading) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Ongoing</span>
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-my"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Ongoing</span>
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

    if (!Array.isArray(data) || data.length === 0) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Ongoing</span>
                <div className="flex items-center justify-center py-4">
                    <p className="text-gray-500 text-center">No ongoing comics available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2">
            <span className="py-2 text-2xl font-extrabold">Komik Ongoing</span>
            <div className="flex items-center scroll-page gap-2 py-2">
                {data.map((komik, index) => (
                    <NavLink
                        className="relative bg-cover inner-shadow-bottom w-auto min-w-[130px] md:min-w-[250px] h-[170px] md:h-[170px] rounded-lg cursor-pointer overflow-hidden"
                        style={{
                            backgroundImage: `url(${komik.imageUrl.split("?resize")[0]})`,
                            boxShadow: 'inset 0 -40px 20px rgba(0, 0, 0, 0.9)' // Opasitas shadow
                        }}
                        to={`/komik/${komik.link.split("/")[4]}`}
                        key={index}
                    >
                        <span className="absolute bottom-0 left-0 text-white text-sm font-semibold line-clamp-2 p-1">{komik.title}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    )
}

export default Ongoing