import { createRouter } from "./router/router.js";
import Navbar from "./components/Navbar.js";
import NotFoundPage from "./pages/NotFoundPage.js";
import SearchPage from "./pages/SearchPage.js";
import MoviesPage from "./pages/MoviesPage.js";
import SeriesPage from "./pages/SeriesPage.js";
import LiveTvPage from "./pages/LiveTvPage.js";

// Define routes
const routes = {
    "/": SearchPage,
    "/movies": MoviesPage,
    "/series": SeriesPage,
    "/live-tv": LiveTvPage,
    "*": NotFoundPage, // Catch-all for 404 pages
};

// Render navbar
document.body.insertAdjacentHTML("afterbegin", Navbar());

// Initialize the router
createRouter(routes);