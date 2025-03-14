//apiEnpoints.js file
// Get the current hostname dynamically
const hostname = window.location.hostname;
// Use the current hostname or fallback to the original IP if running locally
export const API_BASE_URL = hostname === 'localhost' || hostname === '127.0.0.1' 
    ? "http://localhost:3000" 
    : `http://${hostname}:3000`;

export const API_ENDPOINTS = {
    GET_DEVICE_MAC_ID: `${API_BASE_URL}/get-mac-address`,
    GET_M3U_URL: `${API_BASE_URL}/get-m3u`,
    GET_ALL_MAC_IDS: `${API_BASE_URL}/get-mac-ids`,
}


//parseM3u function file

  export async function parseM3UContent(m3uUrl) {
    try {
        console.log('Fetching M3U content from:', m3uUrl);
        
        // Add request options with CORS mode and credentials
        const options = {
            method: 'GET',
            mode: 'cors',
            credentials: 'same-origin',
            headers: {
                'Accept': 'text/plain',
                'Cache-Control': 'no-cache'
            }
        };
        
        // Try to fetch with the options
        let response;
        try {
            if(m3uUrl){
                
                response = await fetch(m3uUrl, options);
            }
        } catch (fetchError) {
            console.error('Initial fetch failed:', fetchError);
            
            // If the first attempt fails, try without credentials (for cross-origin)
            console.log('Retrying without credentials...');
            options.credentials = 'omit';
            if(m3uUrl){
                
                response = await fetch(m3uUrl, options);
            }
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch M3U content: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        if (!content || content.trim() === '') {
            throw new Error('Empty M3U content received');
        }
        
        console.log('M3U content fetched successfully, length:', content.length);

        const movies = [];
        const series = [];
        const liveTV = [];

        const lines = content.split('\n');
        let currentItem = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                const metadata = extractMetadata(line);
                currentItem = { ...metadata };
            } else if (line && !line.startsWith('#') && currentItem) {
                currentItem.url = line;

                if (line.includes('/movie/')) {
                    movies.push(currentItem);
                } else if (line.includes('/series/')) {
                    series.push(currentItem);
                } else {
                    liveTV.push(currentItem);
                }

                currentItem = null; 
            }
        }

        console.log(`Parsed ${movies.length} movies, ${series.length} series, ${liveTV.length} live TV channels`);

        // ✅ Ensure Database is Initialized Before Storing Data
        try {
            const db = await ensureDatabase();
            await storeData(db, 'movies', movies);
            await storeData(db, 'series', series);
            await storeData(db, 'liveTV', liveTV);
            console.log('Data stored in IndexedDB successfully');
        } catch (dbError) {
            console.error('Error storing data in IndexedDB:', dbError);
            // Continue even if database storage fails
        }

        return { movies, series, liveTV };
    } catch (error) {
        console.error('Error parsing M3U:', error);
        // Try to return any cached data if available
        try {
            const cachedMovies = await getData('movies');
            const cachedSeries = await getData('series');
            const cachedLiveTV = await getData('liveTV');
            
            if (cachedMovies.length > 0 || cachedSeries.length > 0 || cachedLiveTV.length > 0) {
                console.log('Returning cached data due to parsing error');
                return { 
                    movies: cachedMovies, 
                    series: cachedSeries, 
                    liveTV: cachedLiveTV,
                    fromCache: true
                };
            }
        } catch (cacheError) {
            console.error('Error retrieving cached data:', cacheError);
        }
        
        throw error;
    }
}

// ✅ Ensure IndexedDB is Initialized Correctly Before Any Read/Write
async function ensureDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ottdatabase', 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = (event) => {
            const db = event.target.result;

            // 🔹 Check if all object stores exist
            const requiredStores = ['movies', 'series', 'liveTV'];
            const missingStores = requiredStores.filter(store => !db.objectStoreNames.contains(store));

            if (missingStores.length > 0) {
                console.warn(`Missing object stores: ${missingStores.join(', ')}`);
                db.close();
                recreateDatabase().then(resolve).catch(reject);
            } else {
                resolve(db);
            }
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log("Creating object stores...");

            ['movies', 'series', 'liveTV'].forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'url' });
                }
            });
        };
    });
}

// ✅ Recreate Database If Stores Are Missing
function recreateDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase("ottdatabase");

        request.onsuccess = () => {
            console.log("Database deleted. Recreating...");
            const openRequest = indexedDB.open("ottdatabase", 1);

            openRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                ['movies', 'series', 'liveTV'].forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'url' });
                    }
                });
            };

            openRequest.onsuccess = (event) => resolve(event.target.result);
            openRequest.onerror = () => reject(openRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

// ✅ Store Data in IndexedDB
function storeData(db, storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(storeName)) {
            console.warn(`Object store "${storeName}" not found.`);
            return resolve();
        }

        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        store.clear(); // Remove old data

        data.forEach(item => store.add(item));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// ✅ Extract metadata like title, logo, duration, and group
function extractMetadata(extinfLine) {
    const metadata = {
        title: '',
        duration: 0,
        logo: '',
        group: '',
        tvgId: '',
        tvgName: '',
        tvgLanguage: '',
        tvgCountry: '',
        tvgShift: '',
        epg: '',
        metadata: extinfLine
    };

    const durationMatch = extinfLine.match(/#EXTINF:([\d-]+),/);
    if (durationMatch) metadata.duration = parseInt(durationMatch[1], 10);

    const titleMatch = extinfLine.match(/,(.*)$/);
    if (titleMatch) metadata.title = titleMatch[1];

    const attributes = {
        tvgId: /tvg-id="(.*?)"/,
        tvgName: /tvg-name="(.*?)"/,
        tvgLanguage: /tvg-language="(.*?)"/,
        tvgCountry: /tvg-country="(.*?)"/,
        tvgShift: /tvg-shift="(.*?)"/,
        epg: /tvg-epg="(.*?)"/,
        logo: /tvg-logo="(.*?)"/,
        group: /group-title="(.*?)"/
    };

    for (const key in attributes) {
        const match = extinfLine.match(attributes[key]);
        if (match) metadata[key] = match[1];
    }

    return metadata;
}

// ✅ Get Data from IndexedDB with Object Store Check
export function getData(storeName) {
    return new Promise((resolve, reject) => {
        ensureDatabase().then(db => {
            if (!db.objectStoreNames.contains(storeName)) {
                console.warn(`Object store "${storeName}" does not exist.`);
                return resolve([]);
            }

            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const getRequest = store.getAll();

            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        }).catch(reject);
    });
}

// apFunctions.js file

export async function getAllMacIds(){
   try {
    const response = await fetch(`${API_ENDPOINTS.GET_ALL_MAC_IDS}`);
    const data = await response.json();
    localStorage.setItem("allMacIds", JSON.stringify(data));
    return data;
   } catch (error) {
    console.error("Error fetching macids:", error);
    throw error;
   }
}

export async function getDeviceMacId(){
    try {
        const response = await fetch(`${API_ENDPOINTS.GET_DEVICE_MAC_ID}`);
        const data = await response.json();
        localStorage.setItem("deviceMacId", data?.macAddress);
        return data;
    } catch (error) {   
        console.error("Error fetching macid:", error);
        throw error;
    }
}

export async function getM3UUrl(macID){
    try {
        // If no macID is provided, try to get it from localStorage
        if(!macID){
            macID = localStorage.getItem("deviceMacId");
            
            // If still no macID, try to fetch the device's macID
            if (!macID) {
                const deviceData = await getDeviceMacId();
                macID = deviceData?.macAddress;
            }
            
            // If we still don't have a macID, throw an error
            if (!macID) {
                throw new Error("No MAC ID available");
            }
        }

        
        // Fetch the M3U URL using the macID
        const response = await fetch(`${API_ENDPOINTS.GET_M3U_URL}/${macID}`);
        
        // Check if the response is ok
        if (!response.ok) {
            throw new Error(`Failed to fetch M3U URL: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if we have a valid link
        if (!data.link) {
            throw new Error("No M3U link found in the response");
        }
        
        // Parse the M3U content
        try {
            await parseM3UContent(data.link);
        } catch (parseError) {
            console.error("Error parsing M3U content:", parseError);
            // Continue even if parsing fails, so the caller can still use the M3U URL
        }
        
        return data;
    } catch (error) {
        console.error("Error fetching m3u url:", error);
        throw error;
    }
}


//routes.js file

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
    routes = userRoutes; 

    // Handle hash change event
    window.addEventListener("hashchange", router);

    // Initialize router when page loads
    window.addEventListener("DOMContentLoaded", router);
}



//------------------------------------------ components-start--------------------------------------------------

// 1.Loader.js file
export const Loader = () => {
    const loaderHTML = `
    <div class="loader-div">
        <div class="loader-container">
            <div class="loader"></div>
        </div>
        </div>

    `;

    return loaderHTML;
};


// Function to show loader
export function showLoader() {
    const loader = document.querySelector(".loader-div");
    if (loader) loader.style.display = "block";
}

// Function to hide loader
export function hideLoader() {
    const loader = document.querySelector(".loader-div");
    if (loader) loader.style.display = "none";
}


//2.Navbar.js file


export default function Navbar() {
    setTimeout(() => {
        handleLogoClick();
        handleRemoteNavigation(); // Register remote navigation for navbar
    }, 0);

    return `
        <div class="navbar-container">
            <div class="navbar-logo">
                <img src="public/assets/logo.png" alt="logo">
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


//3. remoteNavigation.js

const remoteNavigationHandlers = new Map();
let activeComponent = 'navbar'; // Set navbar as default active component

export function registerRemoteNavigation(componentId, handleKeyPress) {
    remoteNavigationHandlers.set(componentId, handleKeyPress);
}

export function unregisterRemoteNavigation(componentId) {
    remoteNavigationHandlers.delete(componentId);
    if (activeComponent === componentId) {
        activeComponent = 'navbar';
        notifyNavigationChange();
    }
}

export function setActiveNavigation(componentId) {
    if (remoteNavigationHandlers.has(componentId)) {
        activeComponent = componentId;
        notifyNavigationChange();
    }
}

function notifyNavigationChange() {
    remoteNavigationHandlers.forEach((handler) => {
        handler({ type: 'component-switch', active: activeComponent });
    });
}

function handleGlobalKeyPress(event) {
    // Handle Tab key to switch between components
    if (event.key === 'Tab') {
        event.preventDefault();
        activeComponent = activeComponent === 'navbar' ? 'movies-page' : 'navbar';
        notifyNavigationChange();
        return;
    }

    // Only call the active component's handler
    if (activeComponent && remoteNavigationHandlers.has(activeComponent)) {
        remoteNavigationHandlers.get(activeComponent)(event);
    }
}

// Attach keydown event listener globally
document.addEventListener("keydown", handleGlobalKeyPress);


// 4.Videoplayer.js

function VideoPlayer(videoUrl, videoTitle, subtitles = []) {
    // Create a unique ID for the player
    const playerId = 'video-player-' + Date.now();
    
    // Initialize the player when the component is mounted
    setTimeout(() => {
        initializePlayer(playerId, videoUrl, subtitles);
        setupRemoteNavigation(playerId);
    }, 0);

    return `
        <div class="video-player-container">
            <div class="video-player-header">
                <button class="back-button" id="video-back-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 19L8 12L15 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Back
                </button>
                <h2 class="video-title">${videoTitle || 'Video Player'}</h2>
            </div>
            <div class="video-player-wrapper">
                <div id="single-loader" class="single-loader">
                    <div class="loader-spinner"></div>
                </div>
                <video 
                    id="${playerId}" 
                    class="video-js vjs-big-play-centered vjs-fluid"
                    controls 
                    preload="auto"
                    muted="false"
                    playsinline
                >
                    <p class="vjs-no-js">
                        To view this video please enable JavaScript, and consider upgrading to a
                        web browser that supports HTML5 video
                    </p>
                </video>
            </div>
        </div>
    `;
}

function initializePlayer(playerId, videoUrl, subtitles = []) {
    // Check if video.js is loaded
    if (typeof videojs === 'undefined') {
        console.error('Video.js is not loaded. Please include the video.js library.');
        return;
    }

    // Get single loader element
    const singleLoader = document.getElementById('single-loader');
    
    // Hide all other loaders and the big play button
    const hideAllLoaders = document.createElement('style');
    hideAllLoaders.textContent = `
        .vjs-loading-spinner, 
        .custom-loading-overlay, 
        .global-loading-indicator,
        .vjs-big-play-button { 
            display: none !important; 
        }
        
        /* Ensure our custom loader is visible and positioned correctly */
        .single-loader {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            background-color: rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(hideAllLoaders);

    // Log video URL for debugging
    console.log('Attempting to play video from URL:', videoUrl);

    // Initialize the player with debug logging enabled
    const player = videojs(playerId, {
        fluid: true,
        controls: true,
        autoplay: true,
        preload: 'auto',
        playbackRates: [0.5, 1, 1.5, 2],
        html5: {
            nativeAudioTracks: true,
            nativeVideoTracks: true,
            nativeTextTracks: true
        },
        liveui: false,
        debug: true,
        bigPlayButton: false, // Disable the default big play button
        loadingSpinner: false, // Disable the default loading spinner
        controlBar: {
            children: [
                'playToggle',
                'volumePanel',
                'currentTimeDisplay',
                'timeDivider',
                'durationDisplay',
                'progressControl',
                'liveDisplay',
                'remainingTimeDisplay',
                'customControlSpacer',
                'playbackRateMenuButton',
                'subtitlesButton',
                'captionsButton',
                'fullscreenToggle',
            ],
        }
    });

    // Set the video source with multiple formats if possible
    const sourceType = detectVideoType(videoUrl);
    const fallbackVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

    player.src([
        {
            src: videoUrl,
            type: sourceType
        },
        // Add a fallback video source in case the main one fails
        {
            src: fallbackVideoUrl,
            type: 'video/mp4'
        }
    ]);

    // Add subtitles if available
    if (subtitles && subtitles.length > 0) {
        subtitles.forEach(subtitle => {
            player.addRemoteTextTrack({
                kind: 'subtitles',
                srclang: subtitle.language,
                label: subtitle.label,
                src: subtitle.url,
                default: subtitle.default || false
            }, false);
        });
    }

    // Handle back button click
    const backButton = document.getElementById('video-back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            player.dispose();
            closeVideoPlayer();
        });
    }

    // Handle ESC key to close the player
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            player.dispose();
            closeVideoPlayer();
        }
    });

    // Fix audio issues
    player.on('loadedmetadata', function() {
        // Ensure volume is set and unmuted
        player.volume(1.0);
        player.muted(false);
    });

    // Handle loading events
    player.on('waiting', function() {
        if (singleLoader) {
            singleLoader.style.display = 'flex';
        }
        // Ensure the big play button is hidden during loading
        const bigPlayButton = document.querySelector('.vjs-big-play-button');
        if (bigPlayButton) {
            bigPlayButton.style.display = 'none';
        }
    });

    // Only hide loading when video is actually playing
    player.on('playing', function() {
        if (singleLoader) {
            singleLoader.style.display = 'none';
        }
    });

    // Handle errors with detailed logging
    player.on('error', function() {
        const error = player.error();
        console.error('Video.js Error:', error && error.message ? error.message : 'Unknown error');
        
        // Try to play the fallback video
        setTimeout(() => {
            try {
                console.log('Trying fallback video...');
                player.src({
                    src: fallbackVideoUrl,
                    type: 'video/mp4'
                });
                player.load();
                player.play().catch(e => console.error('Fallback play attempt failed:', e));
            } catch (e) {
                console.error('Error during fallback play attempt:', e);
                if (singleLoader) {
                    singleLoader.style.display = 'none';
                }
            }
        }, 2000);
    });

    // Enter fullscreen mode
    player.ready(function() {
        // Hide the big play button immediately on ready
        const bigPlayButton = document.querySelector('.vjs-big-play-button');
        if (bigPlayButton) {
            bigPlayButton.style.display = 'none';
        }
        
        setTimeout(() => {
            if (player.isFullscreen() === false) {
                player.requestFullscreen();
            }
            
            // Force play again after a delay
            setTimeout(() => {
                try {
                    player.play().catch(e => console.error('Delayed play attempt failed:', e));
                } catch (e) {
                    console.error('Error during delayed play attempt:', e);
                }
            }, 1500);
        }, 1000);
    });

    // Return the player instance
    return player;
}

function setupRemoteNavigation(playerId) {
    function handleNavigation(event) {
        const player = videojs.getPlayer(playerId);
        if (!player) return;

        switch (event.key) {
            case 'ArrowUp':
                // Increase volume
                player.volume(Math.min(player.volume() + 0.1, 1));
                break;
            case 'ArrowDown':
                // Decrease volume
                player.volume(Math.max(player.volume() - 0.1, 0));
                break;
            case 'ArrowLeft':
                // Rewind 10 seconds
                player.currentTime(Math.max(player.currentTime() - 10, 0));
                break;
            case 'ArrowRight':
                // Forward 10 seconds
                player.currentTime(Math.min(player.currentTime() + 10, player.duration()));
                break;
            case 'Enter':
                // Play/Pause
                if (player.paused()) {
                    player.play();
                } else {
                    player.pause();
                }
                break;
            case 'Escape':
                // Exit player
                player.dispose();
                closeVideoPlayer();
                break;
            default:
                return;
        }

        event.preventDefault();
    }

    // Register navigation
    registerRemoteNavigation('video-player', handleNavigation);
    setActiveNavigation('video-player');

    return () => {
        unregisterRemoteNavigation('video-player');
    };
}

function closeVideoPlayer() {
    // Remove the video player container
    const container = document.querySelector('.video-player-container');
    if (container) {
        container.remove();
    }

    // Restore the previous navigation
    setActiveNavigation('movies-page');
    if (window.updateMoviesFocus) {
        window.updateMoviesFocus();
    }

    // Remove fullscreen if active
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

function detectVideoType(url) {
    if (!url) return 'video/mp4';
    
    const extension = url.split('.').pop().toLowerCase();
    
    switch (extension) {
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'ogg':
            return 'video/ogg';
        case 'm3u8':
            return 'application/x-mpegURL';
        case 'mpd':
            return 'application/dash+xml';
        case 'ts':
            return 'video/mp2t';
        case 'mov':
            return 'video/quicktime';
        case 'avi':
            return 'video/x-msvideo';
        case 'wmv':
            return 'video/x-ms-wmv';
        case 'flv':
            return 'video/x-flv';
        case '3gp':
            return 'video/3gpp';
        default:
            // If no extension or unknown, try to guess based on URL patterns
            if (url.includes('m3u8')) {
                return 'application/x-mpegURL';
            } else if (url.includes('mpd')) {
                return 'application/dash+xml';
            } else {
                return 'video/mp4'; // Default to mp4
            }
    }
}

export { VideoPlayer, closeVideoPlayer }; 

//------------------------------------------ components-end--------------------------------------------------


//------------------------------------------ pages-start--------------------------------------------------

// LiveTV Page

function LiveTvPage() {
    return `
        <h1>Live TV</h1>
    `;
}


// Search Page 

function SearchPage() {
    return `
        <h1>Search</h1>
    `;
}


// Movies Page


export function MoviesPage() {
    setTimeout(() => {
        fetchMoviesData();
        setupRemoteNavigationMovies();
    }, 0);

    return `
        <div class="movies-page">
            ${Loader()}
        </div>
    `;
}

function setupRemoteNavigationMovies() {
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
                    const title = cards[currentCardIndex].querySelector('.movie-title')?.textContent;
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
            const title = card.querySelector('.movie-title')?.textContent;
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


// Not Found Page
export function NotFoundPage() {
    return `
    <div class="not-found">
        <h1>404 Not Found</h1>
        <p>The page you are looking for does not exist.</p>
    </div>
    `;
}

// SeriesPage


export function SeriesPage() {
    setTimeout(() => {
        fetchSeriesData();
        setupRemoteNavigationSeries();
    }, 0);

    return `
        <div class="series-page">
            ${Loader()}
        </div>
    `;
}

// Keep only one declaration of extractSeriesInfo at the top level
function extractSeriesInfo(title) {
    const seasonMatch = title.match(/S(\d+)\s*E(\d+)/i);
    let seriesName = title;
    let seasonNumber = null;
    let episodeNumber = null;

    if (seasonMatch) {
        seasonNumber = parseInt(seasonMatch[1]);
        episodeNumber = parseInt(seasonMatch[2]);
        seriesName = title.split(/S\d+\s*E\d+/i)[0].trim();
    }

    return {
        seriesName,
        seasonNumber,
        episodeNumber
    };
}

// Improved series organization
function organizeSeriesByNameAndSeason(seriesData) {
    const seriesMap = new Map();

    seriesData.forEach(episode => {
        const info = extractSeriesInfo(episode.title);
        const seriesKey = info.seriesName.toLowerCase();

        if (!seriesMap.has(seriesKey)) {
            seriesMap.set(seriesKey, {
                title: info.seriesName,
                group: episode.group,
                logo: episode.logo,
                seasons: {},
                latestEpisode: episode
            });
        }

        const series = seriesMap.get(seriesKey);
        if (info.seasonNumber) {
            if (!series.seasons[info.seasonNumber]) {
                series.seasons[info.seasonNumber] = [];
            }
            series.seasons[info.seasonNumber].push(episode);
        }
    });

    return seriesMap;
}

// Optimized series card creation
function createSeriesCard(series) {
    const { title, logo, group } = series.latestEpisode;
    const seriesInfo = extractSeriesInfo(title);
    const seasonCount = Object.keys(series.seasons).length;
    
    return `
        <div class="series-card" data-series='${JSON.stringify(series)}'>
            <img 
                class="series-image lazy" 
                data-src="${logo}" 
                alt="${seriesInfo.seriesName}"
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
            >
            <div class="series-title-overlay">
                <div class="play-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                    </svg>
                </div>
                <h3>
                    ${group ? `<span class="overlay-group">${group}</span>` : ''}
                    ${seriesInfo.seriesName}
                </h3>
                <p class="series-seasons">${seasonCount} Season${seasonCount > 1 ? 's' : ''}</p>
            </div>
        </div>
    `;
}

// Optimized group display
function displaySeriesByGroup(seriesData) {
    const seriesContainer = document.querySelector(".series-page");
    if (!seriesContainer) return;

    // Organize series data
    const organizedSeries = organizeSeriesByNameAndSeason(seriesData);
    const groupedSeries = new Map();

    // Group series by category
    for (const [_, series] of organizedSeries) {
        const group = series.latestEpisode.group || 'Other';
        if (!groupedSeries.has(group)) {
            groupedSeries.set(group, []);
        }
        groupedSeries.get(group).push(series);
    }

    // Create HTML in chunks
    const fragment = document.createDocumentFragment();
    const sortedGroups = Array.from(groupedSeries.keys()).sort();

    sortedGroups.forEach(groupName => {
        const seriesInGroup = groupedSeries.get(groupName);
        const groupDiv = document.createElement('div');
        groupDiv.className = 'series-group';
        groupDiv.innerHTML = `
            <h2 class="group-title">${groupName}</h2>
            <div class="series-list">
                ${seriesInGroup.map(series => createSeriesCard(series)).join('')}
            </div>
        `;
        fragment.appendChild(groupDiv);
    });

    // Clear and update container
    seriesContainer.innerHTML = '';
    seriesContainer.appendChild(fragment);

    // Setup lazy loading for images
    setupLazyLoading();

    // Add click handlers
    const seriesCards = seriesContainer.querySelectorAll('.series-card');
    seriesCards.forEach(card => {
        card.addEventListener('click', () => {
            const seriesData = card.dataset.series;
            if (seriesData) {
                showSeriesDetail(JSON.parse(seriesData));
            }
        });
    });

    // Update focus
    setTimeout(() => {
        if (window.updateSeriesFocus) {
            window.updateSeriesFocus();
        }
    }, 100);
}

// Lazy loading implementation
function setupLazyLoading() {
    const lazyImages = document.querySelectorAll('img.lazy');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });

    lazyImages.forEach(img => imageObserver.observe(img));
}

function showSeriesDetail(series) {
    document.body.insertAdjacentHTML('beforeend', SeriesDetailPage(series));
}

function setupRemoteNavigationSeries() {
    let currentGroupIndex = 0;
    let currentCardIndex = 0;
    let isActive = false;

    function updateFocus(forceActive = false) {
        // Remove existing focus
        document.querySelectorAll('.series-card.focused, .group-title.focused')
            .forEach(el => el.classList.remove('focused'));

        if (!isActive && !forceActive) return;

        const groups = document.querySelectorAll('.series-group');
        if (!groups.length) return;

        const currentGroup = groups[currentGroupIndex];
        const cards = currentGroup.querySelectorAll('.series-card');

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
                inline: 'center',
                offsetTop: 100
            });
        }
    }

    function handleNavigation(event) {
        if (event.type === 'component-switch') {
            isActive = event.active === 'series-page';
            updateFocus();
            return;
        }

        if (!isActive) return;

        const groups = document.querySelectorAll('.series-group');
        if (!groups.length) return;

        const currentGroup = groups[currentGroupIndex];
        const cards = currentGroup.querySelectorAll('.series-card');

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
                    const seriesData = cards[currentCardIndex].dataset.series;
                    if (seriesData) {
                        showSeriesDetail(JSON.parse(seriesData));
                    }
                }
                break;
            case 'Escape':
                closeSeriesDetail();
                break;
            default:
                return;
        }

        event.preventDefault();
        updateFocus();
    }

    registerRemoteNavigation('series-page', handleNavigation);

    document.querySelector('.series-page').addEventListener('click', () => {
        isActive = true;
        setActiveNavigation('series-page');
        updateFocus();
    });

    window.updateSeriesFocus = () => {
        isActive = true;
        setActiveNavigation('series-page');
        updateFocus(true);
    };

    return () => {
        unregisterRemoteNavigation('series-page');
        delete window.updateSeriesFocus;
    };
}

async function fetchSeriesData() {
    try {
        showLoader();
        const data = await getData("series");
        if(data){
            hideLoader();
            displaySeriesByGroup(data);
        }
    } catch (error) {
        hideLoader();
        console.error("Error fetching series data:", error);
        // Show error message to user
        document.querySelector(".series-page").innerHTML = `
            <div class="error-message">
                <h2>Unable to load series</h2>
                <p>Please try again later</p>
                <button onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
}


// Series-Detail-Page

export function SeriesDetailPage(series) {
    setTimeout(() => {
        setupDetailPageNavigation();
    }, 0);

    const seriesInfo = extractSeriesInfo(series.latestEpisode.title);
    const seriesName = seriesInfo.seriesName;

    return `
        <div class="series-detail-page">
            <div class="series-detail-header">
                <button class="back-button" id="series-back-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 19L8 12L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Back
                </button>
                <h2 class="series-title">${seriesName}</h2>
            </div>
            <div class="series-detail-content">
                <div class="series-info">
                    <img 
                        class="series-poster" 
                        src="${series.latestEpisode.logo}" 
                        alt="${seriesName}"
                        onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='"
                    >
                    <div class="series-metadata">
                        <p class="series-group">${series.latestEpisode.group}</p>
                        <p class="series-seasons">${series.seasons.size} Season${series.seasons.size > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="episodes-container">
                    <div class="seasons-tabs">
                        ${createSeasonTabs(series.seasons)}
                    </div>
                    <div class="episodes-list" id="episodes-list">
                        ${createEpisodesList(series.seasons)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createSeasonTabs(seasons) {
    // Convert seasons to array of season numbers, handling both Map and regular objects
    const seasonNumbers = seasons instanceof Map ? 
        Array.from(seasons.keys()) : 
        Object.keys(seasons).map(Number);
    
    seasonNumbers.sort((a, b) => a - b);
    
    return `
        <div class="season-tabs">
            ${seasonNumbers.map((season, index) => `
                <button class="season-tab ${index === 0 ? 'active' : ''}" 
                        data-season="${season}">
                    Season ${season}
                </button>
            `).join('')}
        </div>
    `;
}

function createEpisodesList(seasons) {
    // Convert seasons to array of season numbers, handling both Map and regular objects
    const seasonNumbers = seasons instanceof Map ? 
        Array.from(seasons.keys()) : 
        Object.keys(seasons).map(Number);
    
    seasonNumbers.sort((a, b) => a - b);
    
    return seasonNumbers.map((season, index) => `
        <div class="season-episodes ${index === 0 ? 'active' : ''}" data-season="${season}">
            ${(seasons instanceof Map ? seasons.get(season) : seasons[season])
                .sort((a, b) => {
                    const aInfo = extractSeriesInfo(a.title);
                    const bInfo = extractSeriesInfo(b.title);
                    return aInfo.episodeNumber - bInfo.episodeNumber;
                })
                .map(episode => createEpisodeCard(episode))
                .join('')}
        </div>
    `).join('');
}

function createEpisodeCard(episode) {
    const info = extractSeriesInfo(episode.title);
    return `
        <div class="episode-card" data-url="${episode.url}">
            <div class="episode-thumbnail">
                <img 
                    class="lazy"
                    data-src="${episode.logo}" 
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                    alt="${episode.title}"
                >
                <div class="play-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                    </svg>
                </div>
            </div>
            <div class="episode-info">
                <h3 class="episode-title">${episode.title}</h3>
                ${info.seasonNumber ? 
                    `<p class="episode-metadata">Season ${info.seasonNumber} Episode ${info.episodeNumber}</p>` 
                    : ''}
            </div>
        </div>
    `;
}

function setupDetailPageNavigation() {
    const backButton = document.getElementById('series-back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            closeSeriesDetail();
        });
    }

    // Setup lazy loading
    setupLazyLoadingDetail();

    // Setup season switching
    window.switchSeason = function(seasonNumber) {
        document.querySelectorAll('.season-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.season == seasonNumber);
            tab.classList.toggle('focused', false);
        });
        
        document.querySelectorAll('.season-episodes').forEach(episodes => {
            episodes.classList.toggle('active', episodes.dataset.season == seasonNumber);
        });

        // Reset episode focus
        currentEpisodeIndex = 0;
        currentFocus = 'episodes';
        updateFocus();
    };

    let isActive = true;
    let currentEpisodeIndex = 0;
    let currentFocus = 'episodes'; // 'back', 'seasons', 'episodes'

    function updateFocus() {
        // Clear all focus states
        document.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));

        if (!isActive) return;

        switch (currentFocus) {
            case 'back':
                backButton.classList.add('focused');
                break;
            case 'seasons':
                const seasonTabs = document.querySelectorAll('.season-tab');
                const activeTab = document.querySelector('.season-tab.active');
                const tabIndex = Array.from(seasonTabs).indexOf(activeTab);
                if (seasonTabs[tabIndex]) {
                    seasonTabs[tabIndex].classList.add('focused');
                    seasonTabs[tabIndex].scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    });
                }
                break;
            case 'episodes':
                const episodes = document.querySelectorAll('.season-episodes.active .episode-card');
                if (episodes.length && episodes[currentEpisodeIndex]) {
                    episodes[currentEpisodeIndex].classList.add('focused');
                    episodes[currentEpisodeIndex].scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
                break;
        }
    }

    function handleNavigation(event) {
        if (!isActive) return;

        const episodes = document.querySelectorAll('.season-episodes.active .episode-card');
        const seasonTabs = document.querySelectorAll('.season-tab');
        const activeTabIndex = Array.from(seasonTabs).findIndex(tab => tab.classList.contains('active'));

        switch (event.key) {
            case 'ArrowUp':
                switch (currentFocus) {
                    case 'episodes':
                        if (currentEpisodeIndex > 0) {
                            currentEpisodeIndex--;
                        } else {
                            currentFocus = 'seasons';
                        }
                        break;
                    case 'seasons':
                        currentFocus = 'back';
                        break;
                }
                break;
            case 'ArrowDown':
                switch (currentFocus) {
                    case 'back':
                        currentFocus = 'seasons';
                        break;
                    case 'seasons':
                        if (episodes.length > 0) {
                            currentFocus = 'episodes';
                            currentEpisodeIndex = 0;
                        }
                        break;
                    case 'episodes':
                        if (currentEpisodeIndex < episodes.length - 1) {
                            currentEpisodeIndex++;
                        }
                        break;
                }
                break;
            case 'ArrowLeft':
                switch (currentFocus) {
                    case 'seasons':
                        if (activeTabIndex > 0) {
                            window.switchSeason(Number(seasonTabs[activeTabIndex - 1].dataset.season));
                        }
                        break;
                    case 'episodes':
                        if (currentEpisodeIndex > 0) {
                            currentEpisodeIndex--;
                        }
                        break;
                }
                break;
            case 'ArrowRight':
                switch (currentFocus) {
                    case 'seasons':
                        if (activeTabIndex < seasonTabs.length - 1) {
                            window.switchSeason(Number(seasonTabs[activeTabIndex + 1].dataset.season));
                        }
                        break;
                    case 'episodes':
                        if (currentEpisodeIndex < episodes.length - 1) {
                            currentEpisodeIndex++;
                        }
                        break;
                }
                break;
            case 'Enter':
                switch (currentFocus) {
                    case 'back':
                        closeSeriesDetail();
                        break;
                    case 'seasons':
                        const focusedTab = document.querySelector('.season-tab.focused');
                        if (focusedTab) {
                            const seasonNumber = Number(focusedTab.dataset.season);
                            window.switchSeason(seasonNumber);
                            currentFocus = 'episodes';
                            currentEpisodeIndex = 0;
                        }
                        break;
                    case 'episodes':
                        const episode = episodes[currentEpisodeIndex];
                        if (episode) {
                            const url = episode.dataset.url;
                            const title = episode.querySelector('.episode-title')?.textContent;
                            if (url) {
                                playEpisode(url, title);
                            }
                        }
                        break;
                }
                break;
            case 'Escape':
                closeSeriesDetail();
                break;
            default:
                return;
        }

        event.preventDefault();
        updateFocus();
    }

    registerRemoteNavigation('series-detail', handleNavigation);
    setActiveNavigation('series-detail');

    // Set initial focus
    setTimeout(() => {
        currentFocus = 'episodes';
        updateFocus();
    }, 100);

    return () => {
        unregisterRemoteNavigation('series-detail');
        delete window.switchSeason;
    };
}

function setupLazyLoadingDetail() {
    const lazyImages = document.querySelectorAll('img.lazy');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });

    lazyImages.forEach(img => imageObserver.observe(img));
}

function playEpisode(url, title) {
    if (!url) {
        console.error('No URL provided for episode');
        return;
    }
    document.body.insertAdjacentHTML('beforeend', VideoPlayer(url, title));
}

function closeSeriesDetail() {
    const detailPage = document.querySelector('.series-detail-page');
    if (detailPage) {
        detailPage.remove();
    }
    setActiveNavigation('series-page');
    if (window.updateSeriesFocus) {
        window.updateSeriesFocus();
    }
} 






// Define routes
const routingRoutes = {
    "/": SearchPage,
    "/movies": MoviesPage,
    "/series": SeriesPage,
    "/live-tv": LiveTvPage,
    "*": NotFoundPage,
};

// Render navbar
document.body.insertAdjacentHTML("afterbegin", Navbar());

// Initialize the router
createRouter(routingRoutes);

window.onload = async function () {
    try {
        const deviceMacId = localStorage.getItem("deviceMacId"); 

        const results = await Promise.allSettled([
            getAllMacIds(),
            getDeviceMacId(),
            getM3UUrl(deviceMacId)
        ]);

        // Handle API responses
        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                console.log(`API ${index + 1} success:`, result.value);
            } else {
                console.error(`API ${index + 1} failed:`, result.reason);
            }
        });
    } catch (error) {
        console.error("Error in page load fetching:", error);
    }
};