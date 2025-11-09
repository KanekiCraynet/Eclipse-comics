import { useState, useEffect, useRef } from "react"
import { FaSearch, FaStar, FaTimes, FaClock } from "react-icons/fa"
import { useDebounceSearch } from "@/hooks/useDebounceSearch"
import { KomikGridSkeleton } from "@/components/ui/LoadingSkeleton"
import { safeStringTrim, safeImageUrl, safeEndpoint } from "@/utils/apiHelpers"
import { getSearchHistory, addToSearchHistory, removeFromSearchHistory, getFilteredHistory } from "@/utils/searchHistory"
import { NavLink } from "react-router-dom"

const SearchKomik = () => {
    const [inputKeyword, setInputKeyword] = useState("")
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [searchHistory, setSearchHistory] = useState([])
    const searchInputRef = useRef(null)
    const autocompleteRef = useRef(null)
    
    const { data, loading, error, search, isValidSearch, hasResults } = useDebounceSearch(inputKeyword, {
        debounceMs: 300,
        minLength: 3,
        enableCache: true,
    })

    // Load search history
    useEffect(() => {
        setSearchHistory(getSearchHistory())
    }, [])

    // Update search when input changes
    useEffect(() => {
        if (inputKeyword.trim().length >= 3) {
            search(inputKeyword)
            setShowAutocomplete(false)
        } else {
            // Show autocomplete for short inputs
            const filtered = getFilteredHistory(inputKeyword)
            setSearchHistory(filtered)
            setShowAutocomplete(inputKeyword.length > 0 && filtered.length > 0)
        }
    }, [inputKeyword, search])

    // Close autocomplete when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                autocompleteRef.current &&
                !autocompleteRef.current.contains(event.target) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(event.target)
            ) {
                setShowAutocomplete(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleInputChange = (e) => {
        setInputKeyword(e.target.value)
        setSelectedIndex(-1)
    }

    const handleInputFocus = () => {
        if (inputKeyword.length > 0) {
            const filtered = getFilteredHistory(inputKeyword)
            setSearchHistory(filtered)
            setShowAutocomplete(filtered.length > 0)
        } else {
            const history = getSearchHistory()
            setSearchHistory(history)
            setShowAutocomplete(history.length > 0)
        }
    }
    
    const handleKeyDown = (event) => {
        if (showAutocomplete && searchHistory.length > 0) {
            if (event.key === "ArrowDown") {
                event.preventDefault()
                setSelectedIndex(prev => 
                    prev < searchHistory.length - 1 ? prev + 1 : prev
                )
            } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
            } else if (event.key === "Enter") {
                event.preventDefault()
                if (selectedIndex >= 0 && selectedIndex < searchHistory.length) {
                    handleSelectHistory(searchHistory[selectedIndex])
                } else if (isValidSearch) {
                    addToSearchHistory(inputKeyword)
                    setShowAutocomplete(false)
                }
            } else if (event.key === "Escape") {
                setShowAutocomplete(false)
                setSelectedIndex(-1)
            }
        } else if (event.key === "Enter" && isValidSearch) {
            addToSearchHistory(inputKeyword)
        }
    }

    const handleSelectHistory = (keyword) => {
        setInputKeyword(keyword)
        addToSearchHistory(keyword)
        setShowAutocomplete(false)
        setSelectedIndex(-1)
        searchInputRef.current?.blur()
    }

    const handleRemoveHistory = (e, keyword) => {
        e.stopPropagation()
        removeFromSearchHistory(keyword)
        setSearchHistory(getFilteredHistory(inputKeyword))
    }
    
    return (
        <div className="p-2">
            <div className="flex items-center justify-center">
                <span className="text-2xl font-extrabold">Pencarian</span>
            </div>
            <div className="relative">
                <label className="relative block mx-1 my-4 bg-[#212121] border border-gray-800 rounded-lg">
                    <div className="flex items-center absolute rounded-l-lg inset-y-0 left-0 pl-2">
                        <FaSearch className={loading ? "animate-pulse" : ""} />
                    </div>
                    <input 
                        ref={searchInputRef}
                        className="bg-[#212121] border-none block w-full rounded-lg pl-8 py-2 placeholder-sm focus:outline-none"
                        placeholder="Cari Komik Disini... (min. 3 karakter)"
                        value={inputKeyword}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleInputFocus}
                        autoComplete="off"
                    />
                </label>
                {inputKeyword && !isValidSearch && (
                    <p className="text-xs text-gray-500 px-2 mt-1">
                        Masukkan minimal 3 karakter untuk mencari
                    </p>
                )}
                
                {/* Autocomplete Dropdown */}
                {showAutocomplete && searchHistory.length > 0 && (
                    <div 
                        ref={autocompleteRef}
                        className="absolute top-full left-1 right-1 mt-1 bg-[#212121] border border-gray-800 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
                    >
                        {searchHistory.map((item, index) => (
                            <div
                                key={index}
                                className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-[#171717] transition-colors ${
                                    selectedIndex === index ? 'bg-[#171717]' : ''
                                }`}
                                onClick={() => handleSelectHistory(item)}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FaClock className="text-gray-400 text-xs flex-shrink-0" />
                                    <span className="text-sm text-white truncate">{item}</span>
                                </div>
                                <button
                                    onClick={(e) => handleRemoveHistory(e, item)}
                                    className="ml-2 p-1 hover:bg-[#2a2a2a] rounded transition-colors flex-shrink-0"
                                    aria-label="Hapus dari riwayat"
                                >
                                    <FaTimes className="text-gray-400 text-xs" />
                                </button>
                            </div>
                        ))}
                    </div>
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
                            const thumbnail = safeImageUrl(komik.thumbnail || komik.image || komik.imageSrc)
                            const endpoint = safeEndpoint(komik.endpoint || komik.url || komik.href)
                            const latestChapter = safeStringTrim(komik.latestChapter || komik.chapter, 'N/A')
                            const rating = komik.rating || komik.score || '0'

                            return (
                                <NavLink
                                    className="relative bg-cover bg-center inner-shadow-bottom w-full h-[170px] md:h-[100px] rounded-sm cursor-pointer overflow-hidden"
                                    style={{backgroundImage: `url(${thumbnail})`}}
                                    to={`/komik/${endpoint}`}
                                    key={komik.endpoint || index}
                                >
                                    <span className="absolute top-0 left-0 bg-blue-500 text-white text-xs font-bold rounded-br-xl px-2 py-1">
                                        Ch. {latestChapter.replace("Chapter", "").trim()}
                                    </span>
                                    <div className="absolute top-[107px] left-0 flex items-center gap-1 p-1">
                                        <FaStar className="text-yellow-300 text-xs z-50" />
                                        <span className="text-white text-xs font-medium z-50">{rating}</span>
                                    </div>
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