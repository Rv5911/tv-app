export default function Navbar() {
    return `
        <nav class="navbar">
            <a href="/" data-link>Home</a>
            <a href="/movies" data-link>Movies</a>
            <a href="/series" data-link>Series</a>
            <a href="/live-tv" data-link>Live TV</a>
        </nav>
        <style>
            .navbar {
                display: flex;
                justify-content: center;
                background: #333;
                padding: 10px;
            }
            .navbar a {
                color: white;
                padding: 10px 20px;
                text-decoration: none;
            }
            .navbar a:hover {
                background: #555;
            }
        </style>
    `;
}