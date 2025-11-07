import Recomend from "@/components/ListCard/Recomend"
import Update from "@/components/ListCard/Update"
import Popular from "@/components/ListCard/Popular"
import GenreList from "@/components/ListCard/GenreList"
import Viewed from "@/components/ListCard/Viewed"
import mY from "@/assets/20250128_230226.png"

const KomikList = () => {
    return (
        <div>
            <div className="flex flex-col items-center justify-center p-2">
                <div className="flex">
                    <img src={mY} alt="Eclipse" className="w-40 h-auto" />
                </div>
                <span className="text-xs -mt-0">Baca Komik Bahasa Indonesia</span>
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
