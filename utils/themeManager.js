// Available themes
const themes = {
    default: {
        name: 'Default',
        primary: '#00ccff',
        secondary: '#00ff88',
        accent: '#031e39',
        background: '#f8f9fa',
        cardBg: '#ffffff',
        textPrimary: '#2d3748',
        textSecondary: '#718096'
    },
    red: {
        name: 'Red',
        primary: '#ff3b30',
        secondary: '#ff9500',
        accent: '#2c0b0e',
        background: '#f8f9fa',
        cardBg: '#ffffff',
        textPrimary: '#2d3748',
        textSecondary: '#718096'
    },
    green: {
        name: 'Green',
        primary: '#34c759',
        secondary: '#30d158',
        accent: '#0c2912',
        background: '#f8f9fa',
        cardBg: '#ffffff',
        textPrimary: '#2d3748',
        textSecondary: '#718096'
    },
    indigo: {
        name: 'Indigo',
        primary: '#5856d6',
        secondary: '#af52de',
        accent: '#1a1a2e',
        background: '#f8f9fa',
        cardBg: '#ffffff',
        textPrimary: '#2d3748',
        textSecondary: '#718096'
    }
};

// Get current theme from localStorage or use default
function getCurrentTheme() {
    const savedTheme = localStorage.getItem('tv-app-theme') || 'default';
    return themes[savedTheme] || themes.default;
}

// Apply theme to document
function applyTheme(themeName) {
    const theme = themes[themeName] || themes.default;
    
    // Save theme preference
    localStorage.setItem('tv-app-theme', themeName);
    
    // Apply CSS variables to root element
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--secondary-color', theme.secondary);
    document.documentElement.style.setProperty('--accent-color', theme.accent);
    document.documentElement.style.setProperty('--background-color', theme.background);
    document.documentElement.style.setProperty('--card-bg-color', theme.cardBg);
    document.documentElement.style.setProperty('--text-primary-color', theme.textPrimary);
    document.documentElement.style.setProperty('--text-secondary-color', theme.textSecondary);
    
    // Add theme name as class to body for additional styling
    document.body.className = '';
    document.body.classList.add(`theme-${themeName}`);
    
    // Dispatch event for components to react
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    
    return theme;
}

// Initialize theme on page load
function initTheme() {
    const savedTheme = localStorage.getItem('tv-app-theme') || 'default';
    return applyTheme(savedTheme);
}

// Get all available themes
function getAvailableThemes() {
    return Object.keys(themes).map(key => ({
        id: key,
        name: themes[key].name
    }));
}

export { 
    initTheme, 
    applyTheme, 
    getCurrentTheme, 
    getAvailableThemes,
    themes
}; 