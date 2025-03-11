import { ThemeSelector } from '../components/ThemeSelector.js';
import { registerRemoteNavigation, unregisterRemoteNavigation, setActiveNavigation } from '../components/remoteNavigation.js';

function SettingsPage() {
    setTimeout(() => {
        setupSettingsNavigation();
    }, 0);

    return `
        <div class="settings-page">
            <h1 class="settings-title">Settings</h1>
            
            <div class="settings-section">
                <h2 class="settings-section-title">Appearance</h2>
                ${ThemeSelector()}
            </div>
            
            <div class="settings-section">
                <h2 class="settings-section-title">About</h2>
                <div class="about-info">
                    <p>TV App Version 1.0.0</p>
                    <p>A simple TV application for streaming content</p>
                </div>
            </div>
        </div>
    `;
}

function setupSettingsNavigation() {
    // This function would handle keyboard navigation between settings sections
    // For now, we'll just set the theme selector as active
    setTimeout(() => {
        setActiveNavigation('theme-selector');
    }, 100);
}

export default SettingsPage; 