import { getData } from "../utils/parseM3U.js";
import { Loader, showLoader, hideLoader } from "../components/Loader.js";
import { registerRemoteNavigation, unregisterRemoteNavigation, setActiveNavigation } from "../components/remoteNavigation.js";
import { SeriesDetailPage } from "./SeriesDetailPage.js";

function SeriesPage() {
    setTimeout(() => {
        fetchSeriesData();
        setupRemoteNavigation();
    }, 0);

    return `
        <div class="series-page">
            ${Loader()}
        </div>
    `;
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

function setupRemoteNavigation() {
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

export default SeriesPage;