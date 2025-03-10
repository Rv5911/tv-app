import { Loader } from "../components/Loader.js";
import { getData } from "../utils/parseM3U.js";

function MoviesPage() {
    setTimeout(fetchMoviesData, 0); // Ensure it runs after rendering

    return `
        <div class="movies-page">
            <h1>Movies</h1>
      
        </div>
    `;
}

async function fetchMoviesData() {
    const loadingElement = document.getElementsByClassName("loader-container");
    
    if (!loadingElement) {
        console.error("Loading element not found");
        return;
    }

    loadingElement.style.display = "block"; // Show loading text

    try {
        const data = await getData("movies");
        console.log(data, "Movies Data");
        
        // Hide loading text
        loadingElement.style.display = "none";

        // Display movies data
        displayMovies(data);
    } catch (error) {
        console.error("Error fetching movies:", error);
        loadingElement.innerText = "Failed to load movies.";
    }
}

// Function to display movies in the DOM
function displayMovies(movies) {
    const moviesContainer = document.querySelector(".movies-page");
    if (!moviesContainer) return;

    let movieHTML = movies.map(movie => `
        <div class="movie">
            <img src="${movie.logo || 'placeholder.jpg'}" alt="${movie.title}">
            <p>${movie.title}</p>
        </div>
    `).join("");

    moviesContainer.innerHTML += `<div class="movies-list">${movieHTML}</div>`;
}

export default MoviesPage;