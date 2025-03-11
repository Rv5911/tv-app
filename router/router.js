let routes = {}; // Store routes globally

export function navigateTo(hash) {
    window.location.hash = hash; // Change the URL using hash
}

function router() {
    const path = window.location.hash.slice(1) || "/"; // Get hash route or default to "/"
    const app = document.getElementById("app");

    // Render the corresponding component or show 404
    if (routes[path]) {
        app.innerHTML = routes[path]();
    } else {
        app.innerHTML = routes["*"] ? routes["*"]() : "<h1>404 Not Found</h1>";
    }

    // Update Navbar Active Class (without re-rendering the navbar)
    updateActiveNav();
}

function updateActiveNav() {
    // Remove active class from all links
    document.querySelectorAll(".navbar a").forEach(link => {
        // Only remove the active class, preserve the focused class
        link.classList.remove("active");
    });

    // Find the matching route and set it active
    const activeRoute = window.location.hash.slice(1) || "/";
    const activeLink = document.querySelector(`.navbar a[href='#${activeRoute}']`);
    
    if (activeLink) {
        activeLink.classList.add("active");
        
        // Optionally, if we want to update the currentIndex in the remote navigation
        // We can dispatch a custom event
        const navItems = document.querySelectorAll(".navbar a");
        const index = Array.from(navItems).indexOf(activeLink);
        
        if (index !== -1) {
            const event = new CustomEvent('navbar-route-changed', { 
                detail: { index } 
            });
            document.dispatchEvent(event);
        }
    }
}

export function createRouter(userRoutes) {
    routes = userRoutes; // Store routes globally

    // Handle hash change event
    window.addEventListener("hashchange", router);

    // Initialize router when page loads
    window.addEventListener("DOMContentLoaded", router);
}