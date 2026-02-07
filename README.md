# HydroQuest ⚔️ 🥤
**HydroQuest** is a gamified Chrome extension that transforms your daily hydration habits into an epic RPG adventure. Inspired by productivity apps like Forest, HydroQuest replaces simple timers with high-stakes monster battles. To defeat the thirst-themed beasts of the desert, you must drink water in the real world.

## 🎮 How it Works
1. **Prepare for Battle:** Set your water goal (liters) and the session duration (hours).

2. **Choose Your Foe:** Select which monster you want to hunt. High-volume sessions summon more powerful, higher-level versions of the monsters.

3. **Fight with Every Sip:** Every time you drink a cup of water, click the "Drink Water" button. Your hydration deals direct damage to the monster.

4. **Victory or Defeat:**
    - **Victory:** You defeat the monster the moment you reach your water goal (total cups). Claim your gold and a trophy for your Hall of Fame.
    - **Defeat:** If the timer hits zero before you finish your water goal, the monster escapes.

5. **Healthy Pacing:** To ensure safe hydration, a built-in "Cooldown" prevents you from logging too many drinks in a short window.

## ✨ Key Features
- **Dynamic Monster Scaling:** Monsters like the Sand Slime, Cactus Golem, Dust Phoenix, and Drought King evolve through 6 visual levels based on session difficulty.

- **Persistent Progress:** Earn Gold from victories to unlock new, rarer monsters in the Monster Shop.

- **Hall of Fame:** A dedicated Trophy Room tracks every unique monster and difficulty level you have conquered.

- **Immersive Reminders:** Custom browser notifications nudge you to take a sip when you're falling behind in a battle.

- **Clean Experience:** Focus on the battle with a clear UI that tracks your progress without intrusive browser filters.

- **Cloud Sync (NEW):** Securely back up your RPG progress to the cloud. Sign in to sync your gold, unlocked monsters, and hard-earned trophies across different devices.

## 🛠️ Installation
1. Download or clone this repository.

2. Open Chrome and navigate to ```chrome://extensions/```.

3. Enable **"Developer mode"** in the top right corner.

4. Click **"Load unpacked"** and select the ```water-reminder-rpg-extension``` folder.

5. Pin **HydroQuest** to your toolbar and start your first hunt!

## 📜 About the Project
**HydroQuest** was developed as a creative solution to "reminder fatigue". While most water trackers feel like a chore, HydroQuest uses the psychological hooks of RPG progression—leveling, loot, and high-stakes encounters—to make drinking water something you want to do.

**Technical Stack:**

- **Core:** JavaScript (ES6 Modules), HTML5, CSS3.
- **Backend:** Firebase Authentication for user accounts and Cloud Firestore for secure, real-time data synchronization.
- **Chrome APIs:** ```alarms``` for session timing, ```notifications``` for hydration alerts, and ```storage``` for persistent RPG data.
- **Visuals:** Custom pixel art sprites generated with the assistance of AI tools, featuring CSS-driven "breathing" animations.

## 🛡️ License
This project is open-source. See the LICENSE file for details.

Stay Hydrated. Stay Adventurous. 🏜️ 🥤
