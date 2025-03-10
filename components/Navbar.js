import { navigateTo } from "../router/router.js";
import { registerRemoteNavigation, setActiveNavigation } from "./remoteNavigation.js";

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
    let isActive = true;
    let currentIndex = 0;

    function updateFocus() {
        const navItems = document.querySelectorAll(".nav-item");
        navItems.forEach((item, index) => {
            item.classList.remove('active', 'focused');
            if (isActive && index === currentIndex) {
                item.classList.add('active', 'focused');
            }
        });
    }

    function handleNavigation(event) {
        // Handle component switching
        if (event.type === 'component-switch') {
            isActive = event.active === 'navbar';
            updateFocus();
            return;
        }

        if (!isActive) return;

        const navItems = document.querySelectorAll(".nav-item");
        
        switch (event.key) {
            case 'ArrowRight':
                currentIndex = (currentIndex + 1) % navItems.length;
                break;
            case 'ArrowLeft':
                currentIndex = (currentIndex - 1 + navItems.length) % navItems.length;
                break;
            case 'Enter':
                navItems[currentIndex]?.click();
                break;
            default:
                return;
        }

        event.preventDefault();
        updateFocus();
    }

    registerRemoteNavigation("navbar", handleNavigation);

    // Handle click activation
    document.querySelector('.navbar').addEventListener('click', () => {
        isActive = true;
        setActiveNavigation('navbar');
        updateFocus();
    });

    // Initial focus
    updateFocus();
}