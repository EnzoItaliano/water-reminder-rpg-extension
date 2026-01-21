import { defaultStats, isRateLimited } from './stats.js';
import { updateUI, switchView, renderTrophies, updateMonsterPreview } from './ui.js';

export const AVAILABLE_MONSTERS = [
    { id: 'sand_slime', name: 'Sand Slime', cost: 100 },
    { id: 'cactus_golem', name: 'Cactus Golem', cost: 150 },
    { id: 'dust_phoenix', name: 'Dust Phoenix', cost: 200 },
    { id: 'drought_king', name: 'Drought King', cost: 300 },
    { id: 'drought_bat', name: 'Drought Bat', cost: 120 },
    { id: 'dust_mite', name: 'Dust Mite', cost: 80 },
    { id: 'mirage_mimic', name: 'Mirage Mimic', cost: 180 },
    { id: 'salt_spider', name: 'Salt Spider', cost: 140 },
    { id: 'searing_serpent', name: 'Searing Serpent', cost: 220 },
    { id: 'sun-baked_skull', name: 'Sun-Baked Skull', cost: 250 }
];

let currentMonsterIndex = 0;

export function initGame() {
    // 1. Initial Load & Routing
    chrome.storage.local.get(["userStats"], (data) => {
        let stats = data.userStats || defaultStats;

        // Ensure structure matches new version (simple migration check)
        if (!stats.currentSession) {
            stats = defaultStats;
        }

        // Migration: Gold & Store
        if (typeof stats.gold === 'undefined') stats.gold = 0;
        if (!stats.unlockedMonsters) {
            // Default Unlock ALL existing if migrating from pre-store
            stats.unlockedMonsters = ['sand_slime', 'cactus_golem', 'dust_phoenix', 'drought_king'];
        }

        chrome.storage.local.set({ userStats: stats });

        // Check if session is running but expired (logic handled better in background, but good for UI sync)

        checkSessionState(stats);

        // Restore last selected monster if idle
        if (stats.currentSession.status === 'idle' && stats.lastMonsterId) {
            const idx = AVAILABLE_MONSTERS.findIndex(m => m.id === stats.lastMonsterId);
            if (idx !== -1) currentMonsterIndex = idx;
        }

        updateUI(stats);
        updateMonsterPreview(AVAILABLE_MONSTERS[currentMonsterIndex]); // Initial preview update
    });

    // 2. Setup Event Listeners
    setupListeners();

    // 3. Game Loop (1s tick) for Timer UI
    setInterval(() => {
        chrome.storage.local.get(["userStats"], (data) => {
            if (data.userStats) {
                // If we want accurate timer, we must recalculate elapsed time here.
                // updateUI handles drawing based on stats.startTime vs Date.now()
                // So checking state + updateUI is enough.
                checkSessionState(data.userStats); // Check for timeout locally too for immediate feedback
                updateUI(data.userStats);
            }
        });
    }, 1000);
}

function setupListeners() {
    // START SESSION
    document.getElementById('btn-start')?.addEventListener('click', () => {
        const liters = parseFloat(document.getElementById('input-liters').value);
        const hours = parseFloat(document.getElementById('input-hours').value);
        const minutes = Math.floor(hours * 60);

        startSession(liters, minutes);
    });

    // DRINK WATER
    document.getElementById('btn-drink')?.addEventListener('click', () => {
        drinkWater();
    });

    // GIVE UP
    document.getElementById('btn-giveup')?.addEventListener('click', () => {
        endSession('lost');
    });

    // RETURN TO CAMP (Result -> Config)
    document.getElementById('btn-return')?.addEventListener('click', () => {
        resetToIdle();
    });

    // TROPHY ROOM
    document.getElementById('trophy-btn')?.addEventListener('click', () => {
        switchView('view-trophies');
        chrome.storage.local.get(["userStats"], (data) => {
            renderTrophies(data.userStats || defaultStats, AVAILABLE_MONSTERS);
        });
    });

    document.getElementById('btn-back-trophy')?.addEventListener('click', () => {
        // Force navigation away from trophy view
        document.getElementById('view-trophies').classList.remove('active');
        chrome.storage.local.get(["userStats"], (data) => {
            updateUI(data.userStats);
        });
    });

    // STORE
    document.getElementById('store-btn')?.addEventListener('click', () => {
        switchView('view-store');
        chrome.storage.local.get(["userStats"], (data) => {
            // We need to import renderStore dynamically or statically. 
            // Since we are in SetupListeners, let's use the imported form if valid, 
            // but we haven't imported renderStore yet in the top of file.
            // We will add it to the import statement next tool call.
            import('./ui.js').then(ui => ui.renderStore(data.userStats || defaultStats, AVAILABLE_MONSTERS));
        });
    });

    document.getElementById('btn-back-store')?.addEventListener('click', () => {
        document.getElementById('view-store').classList.remove('active');
        chrome.storage.local.get(["userStats"], (data) => {
            updateUI(data.userStats);
        });
    });

    // MONSTER CHOOSER
    const getUnlockedMonsters = (stats) => {
        const unlockedIds = stats.unlockedMonsters || [];
        return AVAILABLE_MONSTERS.filter(m => unlockedIds.includes(m.id));
    };

    const getNextMonster = (direction) => {
        chrome.storage.local.get(["userStats"], (data) => {
            const stats = data.userStats || defaultStats;
            const unlocked = getUnlockedMonsters(stats);
            if (unlocked.length === 0) return;

            // Find current index in the UNLOCKED list
            // We rely on the DOM's current ID or state, but better to rely on `currentMonsterIndex` relative to AVAILABLE?
            // No, `currentMonsterIndex` global variable is index in AVAILABLE_MONSTERS.
            // Let's find the current monster in the unlocked list.
            const currentId = AVAILABLE_MONSTERS[currentMonsterIndex].id;
            let idxInUnlocked = unlocked.findIndex(m => m.id === currentId);

            if (idxInUnlocked === -1) idxInUnlocked = 0; // Fallback

            idxInUnlocked += direction; // +1 or -1

            // Wrap around
            if (idxInUnlocked >= unlocked.length) idxInUnlocked = 0;
            if (idxInUnlocked < 0) idxInUnlocked = unlocked.length - 1;

            const nextMonster = unlocked[idxInUnlocked];

            // Updates global index to match the new selection in the main list
            currentMonsterIndex = AVAILABLE_MONSTERS.findIndex(m => m.id === nextMonster.id);

            updateMonsterPreview(nextMonster);
        });
    };

    document.getElementById('btn-prev-monster')?.addEventListener('click', () => {
        getNextMonster(-1);
    });

    document.getElementById('btn-next-monster')?.addEventListener('click', () => {
        getNextMonster(1);
    });

    // TIME CHOOSER
    const formatTime = (totalHours) => {
        const h = Math.floor(totalHours);
        const m = Math.round((totalHours - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const updateTimeUI = (newVal) => {
        const input = document.getElementById('input-hours');
        if (input) {
            input.value = newVal;
            document.getElementById('time-display-text').innerText = formatTime(newVal);
            // Trigger UI update for difficulty
            chrome.storage.local.get(["userStats"], (data) => {
                updateUI(data.userStats || defaultStats);
            });
        }
    };

    document.getElementById('btn-time-minus')?.addEventListener('click', () => {
        let val = parseFloat(document.getElementById('input-hours').value);
        val -= 0.5;
        if (val < 1) val = 1;
        updateTimeUI(val);
    });

    document.getElementById('btn-time-plus')?.addEventListener('click', () => {
        let val = parseFloat(document.getElementById('input-hours').value);
        val += 0.5;
        updateTimeUI(val);
    });

    // Listen for Buy Monster events from UI
    document.addEventListener('request-buy-monster', (e) => {
        const { id, cost } = e.detail;
        buyMonster(id, cost);
    });
}

function startSession(liters, minutes) {
    chrome.storage.local.get(["userStats"], (data) => {
        let stats = data.userStats || defaultStats;

        const totalCups = Math.ceil((liters * 1000) / 250);

        // Calculate difficulty for sprite selection
        // New Calibration: Volume Based.
        // 1L (4 cups) = Lv 1 (Diff 1)
        // 3L (12 cups) = Lv 6 (Diff 9)
        // Formula: Cups - 3
        const difficulty = Math.max(1, Math.min(10, totalCups - 3));

        stats.currentSession = {
            isActive: true,
            status: 'running',
            startTime: Date.now(),
            durationMinutes: minutes,
            waterGoalML: liters * 1000,
            totalCups: totalCups,
            difficulty: difficulty,
            cupsDrank: 0,
            drinkHistory: [],
            monsterId: AVAILABLE_MONSTERS[currentMonsterIndex].id
        };

        // Save choice for next time
        stats.lastMonsterId = AVAILABLE_MONSTERS[currentMonsterIndex].id;

        chrome.storage.local.set({ userStats: stats }, () => {
            // Trigger Background Alarm for timeout
            chrome.alarms.create("sessionTimeout", { delayInMinutes: minutes });

            // Trigger periodic drink reminders
            // Interval = Total Minutes / Total Cups
            // e.g. 60 mins / 4 cups = reminder every 15 mins
            const intervalMinutes = minutes / totalCups;
            chrome.alarms.create("drinkReminder", { periodInMinutes: intervalMinutes });

            updateUI(stats);
        });
    });
}

function drinkWater() {
    chrome.storage.local.get(["userStats"], (data) => {
        let stats = data.userStats;
        let session = stats.currentSession;

        if (session.status !== 'running') return;

        // Rate Limit Check
        if (isRateLimited(session.drinkHistory)) {
            // UI should block this, but double check here
            return;
        }

        // Apply Drink
        session.cupsDrank++;
        session.drinkHistory.push(Date.now());
        stats.totalWaterDrankML += 250;

        // Check Win Condition
        if (session.cupsDrank >= session.totalCups) {
            // WIN!
            endSession('won', stats);
            return; // endSession handles save
        }

        chrome.storage.local.set({ userStats: stats }, () => {
            updateUI(stats);
        });
    });
}

function endSession(result, statsObj = null) {
    const performEnd = (stats) => {
        stats.currentSession.isActive = false;
        stats.currentSession.status = result;

        if (result === 'won') {
            stats.sessionsCompleted++;
            // Reward Gold = Session Difficulty
            stats.gold = (stats.gold || 0) + stats.currentSession.difficulty;

            stats.trophies.push({
                date: Date.now(),
                monsterId: stats.currentSession.monsterId,
                difficulty: stats.currentSession.difficulty,
                monsterIcon: "👹"
            });
        }

        // Clear alarms
        chrome.alarms.clear("sessionTimeout");
        chrome.alarms.clear("drinkReminder");

        chrome.storage.local.set({ userStats: stats }, () => {
            updateUI(stats);
        });
    };

    if (statsObj) {
        performEnd(statsObj);
    } else {
        chrome.storage.local.get(["userStats"], (data) => performEnd(data.userStats));
    }
}

export function buyMonster(monsterId, cost) {
    chrome.storage.local.get(["userStats"], (data) => {
        let stats = data.userStats;
        if (!stats) return;

        // Init gold if missing
        if (typeof stats.gold === 'undefined') stats.gold = 0;
        if (typeof stats.unlockedMonsters === 'undefined') stats.unlockedMonsters = [];

        if (stats.gold >= cost) {
            stats.gold -= cost;
            if (!stats.unlockedMonsters.includes(monsterId)) {
                stats.unlockedMonsters.push(monsterId);
            }
            chrome.storage.local.set({ userStats: stats }, () => {
                // Return to store view with updated state
                // We need to re-render the store. 
                // Since buyMonster is likely called from UI event, we can assume UI context.
                // Re-rendering store should be done by the Caller or via updateUI if we treat Store as part of it.
                // For simplicity, let's call updateUI or a custom callback if needed?
                // Actually, updateUI doesn't render Store items dynamic list.
                // So we'll dispatch an event or just rely on the listener to re-render.
                // Better: Have buyMonster return a Promise or take a callback.
                // But since we are inside game.js we can access ui.js.
                // Let's import renderStore if possible or export buyMonster and let logic handle it.
                // Current structure: game.js imports ui.js.
                // We can add `renderStore(stats, AVAILABLE_MONSTERS)` to ui.js and call it here.
                import('./ui.js').then(ui => ui.renderStore(stats, AVAILABLE_MONSTERS));
                updateUI(stats);
            });
        }
    });
}

function resetToIdle() {
    chrome.storage.local.get(["userStats"], (data) => {
        let stats = data.userStats;
        stats.currentSession.status = 'idle';
        stats.currentSession.isActive = false;
        stats.currentSession.cupsDrank = 0;
        stats.currentSession.drinkHistory = [];

        chrome.storage.local.set({ userStats: stats }, () => {
            updateUI(stats);
        });
    });
}

function checkSessionState(stats) {
    if (stats.currentSession.status === 'running') {
        const now = Date.now();
        const elapsedMinutes = (now - stats.currentSession.startTime) / 60000;

        if (elapsedMinutes > stats.currentSession.durationMinutes) {
            // Time expired!
            // Wait, did they finish? If so, they won already.
            // If status is still running and time is up -> LOST.
            endSession('lost', stats);
        }
    }
}