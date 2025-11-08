import { Route, Routes, useLocation, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import "@/index.css"
import BottomNavbar from "@/components/BottomNavbar"
import Loading from "@/components/Loading"
import ErrorBoundary from "@/components/ErrorBoundary"
import { ToastContainer } from "@/components/ui/Toast"

const KomikList = lazy(() => import("@/components/KomikList"))
const SearchKomik = lazy(() => import("@/components/SearchKomik"))
const Bookmark = lazy(() => import("@/components/Bookmark"))
const History = lazy(() => import("@/components/History"))
const Info = lazy(() => import("@/components/Info"))
const Setting = lazy(() => import("@/components/Setting"))
const Genres = lazy(() => import("@/components/Genres"))
const KomikDetail = lazy(() => import("@/components/KomikDetail"))
const ChapterDetail = lazy(() => import("@/components/ChapterDetail"))

const App = () => {
    const location = useLocation()

    const shouldShowBottomNavBar = () => {
        // Paths where bottom navbar should be shown
        const pathsToShowNavbar = ["/", "/info", "/bookmark", "/history", "/search"]
        return (
            pathsToShowNavbar.some((path) => location.pathname.startsWith(path)) ||
            location.pathname.startsWith("/genres/")
        ) &&
            !location.pathname.startsWith("/komik/") && // Hide navbar in Komik details page
            !location.pathname.startsWith("/chapter/") // Hide navbar in Chapter details page
    }

    return (
        <div
            id="app"
            className={`min-h-screen bg-[#111111] text-white antialiased ${
                shouldShowBottomNavBar() ? "pb-[60px]" : "pb-0"
            }`}
        >
            <Suspense fallback={<Loading/>}> {/* Placeholder during component loading */}
                <Routes>
                    <Route path="/" element={<KomikList />} />
                    <Route path="/search" element={<SearchKomik />} />
                    <Route path="/bookmark" element={<Bookmark />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/info" element={<Info />} />
                    <Route path="/setting" element={<Setting />} />
                    <Route path="/genres/:genre" element={<Genres />} />
                    <Route path="/komik" element={<Navigate to="/" replace />} />
                    <Route path="/komik/:komik" element={<KomikDetail />} />
                    <Route path="/chapter/:chapter" element={<ChapterDetail />} />
                </Routes>
            </Suspense>
            {shouldShowBottomNavBar() && <BottomNavbar route={location} />}
            <ToastContainer />
        </div>
    )
}

const AppWrapper = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
export default AppWrapper
