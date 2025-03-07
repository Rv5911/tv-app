export function navigateTo(url) {
    window.history.pushState(null, null, url);
    router();
}

export function createRouter(routes) {
    function router() {
        const path = window.location.pathname;
        const app = document.getElementById("app");

        // Render the corresponding component or show 404
        app.innerHTML = routes[path] ? routes[path]() : routes["*"]();

        // Attach event listeners after rendering new content
        document.querySelectorAll("[data-nav]").forEach((btn) => {
            btn.addEventListener("click", (event) => {
                event.preventDefault();
                navigateTo(event.target.dataset.nav);
            });
        });
    }

    // Handle back/forward navigation
    window.onpopstate = router;

    // Handle internal link clicks
    document.addEventListener("click", (event) => {
        if (event.target.matches("[data-link]")) {
            event.preventDefault();
            navigateTo(event.target.getAttribute("href"));
        }
    });

    // Initialize the router
    router();
}