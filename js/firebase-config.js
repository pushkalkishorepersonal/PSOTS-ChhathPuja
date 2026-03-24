/**
 * ════════════════════════════════════════════════════
 *  PSOTS Firebase Configuration — Step 1: Profiles
 *
 *  HOW TO SET UP (one-time, ~5 minutes):
 *  1. Go to https://console.firebase.google.com
 *  2. Create a new project (e.g. "psots-chhath")
 *  3. Click "Web" icon to add a web app → copy the config object
 *  4. Paste the values below
 *  5. In Firebase Console → Firestore Database → Create database (production mode)
 *  6. Deploy firestore.rules from the repo root
 *
 *  Leave all values as "FILL_IN" to keep using Apps Script (safe fallback).
 * ════════════════════════════════════════════════════
 */
window.PSOTS_FIREBASE_CONFIG = {
  apiKey:            'FILL_IN',
  authDomain:        'FILL_IN.firebaseapp.com',
  projectId:         'FILL_IN',
  storageBucket:     'FILL_IN.firebasestorage.app',
  messagingSenderId: 'FILL_IN',
  appId:             'FILL_IN',
};
