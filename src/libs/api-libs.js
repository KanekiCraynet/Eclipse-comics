import { useState, useEffect, useCallback } from "react"
import axios from "axios"

const useFetch = (route, options = {}) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = useCallback(async (retryCount = 0) => {
        setLoading(true)
        setError(null)

        // Check cache if enabled
        if (options.cacheKey) {
            const cachedData = localStorage.getItem(options.cacheKey)
            const cachedTime = localStorage.getItem(`${options.cacheKey}-time`)
            const currentTime = new Date().getTime()
            const cacheExpiryTime = options.cacheExpiry || 30 * 60 * 1000 // 30 minutes default

            if (cachedData && cachedTime && currentTime - cachedTime < cacheExpiryTime) {
                setData(JSON.parse(cachedData))
                setLoading(false)
                return
            }
        }

        try {
            const response = await axios.get(`https://api-komikcast.vercel.app/${route}`)
            let finalData
            // Validasi response
            if (response.data?.status === 'success' && Array.isArray(response.data?.data)) {
                finalData = response.data.data
            } else if (Array.isArray(response.data)) {
                // Jika langsung array (untuk backward compatibility)
                finalData = response.data
            } else {
                throw new Error('Format data tidak valid')
            }

            setData(finalData)

            // Save to cache if enabled
            if (options.cacheKey) {
                localStorage.setItem(options.cacheKey, JSON.stringify(finalData))
                localStorage.setItem(`${options.cacheKey}-time`, new Date().getTime())
            }
        } catch (err) {
            console.error("Error :", err)
            if (retryCount < (options.maxRetries || 3)) {
                // Retry mechanism
                setTimeout(() => fetchData(retryCount + 1), 1000 * (retryCount + 1))
            } else {
                setError(err.response?.data?.message || err.message || "Failed to fetch data")
                setData(null)
            }
        } finally {
            setLoading(false)
        }
    }, [route, options])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const retry = () => fetchData(0)

    return { data, loading, error, retry }
}

// Keep old hook for backward compatibility, but mark as deprecated
const useAnimeResponse = (route) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const FetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const response = await axios.get(`https://api-komikcast.vercel.app/${route}`)
                setData(response.data)
            } catch (err) {
                console.error("Error :", err)
                setError(err.message || "Failed to fetch data")
                setData(null)
            } finally {
                setLoading(false)
            }
        }
        FetchData()
    }, [route])

    return { data, loading, error }
}

export default useAnimeResponse
export { useFetch }
