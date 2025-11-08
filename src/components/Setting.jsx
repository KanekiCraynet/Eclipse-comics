import { useState } from "react";
import { useReadingPreferences, READING_MODES, READING_DIRECTIONS } from "@/hooks/useReadingPreferences";
import { FaMoon, FaSun, FaBook, FaImage, FaBars, FaArrowLeft, FaArrowRight, FaTrash } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import cacheManager from "@/services/cacheManager";

const Setting = () => {
    const navigate = useNavigate();
    const { preferences, updatePreference, resetPreferences } = useReadingPreferences();
    const { success, error: showError } = useToast();
    const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);

    const handleClearCache = () => {
        try {
            cacheManager.clear();
            setShowClearCacheConfirm(false);
            success("Cache berhasil dibersihkan");
        } catch (err) {
            console.error("Error clearing cache:", err);
            showError("Gagal membersihkan cache");
        }
    };

    return (
        <div className="p-4 min-h-screen">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#212121] rounded-lg">
                    <FaArrowLeft className="text-xl" />
                </button>
                <h1 className="text-2xl font-extrabold">Pengaturan</h1>
            </div>

            {/* Reading Mode */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Mode Baca</h2>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => updatePreference('readingMode', READING_MODES.WEBTOON)}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            preferences.readingMode === READING_MODES.WEBTOON
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#212121] hover:bg-[#171717]'
                        }`}
                    >
                        <FaBars className="text-xl" />
                        <div className="flex-1 text-left">
                            <div className="font-semibold">Webtoon</div>
                            <div className="text-xs opacity-75">Gulir vertikal penuh layar</div>
                        </div>
                    </button>
                    <button
                        onClick={() => updatePreference('readingMode', READING_MODES.MANGA)}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            preferences.readingMode === READING_MODES.MANGA
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#212121] hover:bg-[#171717]'
                        }`}
                    >
                        <FaBook className="text-xl" />
                        <div className="flex-1 text-left">
                            <div className="font-semibold">Manga</div>
                            <div className="text-xs opacity-75">Halaman terpusat dengan lebar maksimal</div>
                        </div>
                    </button>
                    <button
                        onClick={() => updatePreference('readingMode', READING_MODES.LONG_STRIP)}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            preferences.readingMode === READING_MODES.LONG_STRIP
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#212121] hover:bg-[#171717]'
                        }`}
                    >
                        <FaImage className="text-xl" />
                        <div className="flex-1 text-left">
                            <div className="font-semibold">Long Strip</div>
                            <div className="text-xs opacity-75">Gambar panjang tanpa batas</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Reading Direction */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Arah Baca</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => updatePreference('readingDirection', READING_DIRECTIONS.LTR)}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                            preferences.readingDirection === READING_DIRECTIONS.LTR
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#212121] hover:bg-[#171717]'
                        }`}
                    >
                        <FaArrowLeft className="text-sm" />
                        <span className="font-semibold">Kiri ke Kanan</span>
                    </button>
                    <button
                        onClick={() => updatePreference('readingDirection', READING_DIRECTIONS.RTL)}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                            preferences.readingDirection === READING_DIRECTIONS.RTL
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#212121] hover:bg-[#171717]'
                        }`}
                    >
                        <FaArrowRight className="text-sm" />
                        <span className="font-semibold">Kanan ke Kiri</span>
                    </button>
                </div>
            </div>

            {/* Image Quality */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Kualitas Gambar</h2>
                <div className="flex flex-col gap-2">
                    {['auto', 'high', 'low'].map((quality) => (
                        <button
                            key={quality}
                            onClick={() => updatePreference('imageQuality', quality)}
                            className={`p-3 rounded-lg transition-colors text-left ${
                                preferences.imageQuality === quality
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-[#212121] hover:bg-[#171717]'
                            }`}
                        >
                            <div className="font-semibold capitalize">{quality === 'auto' ? 'Otomatis' : quality === 'high' ? 'Tinggi' : 'Rendah'}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Auto Load Next Chapter */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Auto Load Next Chapter</h2>
                <button
                    onClick={() => updatePreference('autoLoadNext', !preferences.autoLoadNext)}
                    className={`w-full p-3 rounded-lg transition-colors ${
                        preferences.autoLoadNext
                            ? 'bg-my text-black'
                            : 'bg-[#212121] hover:bg-[#171717]'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="font-semibold">Otomatis memuat chapter berikutnya</span>
                        <div className={`w-12 h-6 rounded-full transition-colors ${
                            preferences.autoLoadNext ? 'bg-black' : 'bg-gray-600'
                        }`}>
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                preferences.autoLoadNext ? 'translate-x-6' : 'translate-x-0.5'
                            } mt-0.5`} />
                        </div>
                    </div>
                </button>
            </div>

            {/* Dark Mode */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Tema</h2>
                <button
                    onClick={() => updatePreference('darkMode', !preferences.darkMode)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        preferences.darkMode
                            ? 'bg-my text-black'
                            : 'bg-[#212121] hover:bg-[#171717]'
                    }`}
                >
                    {preferences.darkMode ? (
                        <FaMoon className="text-xl" />
                    ) : (
                        <FaSun className="text-xl" />
                    )}
                    <span className="font-semibold">{preferences.darkMode ? 'Mode Gelap' : 'Mode Terang'}</span>
                </button>
            </div>

            {/* Clear Cache */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Cache</h2>
                {!showClearCacheConfirm ? (
                    <button
                        onClick={() => setShowClearCacheConfirm(true)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#212121] hover:bg-[#171717] transition-colors"
                    >
                        <FaTrash className="text-xl text-red-500" />
                        <span className="font-semibold">Bersihkan Cache</span>
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleClearCache}
                            className="flex-1 p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-semibold"
                        >
                            Ya, Hapus
                        </button>
                        <button
                            onClick={() => setShowClearCacheConfirm(false)}
                            className="flex-1 p-3 rounded-lg bg-[#212121] hover:bg-[#171717] transition-colors font-semibold"
                        >
                            Batal
                        </button>
                    </div>
                )}
            </div>

            {/* Reset Preferences */}
            <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Reset</h2>
                <button
                    onClick={resetPreferences}
                    className="w-full p-3 rounded-lg bg-[#212121] hover:bg-[#171717] transition-colors font-semibold"
                >
                    Reset ke Pengaturan Default
                </button>
            </div>
        </div>
    );
};

export default Setting;
