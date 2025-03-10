export default function Navbar() {
    return `
        <nav class="navbar">
            <a href="#/" data-link class="${isActive('/')}">Home</a>
            <a href="#/movies" data-link class="${isActive('/movies')}">Movies</a>
            <a href="#/series" data-link class="${isActive('/series')}">Series</a>
            <a href="#/live-tv" data-link class="${isActive('/live-tv')}">Live TV</a>
        </nav>
    `;
}

// ✅ Function to check if the current route matches and return "active"
function isActive(route) {
    return window.location.hash === `#${route}` ? "active" : "";
}

// ✅ Listen for hash change to update the navbar on route changes
window.addEventListener("hashchange", () => {
    document.querySelector(".navbar").innerHTML = Navbar();
});