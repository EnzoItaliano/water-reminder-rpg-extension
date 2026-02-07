require('dotenv').config();
const fs = require('fs');
const path = require('path');

const configContent = `// Firebase Configuration
// REPLACE these values with your actual project config from the Firebase Console!

export const firebaseConfig = {
    apiKey: "${process.env.FIREBASE_API_KEY}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
    projectId: "${process.env.FIREBASE_PROJECT_ID}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${process.env.FIREBASE_APP_ID}"
};
`;

const outputPath = path.join(__dirname, '../js/firebase-config.js');

fs.writeFileSync(outputPath, configContent);

console.log(`Firebase config generated at ${outputPath}`);
