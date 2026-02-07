import { firebaseConfig } from './firebase-config.js';
// We import from the local downloaded files. 
// adjustments to paths might be needed if they have internal imports.
import { initializeApp } from './firebase/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from './firebase/firebase-auth.js';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from './firebase/firebase-firestore.js';

let app;
let auth;
let db;

export function initFirebase() {
    if (!app) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase Initialized");
    }
    return { app, auth, db };
}

// --- AUTH ---

export function registerUser(email, password) {
    if (!auth) initFirebase();
    return createUserWithEmailAndPassword(auth, email, password);
}

export function loginUser(email, password) {
    if (!auth) initFirebase();
    return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser() {
    if (!auth) initFirebase();
    return signOut(auth);
}

export function monitorAuth(callback) {
    if (!auth) initFirebase();
    onAuthStateChanged(auth, callback);
}

// --- DATA SYNC ---

// Push local stats to Cloud
export async function pushStatsToCloud(user, localStats, bankGold, deviceId, deviceType = 'browser_extension') {
    if (!user) throw new Error("No user logged in");
    if (!db) initFirebase();

    const userRef = doc(db, "users", user.uid);

    // We save the WHOLE stats object plus bank info
    // We add a timestamp to help with merge logic later if needed
    // We also store device-specific metadata
    const updateData = {
        bankGold: bankGold,
        lastUpdated: serverTimestamp()
    };

    if (localStats) {
        updateData.stats = localStats;
    }

    if (deviceId) {
        updateData[`devices.${deviceId}`] = {
            lastUpdated: serverTimestamp(),
            type: deviceType
        };
    }

    await setDoc(userRef, updateData, { merge: true }); // Merge true safely updates fields
}

// Pull stats from Cloud
export async function pullStatsFromCloud(user) {
    if (!user) throw new Error("No user logged in");
    if (!db) initFirebase();

    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null; // New user on cloud
    }
}
