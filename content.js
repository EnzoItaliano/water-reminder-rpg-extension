// content.js
const overlayId = 'hydro-quest-overlay';

function updateVisuals(isDehydrated) {
    // Check settings before applying
    chrome.storage.local.get(["userStats"], (data) => {
        const stats = data.userStats;
        const effectsEnabled = stats && stats.settings ? stats.settings.effectsEnabled !== false : true;

        // Force remove if disabled, otherwise respect dehydration status
        const shouldApply = isDehydrated && effectsEnabled;

        if (shouldApply) {
            let filterStyle = "grayscale(0.5) sepia(0.2) contrast(0.8)";
            if (stats.inventory && stats.inventory.equipped && stats.inventory.equipped.includes('sand_goggles')) {
                filterStyle = "grayscale(0.2) sepia(0.1) contrast(0.9)"; // Reduced intensity
            }
            document.documentElement.style.filter = filterStyle;
            document.documentElement.style.transition = "filter 2s ease-in-out";

            if (!document.getElementById(overlayId)) {
                const overlay = document.createElement('div');
                overlay.id = overlayId;
                overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;background:rgba(139,69,19,0.05);z-index:999999;";
                document.body.appendChild(overlay);
            }
        } else {
            document.documentElement.style.filter = "none";
            const overlay = document.getElementById(overlayId);
            if (overlay) overlay.remove();
        }
    });
}

// Initial check
chrome.storage.local.get(["dehydrated"], (data) => {
    updateVisuals(data.dehydrated);
});

// Listen for explicit messages from background (more reliable than storage.onChanged for immediate updates)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateDehydration") {
        // console.log("HydroQuest: Received dehydration update:", request.isDehydrated);
        updateVisuals(request.isDehydrated);
    }
});

// Listen for storage changes (keep as backup/for other contexts)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.dehydrated) {
            updateVisuals(changes.dehydrated.newValue);
        }
        // If settings changed (specifically effectsEnabled), re-run visual check
        if (changes.userStats) {
            chrome.storage.local.get(["dehydrated"], (data) => {
                updateVisuals(data.dehydrated);
            });
        }
    }
});
