const remoteNavigationHandlers = new Map();

export function registerRemoteNavigation(componentId, handleKeyPress) {
    remoteNavigationHandlers.set(componentId, handleKeyPress);
}

export function unregisterRemoteNavigation(componentId) {
    remoteNavigationHandlers.delete(componentId);
}

function handleGlobalKeyPress(event) {
    remoteNavigationHandlers.forEach((handler) => handler(event));
}

// Attach keydown event listener globally
document.addEventListener("keydown", handleGlobalKeyPress);