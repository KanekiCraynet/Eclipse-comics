import { NavLink } from "react-router-dom"
import { useState, useEffect } from "react"
import axios from "axios"
import { FaStar } from "react-icons/fa6"

const Populer = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Cek apakah ada data yang sudah disimpan dalam localStorage dan belum expired
        const cachedData = localStorage.getItem('manhwa-popular');
        const cachedTime = localStorage.getItem('manhwa-popular-time');
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
                    const response = await axios.get(`https://api-komikcast.vercel.app/popular`);
                    setData(response.data);
                    localStorage.setItem('manhwa-popular', JSON.stringify(response.data));
                    localStorage.setItem('manhwa-popular-time', currentTime);
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
        return <div></div>
    }

    if (!data || !Array.isArray(data)) {
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
