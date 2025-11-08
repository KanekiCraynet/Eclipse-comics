import Recomend from "@/components/ListCard/Recomend"
import Update from "@/components/ListCard/Update"
import Popular from "@/components/ListCard/Popular"
import GenreList from "@/components/ListCard/GenreList"
import Viewed from "@/components/ListCard/Viewed"

const KomikList = () => {
    return (
        <div>
            <div className="flex flex-col items-center justify-center p-4 pt-6">
                <div className="flex items-center gap-1">
                    <span className="text-4xl font-extrabold text-white">Zero</span>
                    <span className="text-4xl font-extrabold text-blue-500">Nime</span>
                </div>
                <span className="text-sm text-gray-400 mt-1">Baca Komik Bahasa Indonesia</span>
            </div>
            <Recomend />
            <Update />
            <Popular />
            <GenreList />
            <Viewed />
        </div>
    )
}

export default KomikList
