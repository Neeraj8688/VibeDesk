import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* 
   !!! CRITICAL FIX FOR 0% UPLOADS (CORS ERROR) !!!
   
   If your uploads hang at 0%, you MUST configure CORS on your Firebase Storage bucket.
   You cannot fix this with React code alone. You must use the Google Cloud Console or CLI.
*/

// --- CONFIGURATION HANDLER ---
const getStoredConfig = () => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vibe_firebase_config');
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Could not load stored config", e);
  }
  return null;
};

const storedConfig = getStoredConfig();

const firebaseConfig = storedConfig || {
  apiKey: "AIzaSyBGiF46UGSaP8trgrLREE6Rqya4U1-F0as",
  authDomain: "vibedesk-20dd8.firebaseapp.com",
  projectId: "vibedesk-20dd8",
  storageBucket: "vibedesk-20dd8.firebasestorage.app",
  messagingSenderId: "240227258046",
  appId: "1:240227258046:web:384758f2187a7c56ddd8ef",
  measurementId: "G-DYLCMYGC3N"
};

// Initialize Firebase (Singleton Pattern)
let app;
try {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
} catch (error) {
    console.error("Firebase Initialization Error:", error);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('vibe_firebase_config');
    }
    app = getApps().length ? getApp() : initializeApp(firebaseConfig, "fallback");
}

export const auth = getAuth(app);

// Use standard getFirestore for broad v9/v10 compatibility
export const db = getFirestore(app);

// Enable Offline Persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
      console.warn('Persistence failed: Browser not supported');
    }
  });
}

export const storage = getStorage(app);

// Increase timeouts significantly to help with "slow" connection errors
if (storage) {
    storage.maxUploadRetryTime = 600000; // 10 minutes
    storage.maxOperationRetryTime = 120000; // 2 minutes
}

export const isFirebaseConfigured = () => {
  return firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PASTE_");
};