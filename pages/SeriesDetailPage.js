import { VideoPlayer } from "../components/VideoPlayer.js";
import { registerRemoteNavigation, unregisterRemoteNavigation, setActiveNavigation } from "../components/remoteNavigation.js";

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
                        data-season="${season}"
                        onclick="switchSeason(${season})">
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
    setupLazyLoading();

    // Setup season switching
    window.switchSeason = function(seasonNumber) {
        document.querySelectorAll('.season-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.season == seasonNumber);
        });
        
        document.querySelectorAll('.season-episodes').forEach(episodes => {
            episodes.classList.toggle('active', episodes.dataset.season == seasonNumber);
        });

        // Reset episode focus
        currentEpisodeIndex = 0;
        updateFocus();
    };

    let isActive = true;
    let currentEpisodeIndex = 0;

    function updateFocus() {
        const activeSeasonEpisodes = document.querySelector('.season-episodes.active .episode-card');
        if (!activeSeasonEpisodes) return;

        const episodes = document.querySelectorAll('.season-episodes.active .episode-card');
        episodes.forEach(episode => episode.classList.remove('focused'));
        
        if (episodes[currentEpisodeIndex]) {
            episodes[currentEpisodeIndex].classList.add('focused');
            episodes[currentEpisodeIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    function handleNavigation(event) {
        if (!isActive) return;

        const episodes = document.querySelectorAll('.season-episodes.active .episode-card');
        if (!episodes.length) return;

        switch (event.key) {
            case 'ArrowUp':
                if (currentEpisodeIndex > 0) {
                    currentEpisodeIndex--;
                }
                break;
            case 'ArrowDown':
                if (currentEpisodeIndex < episodes.length - 1) {
                    currentEpisodeIndex++;
                }
                break;
            case 'ArrowLeft':
                const prevTab = document.querySelector('.season-tab.active').previousElementSibling;
                if (prevTab) {
                    window.switchSeason(prevTab.dataset.season);
                }
                break;
            case 'ArrowRight':
                const nextTab = document.querySelector('.season-tab.active').nextElementSibling;
                if (nextTab) {
                    window.switchSeason(nextTab.dataset.season);
                }
                break;
            case 'Enter':
                const episode = episodes[currentEpisodeIndex];
                if (episode) {
                    const url = episode.dataset.url;
                    const title = episode.querySelector('.episode-title')?.textContent;
                    if (url) {
                        playEpisode(url, title);
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

    registerRemoteNavigation('series-detail', handleNavigation);
    setActiveNavigation('series-detail');

    // Set initial focus
    setTimeout(updateFocus, 100);

    return () => {
        unregisterRemoteNavigation('series-detail');
        delete window.switchSeason;
    };
}

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