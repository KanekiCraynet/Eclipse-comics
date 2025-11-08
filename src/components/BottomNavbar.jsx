import { NavLink } from "react-router-dom"
import { FaHome, FaSearch, FaHistory } from "react-icons/fa"
import { FaBookmark, FaCircleInfo } from "react-icons/fa6"
import PropTypes from "prop-types"

const BottomNavbar = ({ route }) => {
    if (!route || !route.pathname) {
        console.warn('BottomNavbar: route.pathname is required');
        return null;
    }
    const getActive = (now) => (now === route.pathname ? "active" : "")

    return (
        <div className="fixed bottom-0 w-full h-14 z-50 bg-[#111111] flex items-center justify-around border-t border-gray-800">
            <div className="container flex justify-around items-center w-full h-full">
                <NavLink to="/" className={`nav-links relative flex items-center justify-center flex-1 h-full ${getActive("/")}`}>
                    <FaHome className="text-xl" />
                </NavLink>
                <NavLink to="/search" className={`nav-links relative flex items-center justify-center flex-1 h-full ${getActive("/search")}`}>
                    <FaSearch className="text-xl" />
                </NavLink>
                <NavLink to="/bookmark" className={`nav-links relative flex items-center justify-center flex-1 h-full ${getActive("/bookmark")}`}>
                    <FaBookmark className="text-xl" />
                </NavLink>
                <NavLink to="/history" className={`nav-links relative flex items-center justify-center flex-1 h-full ${getActive("/history")}`}>
                    <FaHistory className="text-xl" />
                </NavLink>
                <NavLink to="/info" className={`nav-links relative flex items-center justify-center flex-1 h-full ${getActive("/info")}`}>
                    <FaCircleInfo className="text-xl" />
                </NavLink>
            </div>
        </div>
    )
}

BottomNavbar.propTypes = {
    route: PropTypes.shape({
        pathname: PropTypes.string.isRequired
    }).isRequired
}

export default BottomNavbar
