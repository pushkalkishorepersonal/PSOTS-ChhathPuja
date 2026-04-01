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

  /** Wait up to `ms` milliseconds for _db to be initialised. */
  function _waitForDb(ms = 5000) {
    if (_db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + ms;
      const timer = setInterval(() => {
        if (_db) { clearInterval(timer); resolve(); }
        else if (Date.now() >= deadline) { clearInterval(timer); reject(new Error('Firestore did not initialise within ' + ms + 'ms')); }
      }, 150);
    });
  }

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
      _ready = true; // Firestore instance is usable immediately; persistence is just an enhancement
      console.info('[PSOTS_DB] Firestore ready ✓');

      _db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
          console.info('[PSOTS_DB] Offline persistence enabled');
        })
        .catch(err => {
          // FAILED_PRECONDITION = multiple tabs open; UNIMPLEMENTED = no IndexedDB support
          console.warn('[PSOTS_DB] Persistence unavailable (' + err.code + ') — online-only.');
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
      return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
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
          if (!key) return;  // skip records that would produce an empty document ID
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
            // submittedAt captures the real write time for new records;
            // merge:true means existing records keep their original value
            ...(r.submittedAt ? {} : { submittedAt: Date.now() }),
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

  /**
   * deleteContribution(record) → { ok }
   *
   * Deletes a contribution document from Firestore using the same deterministic
   * key as syncContributions so it matches the stored document ID.
   */
  async function deleteContribution(r) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      // Prefer the actual Firestore document ID stored on the record
      const docId = r._id || (() => {
        const k = [
          r.year,
          String(r.flat  || '').replace(/\//g, '-'),
          String(r.name  || '').replace(/\s+/g, '').toLowerCase().slice(0, 12),
          r.amount,
        ].join('_').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 120);
        return k || null;
      })();
      if (!docId) return { ok: false, error: 'Could not derive document ID' };
      await _db.collection('contributions').doc(docId).delete();
      return { ok: true };
    } catch (e) {
      console.warn('[PSOTS_DB] deleteContribution failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * getAllContributions() → array of all contribution records or null
   *
   * Fetches every document in the contributions collection.
   * Used by admin page to show all contributors across all flats/years.
   * Returns null if Firestore unavailable.
   */
  async function getAllContributions() {
    if (!_db) return null;
    try {
      const snap = await _db.collection('contributions').get();
      return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[PSOTS_DB] getAllContributions failed:', e.message);
      return null;
    }
  }

  /**
   * getPendingContributions() → array or null
   *
   * Targeted query for entries with status "Pending Verification".
   * Much faster than getAllContributions() (filters server-side, returns few docs).
   * Used by admin as a supplement so pending entries always surface even when the
   * full collection scan times out on slow connections.
   */
  async function getPendingContributions() {
    if (!_db) return null;
    try {
      const snap = await _db.collection('contributions')
        .where('status', '==', 'Pending Verification')
        .get();
      return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[PSOTS_DB] getPendingContributions failed:', e.message);
      return null;
    }
  }

  /**
   * getCurrentYearContributions(year) → array or null
   *
   * Fetches ALL contribution records for the given year — both pending AND verified.
   * Much faster than getAllContributions() since it filters server-side.
   * Used by admin step 5 so that verified entries don't disappear after a reload
   * when the full collection scan times out on slow connections.
   */
  async function getCurrentYearContributions(year) {
    if (!_db) return null;
    try {
      const snap = await _db.collection('contributions')
        .where('year', '==', Number(year))
        .get();
      return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[PSOTS_DB] getCurrentYearContributions failed:', e.message);
      return null;
    }
  }


  /**
   * getAnnouncements() → array of announcement objects or null
   *
   * Returns all announcements from Firestore ordered by sortOrder, then createdAt.
   * Returns null if Firestore unavailable — callers fall back to Apps Script / static data.
   */
  async function getAnnouncements() {
    if (!_db) return null;
    try {
      const snap = await _db.collection('announcements')
        .orderBy('sortOrder', 'asc')
        .get();
      if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Try without ordering in case index not yet built
      const snap2 = await _db.collection('announcements').get();
      return snap2.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (e) {
      if (e.code === 'failed-precondition' || e.message?.includes('index')) {
        // Index not ready — fall back to unordered
        try {
          const snap3 = await _db.collection('announcements').get();
          return snap3.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        } catch (e2) { /* fall through */ }
      }
      console.warn('[PSOTS_DB] getAnnouncements failed:', e.message);
      return null;
    }
  }

  /**
   * saveAnnouncement(ann) → { ok, id }
   *
   * Creates or updates a single announcement document.
   * ann.id (optional) — if provided, updates that doc; otherwise creates new.
   * ann.tag, ann.meta, ann.text, ann.sortOrder, ann.pinned
   */
  async function saveAnnouncement(ann) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      const { id, ...data } = ann;
      const payload = {
        tag:       data.tag       || '📌 Update',
        meta:      data.meta      || '',
        text:      data.text      || '',
        sortOrder: Number(data.sortOrder) || 0,
        pinned:    Boolean(data.pinned),
        updatedAt: Date.now(),
      };
      if (!payload.createdAt && !id) payload.createdAt = Date.now();
      let docId = id;
      if (docId) {
        await _db.collection('announcements').doc(docId).set(payload, { merge: true });
      } else {
        const ref = await _db.collection('announcements').add({ ...payload, createdAt: Date.now() });
        docId = ref.id;
      }
      return { ok: true, id: docId };
    } catch (e) {
      console.warn('[PSOTS_DB] saveAnnouncement failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * deleteAnnouncement(id) → { ok }
   *
   * Deletes an announcement document by Firestore document ID.
   */
  async function deleteAnnouncement(id) {
    if (!_db || !id) return { ok: false, error: 'No id or Firestore not ready' };
    try {
      await _db.collection('announcements').doc(id).delete();
      return { ok: true };
    } catch (e) {
      console.warn('[PSOTS_DB] deleteAnnouncement failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * bulkSaveAnnouncements(list) → { ok, written }
   *
   * Replaces the full announcements collection with the given list.
   * Each item must have an 'id' field for stable document IDs.
   * Items without 'id' get a generated one. Items that disappeared are NOT deleted —
   * use deleteAnnouncement() for explicit deletes.
   */
  async function bulkSaveAnnouncements(list) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      const batch = _db.batch();
      list.forEach((ann, i) => {
        const docId = ann.id || ('ann_' + Date.now() + '_' + i);
        const ref = _db.collection('announcements').doc(docId);
        batch.set(ref, {
          tag:       ann.tag       || '📌 Update',
          meta:      ann.meta      || '',
          text:      ann.text      || '',
          sortOrder: Number(ann.sortOrder ?? i),
          pinned:    Boolean(ann.pinned),
          updatedAt: Date.now(),
          createdAt: ann.createdAt || Date.now(),
        }, { merge: true });
      });
      await batch.commit();
      return { ok: true, written: list.length };
    } catch (e) {
      console.warn('[PSOTS_DB] bulkSaveAnnouncements failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /* ════════════════════════════════════════════════════
     SITE CONFIG API
  ════════════════════════════════════════════════════ */

  /**
   * getSiteConfig() → config object or null
   *
   * Reads the live site config from Firestore (config/site).
   * Fields mirror window.PSOTS — eventName, eventStart, deadline,
   * arghyaEvening, arghyaMorning, kharnaTime, payeeName, etc.
   */
  async function getSiteConfig() {
    if (!_db) return null;
    try {
      const snap = await _db.collection('config').doc('site').get();
      return snap.exists ? snap.data() : null;
    } catch (e) {
      console.warn('[PSOTS_DB] getSiteConfig failed:', e.message);
      return null;
    }
  }

  /**
   * saveSiteConfig(data) → { ok }
   *
   * Writes/merges site config to Firestore (config/site).
   */
  async function saveSiteConfig(data) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      await _db.collection('config').doc('site').set({ ...data, updatedAt: Date.now() }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.warn('[PSOTS_DB] saveSiteConfig failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /* ════════════════════════════════════════════════════
     FINANCE API
  ════════════════════════════════════════════════════ */

  /**
   * getFinance() → finance object or null
   *
   * Reads the single finance summary document from Firestore.
   * Returns null if Firestore unavailable or doc doesn't exist.
   */
  async function getFinance() {
    if (!_db) return null;
    try {
      const snap = await _db.collection('finance').doc('current').get();
      return snap.exists ? snap.data() : null;
    } catch (e) {
      console.warn('[PSOTS_DB] getFinance failed:', e.message);
      return null;
    }
  }

  /**
   * saveFinance(data) → { ok }
   *
   * Writes/merges the finance summary document to Firestore.
   * data: { carry, collected, budget, expenses, expTent, expKharna, ... budTent, budKharna, ... }
   */
  async function saveFinance(data) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      await _db.collection('finance').doc('current').set({ ...data, updatedAt: Date.now() }, { merge: true });
      return { ok: true };
    } catch (e) {
      console.warn('[PSOTS_DB] saveFinance failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * getReceipts() → array of receipt objects or null
   *
   * Fetches all expense receipts from Firestore.
   * Returns null if Firestore unavailable.
   */
  async function getReceipts() {
    if (!_db) return null;
    try {
      const snap = await _db.collection('receipts').get();
      return snap.docs.map(d => d.data());
    } catch (e) {
      console.warn('[PSOTS_DB] getReceipts failed:', e.message);
      return null;
    }
  }

  /**
   * saveReceipts(receipts) → { ok, written }
   *
   * Replaces the full receipts collection with the given array.
   * Each receipt: { id, cat, vendor, amount, date, link, notes }
   */
  async function saveReceipts(receipts) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      const existing = await _db.collection('receipts').get();
      const batch = _db.batch();
      existing.docs.forEach(d => batch.delete(d.ref));
      receipts.forEach(r => {
        const ref = _db.collection('receipts').doc(String(r.id));
        batch.set(ref, {
          id:     r.id,
          cat:    r.cat    || '',
          vendor: r.vendor || '',
          amount: Number(r.amount) || 0,
          date:   r.date   || '',
          link:   r.link   || '',
          notes:  r.notes  || '',
        });
      });
      await batch.commit();
      return { ok: true, written: receipts.length };
    } catch (e) {
      console.warn('[PSOTS_DB] saveReceipts failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /* ════════════════════════════════════════════════════
     YEAR HISTORY API
  ════════════════════════════════════════════════════ */

  /**
   * archiveYear(year, data) → { ok }
   *
   * Saves a completed year's finance summary to Firestore as
   * finance/history_{year}. Called by the admin Year Rollover tool.
   */
  async function archiveYear(year, data) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      await _db.collection('finance').doc('history_' + year).set(
        { ...data, year: Number(year), archivedAt: Date.now() },
        { merge: true }
      );
      return { ok: true };
    } catch (e) {
      console.warn('[PSOTS_DB] archiveYear failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * getFinanceHistory() → object keyed by year, or null
   *
   * Reads all archived year finance docs from Firestore.
   * Returns e.g. { 2025: { collected, expenses, ... }, 2026: {...} }
   */
  async function getFinanceHistory() {
    if (!_db) return null;
    try {
      const snap = await _db.collection('finance').get();
      const history = {};
      snap.docs.filter(d => d.id.startsWith('history_')).forEach(d => {
        const yr = d.id.replace('history_', '');
        history[Number(yr)] = d.data();
      });
      return Object.keys(history).length > 0 ? history : null;
    } catch (e) {
      console.warn('[PSOTS_DB] getFinanceHistory failed:', e.message);
      return null;
    }
  }

  /**
   * savePendingContribution(record) → { ok }
   *
   * Saves a single self-reported contribution with status "Pending Verification".
   * Uses a timestamp-based key so duplicate taps don't overwrite each other.
   */
  async function savePendingContribution(record) {
    try { await _waitForDb(5000); } catch (e) { return { ok: false, error: e.message }; }
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      const key = [
        record.year,
        String(record.flat  || '').replace(/\//g, '-'),
        String(record.name  || '').replace(/\s+/g, '').toLowerCase().slice(0, 12),
        record.amount,
        Date.now(),
      ].join('_').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 120);
      await _db.collection('contributions').doc(key).set({
        flat:        String(record.flat   || ''),
        year:        Number(record.year)  || 0,
        name:        record.name   || '',
        amount:      Number(record.amount) || 0,
        date:        record.date   || '',
        method:      record.method || 'UPI',
        status:      'Pending Verification',
        mobile:      record.mobile || '',
        submittedAt: Date.now(),
      });
      return { ok: true };
    } catch (e) {
      console.warn('[PSOTS_DB] savePendingContribution failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * deleteContributionsByYear(year) → { ok, deleted }
   *
   * Deletes every document in the contributions collection where year === year.
   * Runs in batches of 500 (Firestore batch limit).
   */
  async function deleteContributionsByYear(year) {
    if (!_db) return { ok: false, error: 'Firestore not ready' };
    try {
      const snap = await _db.collection('contributions').where('year', '==', Number(year)).get();
      if (snap.empty) return { ok: true, deleted: 0 };
      const BATCH = 500;
      let deleted = 0;
      for (let i = 0; i < snap.docs.length; i += BATCH) {
        const batch = _db.batch();
        snap.docs.slice(i, i + BATCH).forEach(d => batch.delete(d.ref));
        await batch.commit();
        deleted += Math.min(BATCH, snap.docs.length - i);
      }
      return { ok: true, deleted };
    } catch (e) {
      console.warn('[PSOTS_DB] deleteContributionsByYear failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  _init();

  const api = { getProfile, saveProfile, patchProfile, invalidateProfile, getContributions, getAllContributions, getPendingContributions, getCurrentYearContributions, deleteContribution, deleteContributionsByYear, syncContributions, savePendingContribution, getResident, upsertResident, syncResidents, getAnnouncements, saveAnnouncement, deleteAnnouncement, bulkSaveAnnouncements, getFinance, saveFinance, getReceipts, saveReceipts, archiveYear, getFinanceHistory, getSiteConfig, saveSiteConfig };
  Object.defineProperty(api, 'isFirestoreReady', { get: () => _ready });
  return api;
})();
