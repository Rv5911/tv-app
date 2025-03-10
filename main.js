import { createRouter } from "./router/router.js";
import Navbar from "./components/Navbar.js";
import NotFoundPage from "./pages/NotFoundPage.js";
import SearchPage from "./pages/SearchPage.js";
import MoviesPage from "./pages/MoviesPage.js";
import SeriesPage from "./pages/SeriesPage.js";
import LiveTvPage from "./pages/LiveTvPage.js";
import { getAllMacIds, getDeviceMacId, getM3UUrl } from "./api/apiFunctions.js";

// Define routes
const routes = {
    "/": SearchPage,
    "/movies": MoviesPage,
    "/series": SeriesPage,
    "/live-tv": LiveTvPage,
    "*": NotFoundPage,
};

// Render navbar
document.body.insertAdjacentHTML("afterbegin", Navbar());

// Initialize the router
createRouter(routes);

window.onload = async function () {
    try {
        const deviceMacId = localStorage.getItem("deviceMacId"); 

        const results = await Promise.allSettled([
            getAllMacIds(),
            getDeviceMacId(),
            getM3UUrl(deviceMacId)
        ]);

        // Handle API responses
        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                console.log(`API ${index + 1} success:`, result.value);
            } else {
                console.error(`API ${index + 1} failed:`, result.reason);
            }
        });
    } catch (error) {
        console.error("Error in page load fetching:", error);
    }
};