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

    // Update Navbar Active Class
    updateActiveNav();

    // Re-attach event listeners for internal navigation
    document.querySelectorAll("[data-link]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            navigateTo(event.target.getAttribute("href"));
        });
    });
}

function updateActiveNav() {
    // Remove active class from all links
    document.querySelectorAll(".navbar a").forEach(link => link.classList.remove("active"));

    // Find the matching route and set it active
    const activeRoute = window.location.hash.slice(1) || "/";
    document.querySelector(`.navbar a[href='#${activeRoute}']`)?.classList.add("active");
}

export function createRouter(userRoutes) {
    routes = userRoutes; // Store routes globally

    // Handle hash change event
    window.addEventListener("hashchange", router);

    // Initialize router when page loads
    window.addEventListener("DOMContentLoaded", router);
}