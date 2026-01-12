export const defaultStats = {
    // Session Data
    currentSession: {
        isActive: false,
        startTime: 0,
        durationMinutes: 0, // Total time allowed
        waterGoalML: 0,
        totalCups: 0,
        cupsDrank: 0,
        drinkHistory: [], // Timestamps of drinks to enforce rate limit
        rateLimitWindow: 5, // Minutes (default, will be overwritten by session calc)
        monsterId: 'shadow_beast',
        status: 'idle' // 'idle', 'running', 'won', 'lost'
    },
    // Persistent Data
    trophies: [], // History of won sessions { date, monsterId, difficulty }
    totalWaterDrankML: 0,
    sessionsCompleted: 0,
    gold: 0,
    unlockedMonsters: ['sand_slime', 'cactus_golem', 'dust_phoenix', 'drought_king']
};

export const MONSTER = {
    id: 'shadow_beast',
    name: "Shadow Beast",
    baseHp: 100, // Scaled by session difficulty
    icon: "👹"
};

// Helper: Check if User is Rate Limited
// Max 2 drinks per WINDOW (where window is dynamic)
export function isRateLimited(drinkHistory, windowMinutes) {
    if (!windowMinutes) windowMinutes = 5; // Fallback
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // Filter drinks from the last window
    const recentDrinks = drinkHistory.filter(t => t > (now - windowMs));

    // Allow 2 drinks per window
    return recentDrinks.length >= 2;
}
