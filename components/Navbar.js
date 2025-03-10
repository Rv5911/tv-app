import { navigateTo } from "../router/router.js";
import { registerRemoteNavigation } from "./remoteNavigation.js";

export default function Navbar() {
    setTimeout(() => {
        handleLogoClick();
        handleRemoteNavigation(); // Register remote navigation for navbar
    }, 0);

    return `
        <div class="navbar-container">
            <div class="navbar-logo">
                <img src="https://static.vecteezy.com/system/resources/previews/009/024/527/non_2x/ott-logo-ott-letter-ott-letter-logo-design-initials-ott-logo-linked-with-circle-and-uppercase-monogram-logo-ott-typography-for-technology-business-and-real-estate-brand-vector.jpg" 
                     alt="logo">
            </div>
            <nav class="navbar">
                <a href="#/" data-link class="nav-item">Home</a>
                <a href="#/movies" data-link class="nav-item">Movies</a>
                <a href="#/series" data-link class="nav-item">Series</a>
                <a href="#/live-tv" data-link class="nav-item">Live TV</a>
            </nav>
        </div>
    `;
}

export const handleLogoClick = () => {
    const navLogo = document.querySelector(".navbar-logo img");
    if (navLogo) {
        navLogo.addEventListener("click", () => {
            navigateTo("#/");
        });
    }
};

// Handle TV Remote Navigation
function handleRemoteNavigation() {
    registerRemoteNavigation("navbar", (event) => {
        const navItems = document.querySelectorAll(".nav-item");
        let currentIndex = Array.from(navItems).findIndex((item) => item.classList.contains("active"));

        if (event.key === "ArrowRight") {
            currentIndex = (currentIndex + 1) % navItems.length;
        } else if (event.key === "ArrowLeft") {
            currentIndex = (currentIndex - 1 + navItems.length) % navItems.length;
        } else if (event.key === "Enter") {
            navItems[currentIndex]?.click();
        }

        // Highlight the active item
        navItems.forEach((item) => item.classList.remove("active"));
        navItems[currentIndex]?.classList.add("active");
    });
}