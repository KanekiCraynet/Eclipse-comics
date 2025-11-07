import { NavLink } from "react-router-dom"
import { useFetch } from "@/libs/api-libs"
import Loading from "@/components/Loading"

const Update = () => {
    const { data, loading, error, retry } = useFetch('popular', {
        cacheKey: 'manhwa-new',
        cacheExpiry: 2 * 60 * 1000 // 2 minutes
    });

    if (loading) {
        return <Loading />
    }

    if (error) {
        return (
            <div className="p-2">
                <span className="py-2 text-2xl font-extrabold">Komik Terbaru</span>
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
            <span className="py-2 text-2xl font-extrabold">Komik Terbaru</span>
            <div className="grid grid-cols-3 gap-2 py-2">
                {data.slice(0,21).map((komik, index) => (
                    <NavLink
                        className="relative bg-cover bg-center w-full h-[170px] md:h-[100px] rounded-sm cursor-pointer overflow-hidden"
                        style={{
                            backgroundImage: `url(${komik.imageSrc})`,
                            boxShadow: 'inset 0 -40px 20px rgba(0, 0, 0, 0.8)', // Menambahkan inner shadow dengan opasitas lebih rendah
                            borderRadius: '8px' // Menjaga border-radius tetap
                        }}
                        to={`/komik/${komik.link.split("/")[4]}`}
                        key={index}
                    >
                        <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">
                            {komik.chapters?.[0]?.chapterTitle 
                                ? `Ch. ${komik.chapters[0].chapterTitle.replace("Ch.", "")}` 
                                : "Ch. Error"}
                        </span>
                        <span className="absolute bottom-0 text-sm font-bold line-clamp-2 p-1">{komik.title}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    )
}

export default Update
