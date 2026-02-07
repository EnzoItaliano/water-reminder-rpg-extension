import { defaultStats } from './js/stats.js';

// 1. Initialize stats on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["userStats"], (data) => {
    if (!data.userStats || !data.userStats.currentSession) {
      chrome.storage.local.set({ userStats: defaultStats });
    }
  });
});

// 2. Alarm Listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sessionTimeout") {
    handleSessionTimeout();
  } else if (alarm.name === "drinkReminder") {
    chrome.notifications.create("drink-water", {
      type: "basic",
      iconUrl: "icons/icon.png",
      title: "Drink Water!",
      message: "It's time to drink a cup of water to defeat the monster!"
    });
  }
});

function handleSessionTimeout() {
  chrome.storage.local.get(["userStats"], (data) => {
    if (!data.userStats) return;

    let stats = data.userStats;
    let session = stats.currentSession;

    // Only process if still running
    if (session.isActive && session.status === 'running') {
      // Mark as Lost
      session.isActive = false;
      session.status = 'lost';

      // Clear alarms
      chrome.alarms.clear("drinkReminder");

      // Save and Notify
      chrome.storage.local.set({ userStats: stats }, () => {
        chrome.notifications.create("session-timeout", {
          type: "basic",
          iconUrl: "icons/icon.png", // Ensure this icon exists or use fallback
          title: "Session Failed!",
          message: "The monster escaped! You didn't drink enough water in time."
        });
      });
    }
  });
}
