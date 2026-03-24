/**
 * ════════════════════════════════════════════════════
 *  PSOTS_DB — Database service with 3-layer cache
 *
 *  Read order (fastest → authoritative):
 *    Layer 1 · Memory cache  — sub-millisecond, lives until page close
 *    Layer 2 · localStorage  — instant, persists across reloads (TTL: 1 hour)
 *    Layer 3 · Firestore     — ~50 ms, source of truth (needs firebase-config.js)
 *    Layer 4 · Apps Script   — 1-2 s, legacy fallback (always available)
 *
 *  Write order (all layers updated together):
 *    Memory + localStorage  → immediate (user sees instant feedback)
 *    Firestore              → async background write
 *    Apps Script            → async background write (backup / export)
 *
 *  Usage:
 *    const profile = await PSOTS_DB.getProfile(userId);
 *    await PSOTS_DB.saveProfile(userId, profileData);
 *    PSOTS_DB.isFirestoreReady  // true once Firestore is configured & online
 * ════════════════════════════════════════════════════
 */
const PSOTS_DB = (() => {
  'use strict';

  /* ── Constants ───────────────────────────────────── */
  const PROFILE_TTL = 60 * 60 * 1000;   // 1 hour — skip network fetch if cache is fresh
  const LS_PREFIX   = 'psots_profile_';

  /* ── Layer 1: in-memory cache ────────────────────── */
  const _mem = new Map();

  /* ── Layer 3: Firestore ──────────────────────────── */
  let _db    = null;
  let _ready = false;  // flips to true once Firestore is connected

  /* ── Initialise Firebase / Firestore ─────────────── */
  function _init() {
    const cfg = window.PSOTS_FIREBASE_CONFIG;
    if (!cfg || cfg.apiKey === 'FILL_IN') {
      console.info('[PSOTS_DB] Firebase config not set — using Apps Script fallback.');
      return;
    }
    if (typeof firebase === 'undefined') {
      console.warn('[PSOTS_DB] Firebase SDK not loaded. Make sure the <script> tags come before db.js.');
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      _db = firebase.firestore();

      _db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
          _ready = true;
          console.info('[PSOTS_DB] Firestore ready ✓ (offline persistence enabled)');
        })
        .catch(err => {
          // FAILED_PRECONDITION = multiple tabs open; still works without persistence
          // UNIMPLEMENTED       = browser does not support IndexedDB (rare)
          console.warn('[PSOTS_DB] Persistence unavailable (' + err.code + ') — still online-only.');
          _ready = true;
        });
    } catch (e) {
      console.warn('[PSOTS_DB] Firestore init error:', e);
    }
  }

  /* ── localStorage helpers ────────────────────────── */
  function _lsGet(uid) {
    try { return JSON.parse(localStorage.getItem(LS_PREFIX + uid)); } catch (e) { return null; }
  }
  function _lsSet(uid, data) {
    try { localStorage.setItem(LS_PREFIX + uid, JSON.stringify(data)); } catch (e) {}
  }
  function _lsDel(uid) {
    try { localStorage.removeItem(LS_PREFIX + uid); } catch (e) {}
  }

  /* ── Strip internal cache keys before writing to Firestore ── */
  function _toFirestore(data) {
    const { _fetchedAt, _updatedAt, ...clean } = data;
    return clean;
  }

  /* ════════════════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════════════════ */

  /**
   * getProfile(uid) → profile object or null
   *
   * Reads through cache layers; only hits Firestore when localStorage is stale.
   */
  async function getProfile(uid) {
    if (!uid) return null;
    const memKey = 'profile:' + uid;

    // Layer 1 — memory
    if (_mem.has(memKey)) return _mem.get(memKey);

    // Layer 2 — localStorage (fresh within TTL)
    const local = _lsGet(uid);
    if (local && local._fetchedAt && (Date.now() - local._fetchedAt) < PROFILE_TTL) {
      _mem.set(memKey, local);
      return local;
    }

    // Layer 3 — Firestore
    if (_db) {
      try {
        const snap = await _db.collection('profiles').doc(uid).get();
        if (snap.exists) {
          const data = { ...snap.data(), _fetchedAt: Date.now() };
          _mem.set(memKey, data);
          _lsSet(uid, data);
          return data;
        }
        // doc doesn't exist yet — fall through
      } catch (e) {
        console.warn('[PSOTS_DB] Firestore read failed, will use Apps Script fallback:', e.message);
      }
    }

    // Layer 4 — return stale local copy rather than nothing (caller also has Apps Script fallback)
    if (local) {
      _mem.set(memKey, local);
      return local;
    }
    return null;  // caller falls back to Apps Script
  }

  /**
   * saveProfile(uid, data) → { ok, source }
   *
   * Writes instantly to memory + localStorage, then async to Firestore.
   * Apps Script sync is handled by the caller so it can also send the POST.
   */
  async function saveProfile(uid, data) {
    if (!uid) return { ok: false, error: 'No uid' };

    const payload = { ...data, _fetchedAt: Date.now(), _updatedAt: Date.now() };

    // Instant layers
    _mem.set('profile:' + uid, payload);
    _lsSet(uid, payload);

    // Async Firestore write
    if (_db) {
      try {
        await _db.collection('profiles').doc(uid).set(_toFirestore(payload), { merge: true });
        return { ok: true, source: 'firestore' };
      } catch (e) {
        console.warn('[PSOTS_DB] Firestore save failed (data safe in localStorage):', e.message);
        return { ok: true, source: 'local', warning: e.message };
      }
    }

    return { ok: true, source: 'local' };
  }

  /**
   * patchProfile(uid, fields) → { ok, source }
   *
   * Merges partial fields into the cached profile and writes through.
   * Useful for quick updates (WA opt-in, flat lookup) without re-saving everything.
   */
  async function patchProfile(uid, fields) {
    const existing = (await getProfile(uid)) || {};
    return saveProfile(uid, { ...existing, ...fields });
  }

  /**
   * invalidateProfile(uid)
   *
   * Clears memory + localStorage cache for this user.
   * Call this when you want to force a fresh Firestore/Apps Script fetch on next read.
   */
  function invalidateProfile(uid) {
    _mem.delete('profile:' + uid);
    _lsDel(uid);
  }

  _init();

  const api = { getProfile, saveProfile, patchProfile, invalidateProfile };
  Object.defineProperty(api, 'isFirestoreReady', { get: () => _ready });
  return api;
})();
