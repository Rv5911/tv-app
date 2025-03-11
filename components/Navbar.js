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
                <img src="public/assets/logo.png" 
                     alt="logo">
            </div>
            <nav class="navbar">
                <a href="#/" data-link class="nav-item">Home</a>
                <a href="#/movies" data-link class="nav-item">Movies</a>
                <a href="#/series" data-link class="nav-item">Series</a>
                <a href="#/live-tv" data-link class="nav-item">Live TV</a>
                <a href="#/settings" data-link class="nav-item">Settings</a>
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
        
        // First, get the current route to maintain the active state
        const currentRoute = window.location.hash.slice(1) || "/";
        
        navItems.forEach((item, index) => {
            const itemRoute = item.getAttribute('href').slice(1);
            
            // Remove focused class from all items
            item.classList.remove('focused');
            
            // Set active class based on current route
            if (itemRoute === currentRoute) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
            
            // Add focused class to the currently focused item when navbar is active
            if (isActive && index === currentIndex) {
                item.classList.add('focused');
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
    
    // Also update focus when hash changes
    window.addEventListener('hashchange', updateFocus);

    // Listen for the custom event from router.js
    document.addEventListener('navbar-route-changed', (event) => {
        if (event.detail && typeof event.detail.index === 'number') {
            currentIndex = event.detail.index;
            updateFocus();
        }
    });
}