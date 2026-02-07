import {
    registerUser,
    loginUser,
    logoutUser,
    monitorAuth,
    pushStatsToCloud,
    pullStatsFromCloud
} from './firebase-utils.js';
import { defaultStats } from './stats.js';
import { generateUUIDv7 } from './uuid.js';

// DOM Elements
const authSection = document.getElementById('auth-section');
const syncSection = document.getElementById('sync-section');
const bankSection = document.getElementById('bank-section');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const authStatus = document.getElementById('auth-status');

const userProfile = document.getElementById('user-profile');
const userEmailSpan = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');

const btnSync = document.getElementById('btn-sync');
const syncStatus = document.getElementById('sync-status');

const localGoldSpan = document.getElementById('local-gold');
const bankGoldSpan = document.getElementById('bank-gold');
const depositInput = document.getElementById('deposit-amount');
const btnDeposit = document.getElementById('btn-deposit');
const withdrawInput = document.getElementById('withdraw-amount');
const btnWithdraw = document.getElementById('btn-withdraw');

const btnReset = document.getElementById('btn-reset');

let currentUser = null;
let currentLocalStats = null;
let currentBankGold = 0;
let currentDeviceId = null;
let lastSyncedStats = null;

// --- Initialization ---

async function init() {
    await loadDeviceId();
    await loadLocalStats();
    monitorAuth(onAuthStateChanged);
}

function onAuthStateChanged(user) {
    currentUser = user;
    if (user) {
        // Logged In
        document.getElementById('auth-forms').style.display = 'none';
        userProfile.style.display = 'block';
        userEmailSpan.textContent = user.email;

        syncSection.style.display = 'block';
        bankSection.style.display = 'block';

        // Auto-fetch bank data (part of stats)
        refreshCloudData();
    } else {
        // Logged Out
        document.getElementById('auth-forms').style.display = 'block';
        userProfile.style.display = 'none';

        syncSection.style.display = 'none';
        bankSection.style.display = 'none';
        currentBankGold = 0;
        updateUI();
    }
}

// --- Local Storage Helpers ---

function loadLocalStats() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userStats'], (data) => {
            if (data.userStats) {
                currentLocalStats = data.userStats;
            } else {
                currentLocalStats = JSON.parse(JSON.stringify(defaultStats));
            }
            updateUI();
            resolve(currentLocalStats);
        });
    });
}

function saveLocalStats(stats) {
    currentLocalStats = stats;
    chrome.storage.local.set({ userStats: stats }, () => {
        updateUI();
    });
}

function updateUI() {
    if (currentLocalStats) {
        localGoldSpan.textContent = currentLocalStats.gold || 0;
    }
    bankGoldSpan.textContent = currentBankGold;
}

function loadDeviceId() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['deviceId', 'lastSyncedStats'], (data) => {
            if (data.deviceId) {
                currentDeviceId = data.deviceId;
            } else {
                currentDeviceId = generateUUIDv7();
                chrome.storage.local.set({ deviceId: currentDeviceId });
            }

            if (data.lastSyncedStats) {
                lastSyncedStats = data.lastSyncedStats;
            }
            console.log("Device ID:", currentDeviceId);
            resolve(currentDeviceId);
        });
    });
}

function saveLastSyncedStats(stats) {
    lastSyncedStats = JSON.parse(JSON.stringify(stats));
    chrome.storage.local.set({ lastSyncedStats: stats });
}

// --- Auth Handling ---

btnLogin.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await loginUser(email, password);
        authStatus.textContent = "Login Successful!";
        authStatus.style.color = "lightgreen";
    } catch (error) {
        authStatus.textContent = "Nrrror: " + error.message;
        authStatus.style.color = "red";
    }
});

btnSignup.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await registerUser(email, password);
        authStatus.textContent = "Account Created!";
        authStatus.style.color = "lightgreen";
    } catch (error) {
        authStatus.textContent = "Error: " + error.message;
        authStatus.style.color = "red";
    }
});

btnLogout.addEventListener('click', async () => {
    await logoutUser();
});

// --- Sync Logic (Smart Merge) ---

async function refreshCloudData() {
    if (!currentUser) return;
    try {
        const cloudData = await pullStatsFromCloud(currentUser);
        if (cloudData) {
            currentBankGold = cloudData.bankGold || 0;
            // Optionally, we could auto-sync here, but let's keep it manual or explicitly triggered
            updateUI();
        }
    } catch (e) {
        console.error("Failed to fetch cloud data", e);
    }
}

btnSync.addEventListener('click', async () => {
    if (!currentUser) return;
    syncStatus.textContent = "Syncing...";

    try {
        // 1. Get Latest Cloud
        const cloudData = await pullStatsFromCloud(currentUser);
        const cloudStats = cloudData ? cloudData.stats : null;
        const bank = cloudData ? cloudData.bankGold : 0;
        currentBankGold = bank;

        // 2. Merge
        // Policy:
        // - Unlocked Monsters: Union (Simple Set)
        // - Trophies: Union (Simple Array Length Check/Concat)
        // - XP/Level: Max
        // - Cumulative Stats (Water, Sessions, Cups): DELTA Sync

        let mergedStats = JSON.parse(JSON.stringify(currentLocalStats));

        // Calculate Deltas for Cumulative Stats
        // Delta = Current Local - Last Synced Local (Value we last told the cloud)
        // If no lastSyncedStats, assume 0 contribution previously, so Delta = Current Local
        const baseline = lastSyncedStats || JSON.parse(JSON.stringify(defaultStats));

        const deltaWater = (mergedStats.totalWaterDrankML || 0) - (baseline.totalWaterDrankML || 0);
        const deltaSessions = (mergedStats.sessionsCompleted || 0) - (baseline.sessionsCompleted || 0);
        const deltaCups = (mergedStats.totalCups || 0) - (baseline.totalCups || 0);

        if (cloudStats) {
            // Monsters
            const localMonsters = new Set(mergedStats.unlockedMonsters || []);
            const cloudMonsters = cloudStats.unlockedMonsters || [];
            cloudMonsters.forEach(m => localMonsters.add(m));
            mergedStats.unlockedMonsters = Array.from(localMonsters);

            // Trophies - Keep array with most items (simple merge)
            // Ideally we'd map by ID, but simplified for now
            if ((cloudStats.trophies || []).length > (mergedStats.trophies || []).length) {
                mergedStats.trophies = cloudStats.trophies;
            }

            // Level/XP - Max
            if ((cloudStats.level || 1) > (mergedStats.level || 1)) {
                mergedStats.level = cloudStats.level;
                mergedStats.xp = cloudStats.xp;
            }

            // Cumulative Stats - Add Delta to Cloud Value
            // New Local = Cloud Total + My Delta
            // Wait, this updates LOCAL to reflect cloud + my new work.
            if (deltaWater > 0) mergedStats.totalWaterDrankML = (cloudStats.totalWaterDrankML || 0) + deltaWater;
            else mergedStats.totalWaterDrankML = Math.max(mergedStats.totalWaterDrankML || 0, cloudStats.totalWaterDrankML || 0); // fallback match if no delta

            if (deltaSessions > 0) mergedStats.sessionsCompleted = (cloudStats.sessionsCompleted || 0) + deltaSessions;
            else mergedStats.sessionsCompleted = Math.max(mergedStats.sessionsCompleted || 0, cloudStats.sessionsCompleted || 0);

            if (deltaCups > 0) mergedStats.totalCups = (cloudStats.totalCups || 0) + deltaCups;
            else mergedStats.totalCups = Math.max(mergedStats.totalCups || 0, cloudStats.totalCups || 0);
        }

        // 3. Save Merged to Local
        saveLocalStats(mergedStats);

        // Update Snapshot (We reflect this state as "synced")
        saveLastSyncedStats(mergedStats);

        // 4. Push Merged to Cloud
        // Filter out local-only fields (Session & Gold)
        const statsToPush = JSON.parse(JSON.stringify(mergedStats));
        delete statsToPush.currentSession;
        delete statsToPush.gold;

        // We push the final aggregated value.
        // NOTE: If another device synced just now, we might overwrite. 
        // Real-time delta handling requires Cloud Functions or Transactions.
        // For this extension, "Read-Modify-Write" is acceptable risk given single user.
        await pushStatsToCloud(currentUser, statsToPush, currentBankGold, currentDeviceId, 'browser_extension');

        syncStatus.textContent = "Sync Complete! ✅";
        setTimeout(() => syncStatus.textContent = "", 3000);

    } catch (error) {
        console.error(error);
        syncStatus.textContent = "Sync Failed ❌";
    }
});

// --- Bank Logic ---

btnDeposit.addEventListener('click', async () => {
    if (!currentUser) return;
    const amount = parseInt(depositInput.value);

    if (isNaN(amount) || amount <= 0) return;
    if (currentLocalStats.gold < amount) {
        alert("Not enough gold!");
        return;
    }

    // Optimistic Update
    currentLocalStats.gold -= amount;
    currentBankGold += amount;
    saveLocalStats(currentLocalStats);
    updateUI();
    depositInput.value = '';

    // Push to Cloud (Bank Only Update)
    try {
        await pushStatsToCloud(currentUser, null, currentBankGold, currentDeviceId, 'browser_extension');
    } catch (e) {
        console.error("Deposit failed", e);
        // Rollback? For now, just alert.
        alert("Cloud sync failed. Gold mighi appear desynced until next refresh.");
    }
});

btnWithdraw.addEventListener('click', async () => {
    if (!currentUser) return;
    const amount = parseInt(withdrawInput.value);

    if (isNaN(amount) || amount <= 0) return;
    if (currentBankGold < amount) {
        alert("Not enough gold in bank!");
        return;
    }

    // Optimistic Update
    currentBankGold -= amount;
    currentLocalStats.gold = (currentLocalStats.gold || 0) + amount;
    saveLocalStats(currentLocalStats);
    updateUI();
    withdrawInput.value = '';

    // Push to Cloud (Bank Only Update)
    try {
        await pushStatsToCloud(currentUser, null, currentBankGold, currentDeviceId, 'browser_extension');
    } catch (e) {
        console.error("Withdraw failed", e);
        alert("Cloud sync failed.");
    }
});

btnReset.addEventListener('click', () => {
    if (confirm("Are you sure? This deletes LOCAL data.")) {
        saveLocalStats(JSON.parse(JSON.stringify(defaultStats)));
    }
});

init();
