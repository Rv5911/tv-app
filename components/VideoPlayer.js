// VideoPlayer.js - A component for playing videos using video.js
import { registerRemoteNavigation, unregisterRemoteNavigation, setActiveNavigation } from "./remoteNavigation.js";

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