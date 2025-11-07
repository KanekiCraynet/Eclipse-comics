import { NavLink } from "react-router-dom"
import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import { useFetch } from "@/libs/api-libs"
import Loading from "@/components/Loading"

const ViewAll = ({ url }) => {
    const [page, setPage] = useState(1)

    useEffect(() => {
        window.scrollTo({
            behavior: "smooth",
            top: 0
        })
    }, [page])

    const route = url.startsWith('genre/') ? `${url}?page=${page}` : url.startsWith('search/') ? `search?keyword=${url.split('/')[1]}` : `${url}/page/${page}`;
    const { data, loading, error, retry } = useFetch(route)

    if (loading) {
        return <Loading />
    }

    if (error) {
        return (
            <div className="py-2 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <p className="text-red-500 mb-2">Failed to load data</p>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
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

    if (!data || !data.seriesList || !Array.isArray(data.seriesList) || data.seriesList.length === 0) {
        return (
            <div className="py-2 flex items-center justify-center min-h-[200px]">
                <p className="text-gray-500 text-center">No data available</p>
            </div>
        );
    }
    
    return (
        <div className="py-2">
            <div className="grid grid-cols-3 gap-2">
                {data.seriesList.map((komik,index) => (
                    <NavLink
                        className="relative bg-cover bg-center inner-shadow-bottom w-full h-[170px] md:h-[100px] rounded-sm cursor-pointer overflow-hidden"
                        style={{backgroundImage: `url(${komik.image.split("?resize")[0]})` }}
                        to={`/komik/${komik.url.split("/")[4]}`}
                        key={index}
                    >
                        <span className="absolute top-0 left-0 bg-my text-black text-xs font-bold rounded-br-xl px-2 py-1">Ch. {komik.latestChapter.replace("Chapter","")}</span>
                        <span className="absolute bottom-0 text-sm font-bold line-clamp-2 p-1">{komik.title}</span>
                    </NavLink>
                ))}
            </div>
            <div className="flex items-center justify-center gap-2 py-4">
                {page === 1 ? null : (
                    <button
                        className="bg-my text-black font-medium px-2 py-1 rounded-lg"
                        onClick={() => setPage(page - 1)}
                    >
                        Prev
                    </button>
                )}
                <h3 className="bg-my text-black font-medium px-3 py-1 rounded-full">{page}</h3>
                {data?.pagination?.length > 0 ? (
                    <button
                        className="bg-my text-black font-medium px-2 py-1 rounded-lg"
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                    </button>
                ) : null}
            </div>
        </div>
    )
}

ViewAll.propTypes = {
    url: PropTypes.string.isRequired
}

export default ViewAll