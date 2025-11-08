import { FaFacebook, FaInstagram } from "react-icons/fa"

const Info = () => {
    return (
        <div className="p-2">
            <div className="flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold">Information</span>
            </div>
            <div className="flex flex-col px-2 pt-6 gap-4">
                <p className="text-gray-300 leading-relaxed">
                    Selamat datang di ZeroNime. Website baca komik online yang berisi berbagai koleksi manhua, manhwa, dan manga dengan terjemahan Bahasa Indonesia berkualitas. Nikmati pengalaman membaca komik favorit kamu dengan fitur yang mudah digunakan dan tampilan yang nyaman di semua perangkat.
                </p>
                <div className="flex flex-col gap-3">
                    <span className="text-lg font-semibold text-white">Kontak Saya</span>
                    <a 
                        className="flex items-center gap-2 text-gray-300 hover:text-blue-500 transition-colors" 
                        href="https://www.facebook.com/fallxavier.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FaFacebook className="text-xl" />
                        <span className="text-sm">https://www.facebook.com/fallxavier.xyz</span>
                    </a>
                    <a 
                        className="flex items-center gap-2 text-gray-300 hover:text-blue-500 transition-colors" 
                        href="https://www.instagram.com/reinxou"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FaInstagram className="text-xl" />
                        <span className="text-sm">https://www.instagram.com/reinxou</span>
                    </a>
                </div>
            </div>
        </div>
    )
}

export default Info