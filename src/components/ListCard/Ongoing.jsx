import { NavLink } from "react-router-dom"
import { useState, useEffect } from "react"
import axios from "axios"

const Ongoing = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Cek apakah ada data yang sudah disimpan dalam localStorage dan belum expired
        const cachedData = localStorage.getItem('manhwa-ongoing');
        const cachedTime = localStorage.getItem('manhwa-ongoing-time');
        const currentTime = new Date().getTime();
        const cacheExpiryTime = 30 * 60 * 1000; // 30 menit

        if (cachedData && cachedTime && currentTime - cachedTime < cacheExpiryTime) {
            setData(JSON.parse(cachedData));
            setLoading(false);
        } else {
            // Ambil data dari API jika cache expired atau belum ada cache
            const fetchData = async () => {
                setLoading(true);
                try {
                    const response = await axios.get(`https://api-komikcast.vercel.app/ongoing`);
                    setData(response.data);
                    localStorage.setItem('manhwa-ongoing', JSON.stringify(response.data));
                    localStorage.setItem('manhwa-ongoing-time', currentTime);
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
        return <div></div> // Tidak menampilkan loading jika data dari cache
    }

    if (!data || !Array.isArray(data)) {
        return <div></div>;
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