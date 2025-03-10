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