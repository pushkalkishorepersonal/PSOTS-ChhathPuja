/**
 * ════════════════════════════════════════════════════
 *  PSOTS_DB — Database service with 3-layer cache
 *
 *  Read order (fastest → authoritative):
 *    Layer 1 · Memory cache  — sub-millisecond, lives until page close
 *    Layer 2 · localStorage  — instant, persists across reloads (TTL: 1 hour)
 *    Layer 3 · Firestore     — ~50 ms, PRIMARY persistent store
 *    Layer 4 · Apps Script   — 1-2 s, secondary fallback + Google Sheets backup
 *
 *  Write order:
 *    Memory + localStorage  → immediate (user sees instant feedback)
 *    Firestore              → PRIMARY async write (source of truth)
 *    Apps Script / Sheet    → SECONDARY async write (backup/export)
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

  /* ════════════════════════════════════════════════════
     CONTRIBUTIONS API
  ════════════════════════════════════════════════════ */

  /**
   * getContributions(flat) → array of records or null
   *
   * Returns all contribution records for a given flat from Firestore.
   * Returns null (not empty array) if Firestore is unavailable — callers
   * should fall back to history.json / Apps Script in that case.
   */
  async function getContributions(flat) {
    if (!_db || !flat) return null;
    try {
      const snap = await _db.collection('contributions')
        .where('flat', '==', String(flat))
        .get();
      return snap.docs.map(d => d.data());
    } catch (e) {
      console.warn('[PSOTS_DB] getContributions failed:', e.message);
      return null;
    }
  }

  /**
   * getResident(flat) → resident object or null
   *
   * Fetches a single resident from Firestore by flat number.
   * Returns null if not found or Firestore unavailable.
   */
  async function getResident(flat) {
    if (!_db || !flat) return null;
    try {
      const id   = String(flat).replace(/[^a-zA-Z0-9]/g, '_');
      const snap = await _db.collection('residents').doc(id).get();
      return snap.exists ? snap.data() : null;
    } catch (e) {
      console.warn('[PSOTS_DB] getResident failed:', e.message);
      return null;
    }
  }

  /**
   * upsertResident(flat, data) → { ok }
   *
   * Creates or merges a single resident document in Firestore.
   * Called when a resident saves their portal profile.
   */
  async function upsertResident(flat, data) {
    if (!_db || !flat) return { ok: false, error: 'No flat or Firestore not ready' };
    try {
      const id = String(flat).replace(/[^a-zA-Z0-9]/g, '_');
      await _db.collection('residents').doc(id).set({
        flat:     String(flat),
        name:     data.name     || '',
        mobile:   data.mobile   || '',
        tower:    data.tower    || '',
        total:    Number(data.total)    || 0,
        lastYear: Number(data.lastYear) || 0,
        isVrati:  Boolean(data.isVrati),
      }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.warn('[PSOTS_DB] upsertResident failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * syncResidents(residents) → { ok, written }
   *
   * Bulk-writes the residents directory to Firestore.
   * Document ID = sanitised flat number — idempotent on re-sync.
   * Strips the internal `contributions` and `names` arrays (redundant in Firestore).
   */
  async function syncResidents(residents) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      const BATCH_SIZE = 400;
      let written = 0;
      for (let i = 0; i < residents.length; i += BATCH_SIZE) {
        const batch = _db.batch();
        residents.slice(i, i + BATCH_SIZE).forEach(r => {
          const id = String(r.flat || '').replace(/[^a-zA-Z0-9]/g, '_');
          if (!id) return;
          const ref = _db.collection('residents').doc(id);
          batch.set(ref, {
            flat:     String(r.flat     || ''),
            name:     r.name     || '',
            mobile:   r.mobile   || '',
            tower:    r.tower    || '',
            total:    Number(r.total)    || 0,
            lastYear: Number(r.lastYear) || 0,
            isVrati:  Boolean(r.isVrati),
          }, { merge: true });
        });
        await batch.commit();
        written += Math.min(BATCH_SIZE, residents.length - i);
      }
      return { ok: true, written };
    } catch (e) {
      console.warn('[PSOTS_DB] syncResidents failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * syncContributions(records) → { ok, written }
   *
   * Bulk-writes contribution records to Firestore using deterministic
   * document IDs so re-syncing is safe (idempotent).
   * Processes in batches of 400 (Firestore limit is 500).
   */
  async function syncContributions(records) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      const BATCH_SIZE = 400;
      let written = 0;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = _db.batch();
        records.slice(i, i + BATCH_SIZE).forEach(r => {
          const key = [
            r.year,
            String(r.flat  || '').replace(/\//g, '-'),
            String(r.name  || '').replace(/\s+/g, '').toLowerCase().slice(0, 12),
            r.amount,
          ].join('_').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 120);
          const ref = _db.collection('contributions').doc(key);
          batch.set(ref, {
            flat:   String(r.flat   || ''),
            year:   Number(r.year)  || 0,
            name:   r.name   || '',
            amount: Number(r.amount) || 0,
            date:   r.date   || '',
            method: r.method || '',
            status: r.status || '',
            mobile: r.mobile || '',
          }, { merge: true });
        });
        await batch.commit();
        written += Math.min(BATCH_SIZE, records.length - i);
      }
      return { ok: true, written };
    } catch (e) {
      console.warn('[PSOTS_DB] syncContributions failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  _init();

  const api = { getProfile, saveProfile, patchProfile, invalidateProfile, getContributions, syncContributions, getResident, upsertResident, syncResidents };
  Object.defineProperty(api, 'isFirestoreReady', { get: () => _ready });
  return api;
})();
