import { useState, useEffect } from "react"
import { FaSearch } from "react-icons/fa"
import { useDebounceSearch } from "@/hooks/useDebounceSearch"
import ViewAll from "@/components/ViewAll"
import { KomikGridSkeleton } from "@/components/ui/LoadingSkeleton"
import { safeStringTrim, safeImageUrl, safeEndpoint } from "@/utils/apiHelpers"
import { NavLink } from "react-router-dom"

const SearchKomik = () => {
    const [inputKeyword, setInputKeyword] = useState("")
    const { keyword, data, loading, error, search, isValidSearch, hasResults } = useDebounceSearch(inputKeyword, {
        debounceMs: 300,
        minLength: 3,
        enableCache: true,
    })

    // Update search when input changes
    useEffect(() => {
        search(inputKeyword)
    }, [inputKeyword, search])

    const handleInputChange = (e) => {
        setInputKeyword(e.target.value)
    }
    
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault()
            // Search is already triggered by debounce
        }
    }
    
    return (
        <div className="p-2">
            <div className="flex items-center justify-center">
                <span className="text-2xl font-extrabold">Pencarian</span>
            </div>
            <div className="">
                <label className="relative block mx-1 my-4 bg-[#212121] border border-gray-800 rounded-lg">
                    <div className="flex items-center absolute rounded-l-lg inset-y-0 left-0 pl-2">
                        <FaSearch className={loading ? "animate-pulse" : ""} />
                    </div>
                    <input 
                        className="bg-[#212121] border-none block w-full rounded-lg pl-8 py-2 placeholder-sm focus:outline-none"
                        placeholder="Cari Komik Disini... (min. 3 karakter)"
                        value={inputKeyword}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                </label>
                {inputKeyword && !isValidSearch && (
                    <p className="text-xs text-gray-500 px-2 mt-1">
                        Masukkan minimal 3 karakter untuk mencari
                    </p>
                )}
            </div>

            {loading && isValidSearch && (
                <div className="py-2">
                    <KomikGridSkeleton count={6} />
                </div>
            )}

            {error && isValidSearch && (
                <div className="py-2 flex items-center justify-center min-h-[200px]">
                    <div className="text-center">
                        <p className="text-red-500 mb-2">Gagal memuat hasil pencarian</p>
                        <p className="text-gray-500 text-sm mb-4">{error}</p>
                    </div>
                </div>
            )}

            {!loading && !error && isValidSearch && hasResults && data && (
                <div className="py-2">
                    <div className="grid grid-cols-3 gap-2">
                        {data.seriesList.map((komik, index) => {
                            const title = safeStringTrim(komik.title, 'Untitled')
                            const thumbnail = safeImageUrl(komik.image || komik.imageSrc)
                            const endpoint = safeEndpoint(komik.url || komik.endpoint)
                            const latestChapter = safeStringTrim(komik.latestChapter, 'N/A')

                            return (
                                <NavLink
                                    className="relative bg-cover bg-center inner-shadow-bottom w-full h-[170px] md:h-[100px] rounded-sm cursor-pointer overflow-hidden"
                                    style={{backgroundImage: `url(${thumbnail})`}}
                                    to={`/komik/${endpoint}`}
                                    key={komik.endpoint || index}
                                >
                                    <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">
                                        Ch. {latestChapter.replace("Chapter", "").trim()}
                                    </span>
                                    <span className="absolute bottom-0 text-sm font-bold line-clamp-2 p-1">{title}</span>
                                </NavLink>
                            )
                        })}
                    </div>
                </div>
            )}

            {!loading && !error && isValidSearch && !hasResults && (
                <div className="py-2 flex items-center justify-center min-h-[200px]">
                    <p className="text-gray-500 text-center">Tidak ada hasil ditemukan</p>
                </div>
            )}

            {/* Fallback to ViewAll for backward compatibility if needed */}
            {!isValidSearch && inputKeyword.length > 0 && (
                <div className="py-2">
                    <p className="text-gray-500 text-sm text-center">
                        Ketik minimal 3 karakter untuk mencari
                    </p>
                </div>
            )}
        </div>
    )
}

export default SearchKomik