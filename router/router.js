let routes = {}; // Store routes globally

export function navigateTo(url) {
    window.history.pushState(null, null, url); // Change the URL without reloading
    router(); // Re-render content
}

function router() {
    const path = window.location.pathname;
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
    const activeRoute = window.location.pathname;
    document.querySelector(`.navbar a[href='${activeRoute}']`)?.classList.add("active");
}

export function createRouter(userRoutes) {
    routes = userRoutes; // Store routes globally

    // Handle back/forward navigation
    window.onpopstate = router;

    // Ensure the router is initialized on page load
    window.addEventListener("DOMContentLoaded", router);
}
