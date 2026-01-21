import { defaultStats, isRateLimited } from './stats.js';

export function updateUI(stats) {
    const session = stats.currentSession;

    // 1. Determine which view to show
    let activeView = 'view-config';
    if (session.status === 'running') activeView = 'view-running';
    if (session.status === 'won' || session.status === 'lost') activeView = 'view-result';

    // Check if we are currently in Trophies or Store to avoid kicking user out on background updates?
    const trophyView = document.getElementById('view-trophies');
    const isTrophyOpen = trophyView && trophyView.classList.contains('active');

    const storeView = document.getElementById('view-store');
    const isStoreOpen = storeView && storeView.classList.contains('active');

    // Only switch if neither modal view is open, OR if a status change forces it (e.g. running -> won)
    if ((!isTrophyOpen && !isStoreOpen) || (session.status === 'won' || session.status === 'lost')) {
        switchView(activeView);
    }

    updateConfigView(stats);
    updateRunningView(stats);
    updateResultView(stats);
}

function updateConfigView(stats) {
    const litersInput = document.getElementById('input-liters');
    const hoursInput = document.getElementById('input-hours');

    if (litersInput && hoursInput) {
        const liters = parseFloat(litersInput.value);
        const cups = Math.ceil((liters * 1000) / 250);
        document.getElementById('calc-cups').innerText = cups;

        // Simple difficulty calc: Based on Volume (Total Cups)
        const difficulty = Math.max(1, Math.min(10, cups - 3));
        document.getElementById('calc-difficulty').innerText = difficulty;

        // Update Time Display Text if it exists
        const timeDisplay = document.getElementById('time-display-text');
        if (timeDisplay) {
            const hours = parseFloat(hoursInput.value);
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            timeDisplay.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }

        updateMonsterPreview();
    }
}

// Helper to get difficulty level suffix
function getLevelSuffix(difficulty) {
    let fileSuffix = '1';
    if (difficulty >= 3) fileSuffix = '2';
    if (difficulty >= 5) fileSuffix = '3';
    if (difficulty >= 7) fileSuffix = '4';
    if (difficulty >= 9) fileSuffix = '6';
    return fileSuffix;
}

export function updateMonsterPreview(monsterObj = null) {
    const previewEl = document.getElementById('monster-preview-sprite');
    const nameEl = document.getElementById('monster-name-display');

    if (!previewEl) return;

    // If monsterObj is provided (from game.js), update the data-id
    if (monsterObj) {
        previewEl.dataset.monsterId = monsterObj.id;
        if (nameEl) nameEl.innerText = monsterObj.name;
    }

    // Get current ID
    const monsterId = previewEl.dataset.monsterId || 'sand_slime';

    // Get current difficulty
    const difficulty = parseInt(document.getElementById('calc-difficulty')?.innerText || "1");
    const suffix = getLevelSuffix(difficulty);

    previewEl.style.backgroundImage = `url('icons/${monsterId}/level_${suffix}.png')`;
}

function updateRunningView(stats) {
    const session = stats.currentSession;
    if (session.status !== 'running') return;

    // Timer
    const now = Date.now();
    const elapsed = now - session.startTime;
    const remaining = (session.durationMinutes * 60 * 1000) - elapsed;

    const minutes = Math.floor(Math.max(0, remaining) / 60000);
    const seconds = Math.floor((Math.max(0, remaining) % 60000) / 1000);
    document.getElementById('timer-display').innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Time Bar (Blue)
    const timePercent = Math.max(0, (remaining / (session.durationMinutes * 60 * 1000)) * 100);
    document.getElementById('time-bar').firstElementChild.style.width = `${timePercent}%`;

    // Water (Cyan)
    const waterPercent = Math.min(100, (session.cupsDrank / session.totalCups) * 100);
    document.getElementById('water-display').innerText = `${session.cupsDrank} / ${session.totalCups} Cups`;
    document.getElementById('water-bar').firstElementChild.style.width = `${waterPercent}%`;

    // Monster HP (Red)
    const monsterPercent = 100 - waterPercent;
    document.getElementById('monster-hp-bar').firstElementChild.style.width = `${monsterPercent}%`;

    // Dynamic Monster Image based on Difficulty
    const monsterEl = document.querySelector('.monster-sprite');
    if (monsterEl) {
        const diff = session.difficulty || 1;
        const fileSuffix = getLevelSuffix(diff);

        monsterEl.style.backgroundImage = `url('icons/${session.monsterId}/level_${fileSuffix}.png')`;
    }

    // Rate Limit Check
    const btnDrink = document.getElementById('btn-drink');
    const limitMsg = document.getElementById('rate-limit-msg');

    if (isRateLimited(session.drinkHistory, session.rateLimitWindow)) {
        btnDrink.disabled = true;
        btnDrink.style.background = "#7f8c8d";
        btnDrink.innerText = "COOLDOWN";
        limitMsg.style.display = 'block';
    } else {
        btnDrink.disabled = false;
        btnDrink.style.background = "#3498db";
        btnDrink.innerText = "🥤 DRINK WATER";
        limitMsg.style.display = 'none';
    }
}

function updateResultView(stats) {
    const session = stats.currentSession;
    const title = document.getElementById('result-title');
    const msg = document.getElementById('result-msg');
    const btn = document.getElementById('btn-return');

    if (session.status === 'won') {
        title.innerText = "VICTORY!";
        title.style.color = "#f1c40f";
        msg.innerText = "You defeated the monster!";
        btn.innerText = "CLAIM TROPHY";
    } else if (session.status === 'lost') {
        title.innerText = "DEFEAT";
        title.style.color = "#c0392b";
        msg.innerText = "The monster escaped...";
        btn.innerText = "TRY AGAIN";
    }
}

export function switchView(viewName) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewName).classList.add('active');
}

export function renderTrophies(stats, monsters = []) {
    const list = document.getElementById('trophy-list');
    list.innerHTML = '';
    list.className = '';

    if (!monsters || monsters.length === 0) {
        list.innerHTML = '<div class="pixel-text" style="text-align:center; color:#777;">No monsters found...</div>';
        return;
    }

    // Visual Levels we want to track
    const LEVELS = [1, 2, 3, 4, 5, 6];

    monsters.forEach(monster => {
        const row = document.createElement('div');
        row.className = 'trophy-row';

        // Filter wins for this monster
        const monsterWins = stats.trophies.filter(t => t.monsterId === monster.id);

        let iconsHtml = '';
        LEVELS.forEach(lvl => {
            const matchesLevel = (difficulty, level) => {
                if (level === 1) return difficulty >= 1 && difficulty <= 2;
                if (level === 2) return difficulty >= 3 && difficulty <= 4;
                if (level === 3) return difficulty >= 5 && difficulty <= 6;
                if (level === 4) return difficulty >= 7 && difficulty <= 8;
                if (level === 5) return difficulty === 9;
                if (level === 6) return difficulty === 10;
                return false;
            };

            // Count wins for this specific level slot
            const wins = monsterWins.filter(w => matchesLevel(w.difficulty, lvl)).length;
            const isUnlocked = wins > 0;

            iconsHtml += `
                <div class="level-icon-wrapper">
                    <div class="level-icon ${isUnlocked ? 'unlocked' : ''}" 
                         style="background-image: url('icons/${monster.id}/level_${lvl}.png');">
                    </div>
                    ${isUnlocked ? `<div class="win-badge">${wins}</div>` : ''}
                </div>
            `;
        });

        row.innerHTML = `
            <div class="trophy-info">
                <div class="pixel-text" style="color: #bdc3c7;">${monster.name}</div>
                <div class="pixel-text" style="font-size: 6px; color: #7f8c8d;">Total Wins: ${monsterWins.length}</div>
            </div>
            <div class="trophy-icons">
                ${iconsHtml}
            </div>
        `;

        list.appendChild(row);
    });
}

export function renderStore(stats, allMonsters = []) {
    const list = document.getElementById('store-list');
    const goldDisplay = document.getElementById('store-gold-display');
    if (!list) return;

    list.innerHTML = '';

    // Safety check for stats.gold
    const currentGold = (typeof stats.gold !== 'undefined') ? stats.gold : 0;
    if (goldDisplay) goldDisplay.innerText = currentGold;

    // Filter to find purchasable monsters
    const unlocked = stats.unlockedMonsters || [];
    const purchasable = allMonsters.filter(m => !unlocked.includes(m.id));

    // Switch to Carousel Layout
    list.className = 'carousel-list';

    // Render Real Items
    purchasable.forEach(monster => {
        const card = createStoreCard(monster, currentGold);
        list.appendChild(card);
    });

    // Render 9 Placeholders
    for (let i = 0; i < 3; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'store-card';
        placeholder.innerHTML = `
            <div class="store-icon" style="display: flex; align-items: center; justify-content: center; font-size: 20px; color: #777;">?</div>
            <div class="pixel-text" style="font-size: 8px; color: #777;">Coming Soon</div>
            <div class="pixel-text" style="color: #555; font-size: 8px;">---</div>
            <button class="store-btn" disabled style="background: #333; border-bottom: 2px solid #222; color: #555;">
                LOCKED
            </button>
        `;
        list.appendChild(placeholder);
    }
}

function createStoreCard(monster, currentGold) {
    const card = document.createElement('div');
    card.className = 'store-card';

    const cost = monster.cost || 100;
    const canAfford = currentGold >= cost;

    card.innerHTML = `
        <div class="store-icon" style="background-image: url('icons/${monster.id}/level_1.png');"></div>
        <div class="pixel-text" style="font-size: 8px; height: 20px; display: flex; align-items: center; justify-content: center;">${monster.name}</div>
        <div class="pixel-text" style="color: #f1c40f; font-size: 8px;">💰 ${cost}</div>
        <button class="store-btn" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? 'BUY' : 'NEED GOLD'}
        </button>
    `;

    const btn = card.querySelector('button');
    if (canAfford) {
        btn.addEventListener('click', () => {
            const event = new CustomEvent('request-buy-monster', {
                detail: { id: monster.id, cost: cost }
            });
            document.dispatchEvent(event);
        });
    }
    return card;
}
