import { getData } from "../utils/parseM3U.js";
import { Loader, showLoader, hideLoader } from "../components/Loader.js";
import { registerRemoteNavigation, unregisterRemoteNavigation, setActiveNavigation } from "../components/remoteNavigation.js";
import { VideoPlayer } from "../components/VideoPlayer.js";

function MoviesPage() {
    setTimeout(() => {
        fetchMoviesData();
        setupRemoteNavigation();
    }, 0);

    return `
        <div class="movies-page">
            ${Loader()}
        </div>
    `;
}

function setupRemoteNavigation() {
    let currentGroupIndex = 0;
    let currentCardIndex = 0;
    let isActive = false;

    function updateFocus(forceActive = false) {
        // Remove existing focus
        document.querySelectorAll('.movie-card.focused, .group-title.focused')
            .forEach(el => el.classList.remove('focused'));

        if (!isActive && !forceActive) return;

        const groups = document.querySelectorAll('.movie-group');
        if (!groups.length) return;

        const currentGroup = groups[currentGroupIndex];
        const cards = currentGroup.querySelectorAll('.movie-card');

        // Update group focus
        currentGroup.querySelector('.group-title').classList.add('focused');

        // Update card focus
        if (cards.length) {
            currentCardIndex = Math.min(currentCardIndex, cards.length - 1);
            const currentCard = cards[currentCardIndex];
            currentCard.classList.add('focused');
            currentCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center' ,
                offsetTop: 100
            });
        }
    }

    function handleNavigation(event) {
        // Handle component switching
        if (event.type === 'component-switch') {
            isActive = event.active === 'movies-page';
            updateFocus();
            return;
        }

        if (!isActive) return;

        const groups = document.querySelectorAll('.movie-group');
        if (!groups.length) return;

        const currentGroup = groups[currentGroupIndex];
        const cards = currentGroup.querySelectorAll('.movie-card');

        switch (event.key) {
            case 'ArrowUp':
                if (currentGroupIndex > 0) {
                    currentGroupIndex--;
                    currentCardIndex = 0;
                }
                break;
            case 'ArrowDown':
                if (currentGroupIndex < groups.length - 1) {
                    currentGroupIndex++;
                    currentCardIndex = 0;
                }
                break;
            case 'ArrowLeft':
                if (currentCardIndex > 0) {
                    currentCardIndex--;
                }
                break;
            case 'ArrowRight':
                if (currentCardIndex < cards.length - 1) {
                    currentCardIndex++;
                }
                break;
            case 'Enter':
                if (cards[currentCardIndex]) {
                    const url = cards[currentCardIndex].dataset.url;
                    const title = cards[currentCardIndex].querySelector('.movie-title').textContent;
                    if (url) {
                        playVideo(url, title);
                    }
                }
                break;
            default:
                return;
        }

        event.preventDefault();
        updateFocus();
    }

    // Register navigation
    registerRemoteNavigation('movies-page', handleNavigation);

    // Handle click activation
    document.querySelector('.movies-page').addEventListener('click', () => {
        isActive = true;
        setActiveNavigation('movies-page');
        updateFocus();
    });

    // Export the focus update function so it can be called from outside
    window.updateMoviesFocus = () => {
        isActive = true;
        setActiveNavigation('movies-page');
        updateFocus(true);
    };

    return () => {
        unregisterRemoteNavigation('movies-page');
        delete window.updateMoviesFocus;
    };
}

// Function to play a video with the VideoPlayer component
function playVideo(url, title) {
    // Check if URL is valid
    if (!url || url.trim() === '') {
        alert('No valid video URL available for this movie.');
        return;
    }

    // Log the video URL for debugging
    console.log('Playing video:', title);
    console.log('Video URL:', url);

    // Try to validate the URL
    let videoUrl = url;
    
    // If URL doesn't start with http/https, try to add it
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('//')) {
            videoUrl = 'https:' + url;
        } else {
            videoUrl = 'https://' + url;
        }
        console.log('Modified URL to:', videoUrl);
    }

    // Use local subtitle files
    const subtitles = [
        {
            language: 'en',
            label: 'English',
            url: 'subtitles/english.vtt',
            default: true
        },
        {
            language: 'es',
            label: 'Spanish',
            url: 'subtitles/spanish.vtt',
            default: false
        }
    ];

    // Append the video player to the body directly
    document.body.insertAdjacentHTML('beforeend', VideoPlayer(videoUrl, title, subtitles));
}

async function fetchMoviesData() {
    showLoader();
    try {
        const data = await getData("movies");
        console.log(data?.slice(0, 10), "Movies Data");
        displayMoviesByGroup(data);
        hideLoader();
    } catch (error) {
        console.error("Error fetching movies:", error);
        hideLoader();
    }
}

// Function to group movies by their category
function groupMoviesByCategory(movies) {
    return movies.reduce((groups, movie) => {
        const group = movie.group || 'Other';
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(movie);
        return groups;
    }, {});
}

// Function to create movie card HTML
function createMovieCard(movie) {
    return `
        <div class="movie-card" data-url="${movie.url || ''}">
            <img 
                class="movie-image" 
                src="${movie.logo || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARMAAAC3CAMAAAAGjUrGAAAAMFBMVEXx8/XCy9K/yND09vfw8vTP1tzp7O/i5ure4+fO1dvJ0dfT2d/EzNPt7/Lb4OXo6+4FeM7UAAAFL0lEQVR4nO2c24KrIAxFLdha7///t0dxOlWDSiAKztnrbR4G6SoJBKHZA6zJYncgQeCEAicUOKHACQVOKHBCgRMKnFDghAInFDihwAkFTihwQoETCpxQ4IQCJxQ4ocAJBU4ocEKBEwqcUOCEAicUOKHACQVOKHBCgRMKnFDghAInFDihwAkFTihwQoETCpxQ4IQCJxQ4ocAJBU4ot3Oi1KMq64FnWTVq+EueWzlRquqKVn/J+/ezEfdyHydKPYtc62yF1m1Xymq5ixPVdDnx8eslf1eCVu7hRFXFppAfLW39kNJyByeqOTJirGTvRsbKDZyozsHIpKUQsZK8E1Vu55GTrKTuRL0ZRoyVLviZaTtRVctUMuaVOnCoJO1E1WwjxsorbGZO2Qk7br5WuhApKTvpfZWMy5WAoZKuk6b1NhI4VJJ10uRBSsas0ng+OlUnVaARw9NvqCTqRERJpt9eUtJ0IqPEN36SdNIIKRnIPeafFJ0Ep9c5mr+qTdFJ2CRMpLAn5fScqJeokrFWZkoRdaImwtpw2T9iSnnxuiDoRFXda6hK28JzWTA14ryBxKFlTT9iTlT1W57o3Lta96yED8krRieknCw/DDuEP1TnKBlgzMlCTtZDXr+8pIjOwitK5x7JOKFD3mukiE85ix45S5FxYll46prdiv8ekpsU19wv4kS9LV1ouQPlrPzKliIzTuw9YDYiVfgFSxFx8rR+wcyMomSX9HYpTjlFwonqrB3gBc/JyYQjRcRJYe8Ay4l9rMlLcVi8iTjp7Y/nOBHcMjngWEoi4+TUlcmKw9rnxHzCWMqeU/ltkB9JEZl3SusnYmwQn1fm2GgPeiOzZrM9WZfu/3/BNDznYATLOLENffep+JppeMZBMSZUF9N6ljFM7KF3qpTduBZyQj4W53XTiRsEm1L2dr2k9k9W9Rtjq2BrJj9Zyk7pI7bP9lw8kfH+4KIFLGF77Sa3R90Un0POvHNCcYzsLVMk9+2buni1bd9xjMSJHMPmjCz7zov/fidW5GQ7OS/2e8BoRrLtrBfXScTIMVLsk09cJxEjZ8I6+cR1EmG1tsRaDsZ0EjlyDL0leuxOpulD4JTALtfXORRbnqVO1LDOePdtpoclWPsqulL+wt0P0SNnxFKrrp2opmuXl+5OuHA3PSmByDGQ9ezSydYdM+ELd4YUIsdANnoWTva2RSUv3JlnJRE5I2RbY+6kee1+dTrrhC7cPTZeMUdivZnydaIc3tdqqWuI6USOYZlSfp0oxzVlJxNByUSOYZlSPk6cDzqEXy17JDTn/LBMKRlTSRZ4X2giep2zZnEwZHLiGjifFt6BTtKKHMMspUxO2BkvDzoDm1jkGGa7bsaJx0t9XfgrOfuMlhezwsc48RrKufvhyiXXHatg8T2Zkm0eHzluxO8W4pXHKljkXycBt3h9blFdeqyCx2fPOguLbn6qTWsBu+Czxs/CopsdP4kmkx+mcZ8FRrfuWUqSTSYT005keDucW4iXnzRhMg17iYacC6A0VyZzzIQs0pBrUrn22JoXY4Us0pDjaZMzb+dIMX6/Qi0dHSU0XHySz48heqSaOs60vsvlq2mtpzj9OCh/Trgjew7afgLar63d6ec2SmTZm37+UyV7048K+Gmkm7O10A/8aaSbY7sEr8rYvYoNnX4Sr3EuYJVpVc35Ccu/innZbryMJ1n4v9f4N9FZ39XPZ931GYzMGH9VPHYfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADp8Q9+nG9anuOrfAAAAABJRU5ErkJggg=='}" 
                alt="${movie.title}"
                onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARMAAAC3CAMAAAAGjUrGAAAAMFBMVEXx8/XCy9K/yND09vfw8vTP1tzp7O/i5ure4+fO1dvJ0dfT2d/EzNPt7/Lb4OXo6+4FeM7UAAAFL0lEQVR4nO2c24KrIAxFLdha7///t0dxOlWDSiAKztnrbR4G6SoJBKHZA6zJYncgQeCEAicUOKHACQVOKHBCgRMKnFDghAInFDihwAkFTihwQoETCpxQ4IQCJxQ4ocAJBU4ocEKBEwqcUOCEAicUOKHACQVOKHBCgRMKnFDghAInFDihwAkFTihwQoETCpxQ4IQCJxQ4ocAJBU4ot3Oi1KMq64FnWTVq+EueWzlRquqKVn/J+/ezEfdyHydKPYtc62yF1m1Xymq5ixPVdDnx8eslf1eCVu7hRFXFppAfLW39kNJyByeqOTJirGTvRsbKDZyozsHIpKUQsZK8E1Vu55GTrKTuRL0ZRoyVLviZaTtRVctUMuaVOnCoJO1E1WwjxsorbGZO2Qk7br5WuhApKTvpfZWMy5WAoZKuk6b1NhI4VJJ10uRBSsas0ng+OlUnVaARw9NvqCTqRERJpt9eUtJ0IqPEN36SdNIIKRnIPeafFJ0Ep9c5mr+qTdFJ2CRMpLAn5fScqJeokrFWZkoRdaImwtpw2T9iSnnxuiDoRFXda6hK28JzWTA14ryBxKFlTT9iTlT1W57o3Lta96yED8krRieknCw/DDuEP1TnKBlgzMlCTtZDXr+8pIjOwitK5x7JOKFD3mukiE85ix45S5FxYll46prdiv8ekpsU19wv4kS9LV1ouQPlrPzKliIzTuw9YDYiVfgFSxFx8rR+wcyMomSX9HYpTjlFwonqrB3gBc/JyYQjRcRJYe8Ay4l9rMlLcVi8iTjp7Y/nOBHcMjngWEoi4+TUlcmKw9rnxHzCWMqeU/ltkB9JEZl3SusnYmwQn1fm2GgPeiOzZrM9WZfu/3/BNDznYATLOLENffep+JppeMZBMSZUF9N6ljFM7KF3qpTduBZyQj4W53XTiRsEm1L2dr2k9k9W9Rtjq2BrJj9Zyk7pI7bP9lw8kfH+4KIFLGF77Sa3R90Un0POvHNCcYzsLVMk9+2buni1bd9xjMSJHMPmjCz7zov/fidW5GQ7OS/2e8BoRrLtrBfXScTIMVLsk09cJxEjZ8I6+cR1EmG1tsRaDsZ0EjlyDL0leuxOpulD4JTALtfXORRbnqVO1LDOePdtpoclWPsqulL+wt0P0SNnxFKrrp2opmuXl+5OuHA3PSmByDGQ9ezSydYdM+ELd4YUIsdANnoWTva2RSUv3JlnJRE5I2RbY+6kee1+dTrrhC7cPTZeMUdivZnydaIc3tdqqWuI6USOYZlSfp0oxzVlJxNByUSOYZlSPk6cDzqEXy17JDTn/LBMKRlTSRZ4X2giep2zZnEwZHLiGjifFt6BTtKKHMMspUxO2BkvDzoDm1jkGGa7bsaJx0t9XfgrOfuMlhezwsc48RrKufvhyiXXHatg8T2Zkm0eHzluxO8W4pXHKljkXycBt3h9blFdeqyCx2fPOguLbn6qTWsBu+Czxs/CopsdP4kmkx+mcZ8FRrfuWUqSTSYT005keDucW4iXnzRhMg17iYacC6A0VyZzzIQs0pBrUrn22JoXY4Us0pDjaZMzb+dIMX6/Qi0dHSU0XHySz48heqSaOs60vsvlq2mtpzj9OCh/Trgjew7afgLar63d6ec2SmTZm37+UyV7048K+Gmkm7O10A/8aaSbY7sEr8rYvYoNnX4Sr3EuYJVpVc35Ccu/innZbryMJ1n4v9f4N9FZ39XPZ931GYzMGH9VPHYfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADp8Q9+nG9anuOrfAAAAABJRU5ErkJggg=='"
            >
    
            <div class="movie-title-overlay">
             <div class="play-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                    </svg>
                </div>
                <h3>${movie.title}</h3>
                ${movie.group ? `<span class="overlay-group">${movie.group}</span>` : ''}
               
            </div>
        </div>
    `;
}

// Function to display movies grouped by category
function displayMoviesByGroup(movies) {
    const moviesContainer = document.querySelector(".movies-page");
    if (!moviesContainer) return;

    const groupedMovies = groupMoviesByCategory(movies);
    let allGroupsHTML = '';

    // Sort groups alphabetically
    Object.keys(groupedMovies).sort().forEach(groupName => {
        const moviesInGroup = groupedMovies[groupName];
        const groupHTML = `
            <div class="movie-group">
                <h2 class="group-title">${groupName}</h2>
                <div class="movies-list">
                    ${moviesInGroup.map(movie => createMovieCard(movie)).join('')}
                </div>
            </div>
        `;
        allGroupsHTML += groupHTML;
    });

    // Clear loader and add all groups
    moviesContainer.innerHTML = allGroupsHTML;

    // Add click event listeners to all movie cards
    const movieCards = moviesContainer.querySelectorAll('.movie-card');
    movieCards.forEach(card => {
        card.addEventListener('click', () => {
            const url = card.dataset.url;
            const title = card.querySelector('.movie-title').textContent;
            if (url) {
                playVideo(url, title);
            }
        });
    });

    // Set initial focus after a short delay to ensure DOM is ready
    setTimeout(() => {
        if (window.updateMoviesFocus) {
            window.updateMoviesFocus();
        }
    }, 100);
}

export default MoviesPage;