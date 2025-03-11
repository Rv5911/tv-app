import { applyTheme, getAvailableThemes, getCurrentTheme } from '../utils/themeManager.js';
import { registerRemoteNavigation, unregisterRemoteNavigation, setActiveNavigation } from './remoteNavigation.js';

export function ThemeSelector() {
    setTimeout(() => {
        setupThemeSelector();
    }, 0);

    const themes = getAvailableThemes();
    const currentTheme = getCurrentTheme();

    return `
        <div class="theme-selector">
            <h3 class="theme-selector-title">Select Theme</h3>
            <div class="theme-options">
                ${themes.map(theme => `
                    <div class="theme-option ${theme.id === currentTheme.name.toLowerCase() ? 'active' : ''}" 
                         data-theme="${theme.id}">
                        <div class="theme-color-preview theme-${theme.id}"></div>
                        <span>${theme.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function setupThemeSelector() {
    const themeOptions = document.querySelectorAll('.theme-option');
    let currentIndex = 0;
    let isActive = false;

    // Find the currently active theme
    themeOptions.forEach((option, index) => {
        if (option.classList.contains('active')) {
            currentIndex = index;
        }
    });

    function updateFocus() {
        // Remove focus from all options
        themeOptions.forEach(option => option.classList.remove('focused'));
        
        if (!isActive) return;
        
        // Add focus to current option
        if (themeOptions[currentIndex]) {
            themeOptions[currentIndex].classList.add('focused');
        }
    }

    function handleNavigation(event) {
        // Handle component switching
        if (event.type === 'component-switch') {
            isActive = event.active === 'theme-selector';
            updateFocus();
            return;
        }

        if (!isActive) return;

        switch (event.key) {
            case 'ArrowRight':
                currentIndex = (currentIndex + 1) % themeOptions.length;
                break;
            case 'ArrowLeft':
                currentIndex = (currentIndex - 1 + themeOptions.length) % themeOptions.length;
                break;
            case 'Enter':
                if (themeOptions[currentIndex]) {
                    const themeId = themeOptions[currentIndex].dataset.theme;
                    applyTheme(themeId);
                    
                    // Update active class
                    themeOptions.forEach(option => option.classList.remove('active'));
                    themeOptions[currentIndex].classList.add('active');
                }
                break;
            default:
                return;
        }

        event.preventDefault();
        updateFocus();
    }

    // Register for remote navigation
    registerRemoteNavigation('theme-selector', handleNavigation);

    // Add click handlers
    themeOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
            const themeId = option.dataset.theme;
            applyTheme(themeId);
            
            // Update active class
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            // Update current index
            currentIndex = index;
            
            // Set this component as active
            isActive = true;
            setActiveNavigation('theme-selector');
            updateFocus();
        });
    });

    // Initial focus update
    updateFocus();
} 