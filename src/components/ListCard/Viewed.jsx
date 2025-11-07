import { NavLink } from "react-router-dom"
import { useState, useEffect } from "react"
import axios from "axios"
import { FaStar } from "react-icons/fa6"
import LoadingMini from "@/components/LoadingMini"

const Viewed = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Cek apakah ada data yang sudah disimpan dalam localStorage dan belum expired
        const cachedData = localStorage.getItem('manhwa-recommendation');
        const cachedTime = localStorage.getItem('manhwa-recommendation-time');
        const currentTime = new Date().getTime();
        const cacheExpiryTime = 2 * 60 * 1000; // 2 menit

        if (cachedData && cachedTime && currentTime - cachedTime < cacheExpiryTime) {
            setData(JSON.parse(cachedData));
            setLoading(false);
        } else {
            // Ambil data dari API jika cache expired atau belum ada cache
            const fetchData = async () => {
                setLoading(true);
                try {
                    const response = await axios.get(`https://api-komikcast.vercel.app/recommended`);
                    setData(response.data);
                    localStorage.setItem('manhwa-recommendation', JSON.stringify(response.data));
                    localStorage.setItem('manhwa-recommendation-time', currentTime);
                } catch (error) {
                    console.error("Error :", error);
                    setData([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, []);

    if (loading) {
        return <LoadingMini />
    }

    if (!data || !Array.isArray(data)) {
        return <div></div>;
    }

    return (
        <div className="p-2">
            <span className="py-2 text-2xl font-extrabold">Komik Rekomendasi</span>
            <div className="flex items-center scroll-page gap-2 py-2">
                {data.map((komik, index) => (
                    <NavLink
                        className="relative bg-cover inner-shadow-bottom w-auto min-w-[107px] md:min-w-36 h-36 md:h-48 rounded-lg cursor-pointer overflow-hidden"
                        style={{backgroundImage: `url(${komik.imageSrc.split("?resize")[0]})`}}
                        to={`/komik/${komik.link.split("/")[4]}`}
                        key={index}
                    >
                        <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">Ch. {komik.chapter.replace("Chapter","")}</span>
                        <div className="absolute top-[76px] left-0 flex items-center gap-1 p-1">
                            <FaStar className="text-yellow-300 text-xs z-50" />
                            <span className="text-white text-xs font-medium z-50">{komik.rating.slice(0,3)}</span>
                        </div>
                        <span className="absolute bottom-0 text-white text-sm font-semibold line-clamp-2 p-1">{komik.title}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    )
}

export default Viewed
