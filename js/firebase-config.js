/**
 * ════════════════════════════════════════════════════
 *  PSOTS Firebase Configuration — Step 2: Full Auth
 *
 *  HOW TO SET UP (one-time, ~5 minutes):
 *  1. Go to https://console.firebase.google.com
 *  2. Create a new project (e.g. "psots-chhath")
 *  3. Click "Web" icon to add a web app → copy the config object
 *  4. Paste the values below
 *  5. Firebase Console → Firestore Database → Create database (production mode)
 *  6. Firebase Console → Authentication → Sign-in method → enable:
 *       • Google  (authorised domains: chhath.psots.in, psots-chhathpuja.pages.dev)
 *       • Email/Password + Email link (passwordless)
 *  7. firebase deploy --only firestore:rules,firestore:indexes
 *
 *  Leave all values as "FILL_IN" to keep using Apps Script (safe fallback).
 * ════════════════════════════════════════════════════
 */
window.PSOTS_FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAvD-6yoDN5x8vMT8LgIFi7WDjKX2uoIZY',
  authDomain:        'psots-chhath.firebaseapp.com',
  projectId:         'psots-chhath',
  storageBucket:     'psots-chhath.firebasestorage.app',
  messagingSenderId: '379285397692',
  appId:             '1:379285397692:web:dbd36403ee0b5e076eb0b9',
  measurementId:     'FILL_IN',  // Firebase Console → Analytics → Data streams → Measurement ID

  // App Check: Firebase Console → App Check → Register app → reCAPTCHA v3
  // Then Google Cloud Console → APIs → reCAPTCHA Enterprise → create site key
  // Paste the SITE key (not secret key) here:
  appCheckSiteKey:   'FILL_IN',
};

/* ── Firebase Auth initialisation (runs after SDK loads) ──────────────── */
(function _psInitAuth() {
  if (typeof firebase === 'undefined') return;

  const cfg = window.PSOTS_FIREBASE_CONFIG;
  if (!cfg || cfg.apiKey === 'FILL_IN') return;

  try {
    /* ── 1. Ensure app is initialised (db.js may already do this) ─── */
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    const auth = firebase.auth();

    /* ── 1a. App Check — protect Firestore quota from bots ───────── */
    //  Requires firebase-app-check-compat.js loaded before this script.
    //  reCAPTCHA v3 is invisible to users (no checkbox/challenge).
    //  Get your site key: Firebase Console → App Check → Apps → register.
    if (typeof firebase.appCheck === 'function'
        && cfg.appCheckSiteKey && cfg.appCheckSiteKey !== 'FILL_IN') {
      try {
        firebase.appCheck().activate(
          new firebase.appCheck.ReCaptchaV3Provider(cfg.appCheckSiteKey),
          true  // auto-refresh tokens in background
        );
        console.info('[PSOTS AppCheck] reCAPTCHA v3 active ✓');
      } catch (acErr) {
        console.warn('[PSOTS AppCheck] Activation failed:', acErr.message);
      }
    }

    /* ── 1b. Analytics — page-view tracking ──────────────────────── */
    //  Requires firebase-analytics-compat.js loaded before this script.
    //  Measurement ID: Firebase Console → Project Settings → Web app → Data streams.
    if (typeof firebase.analytics === 'function'
        && cfg.measurementId && cfg.measurementId !== 'FILL_IN') {
      try {
        firebase.analytics();
        console.info('[PSOTS Analytics] ready ✓');
      } catch (anErr) {
        console.warn('[PSOTS Analytics] Init failed:', anErr.message);
      }
    }

    /* ── 2. Persist session across browser restarts ───────────────── */
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

    /* ── 3. Handle Email Link sign-in redirect ────────────────────── */
    //  When the user clicks the sign-in email link, Firebase redirects
    //  them back to the page they were on (window.location.href).
    //  Detect this early and complete sign-in silently.
    if (auth.isSignInWithEmailLink(window.location.href)) {
      const email = localStorage.getItem('psots_email_for_signin');
      if (email) {
        // Fade out briefly while we complete auth so the page doesn't flash
        document.documentElement.style.opacity = '0.4';
        auth.signInWithEmailLink(email, window.location.href)
          .then(function (result) {
            localStorage.removeItem('psots_email_for_signin');
            // Remove Firebase query params from the URL (cosmetic)
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            // Sync to localStorage for backward compatibility
            _psStoreUser(result.user, 'email_link');
            document.documentElement.style.opacity = '';
            location.reload(); // reload so all page scripts reinit with user
          })
          .catch(function () {
            document.documentElement.style.opacity = '';
            localStorage.removeItem('psots_email_for_signin');
            // Will fall through to normal gate — user sees "link expired" message
          });
      }
    }

    /* ── 4. Sync Firebase Auth state → localStorage ───────────────── */
    //  If Firebase Auth has a session (e.g. user opened new tab, or token
    //  was refreshed), write it to localStorage so existing page code
    //  that reads psots_user continues to work without changes.
    auth.onAuthStateChanged(function (fbUser) {
      if (fbUser) {
        const stored = _psGetStoredUser();
        // Only overwrite if UID doesn't already match (avoid needless churn)
        if (!stored || stored.id !== fbUser.uid) {
          _psStoreUser(fbUser,
            fbUser.providerData[0] ? fbUser.providerData[0].providerId : 'firebase');
        }
        window.PSOTS_AUTH_UID = fbUser.uid;
      } else {
        window.PSOTS_AUTH_UID = null;
      }
    });

    window.PSOTS_AUTH_READY = true;
    console.info('[PSOTS Auth] Firebase Auth ready ✓');

  } catch (e) {
    console.warn('[PSOTS Auth] Firebase Auth init failed:', e.message);
  }
})();

/* ── Helpers ───────────────────────────────────────────────────────────── */
function _psStoreUser(fbUser, provider) {
  try {
    const u = {
      id:        fbUser.uid,
      name:      fbUser.displayName || (fbUser.email || '').split('@')[0],
      email:     fbUser.email || '',
      picture:   fbUser.photoURL || null,
      loginTime: Date.now(),
      provider:  provider || 'firebase',
    };
    localStorage.setItem('psots_user', JSON.stringify(u));
    return u;
  } catch (e) { return null; }
}

function _psGetStoredUser() {
  try { return JSON.parse(localStorage.getItem('psots_user') || 'null'); } catch (e) { return null; }
}

/* ── Global sign-out helper (called from portal/admin sign-out buttons) ── */
window.PSOTS_SIGN_OUT = function () {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      firebase.auth().signOut().catch(() => {});
    }
  } catch (e) {}
  localStorage.removeItem('psots_user');
  localStorage.removeItem('psots_admin_user');
};
