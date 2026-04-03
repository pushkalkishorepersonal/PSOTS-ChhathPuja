/**
 * ════════════════════════════════════════════════════
 *  PSOTS_NOTIFY — WhatsApp Notification Helpers
 *
 *  Sends committee alerts and user confirmations via
 *  WhatsApp after a contribution is submitted on payment.html.
 *
 *  Strategy (in order):
 *    1. Fonnte API (https://api.fonnte.com/send)
 *       Token read from localStorage key 'psots_fonnte_token'.
 *       Set this once via Admin → Settings.
 *    2. WhatsApp deep-link fallback (opens WA with pre-filled
 *       message) — used when no Fonnte token is available.
 *
 *  All public methods return Promise<{ ok, method, error? }>
 *    ok     — true even for "skipped" (non-fatal outcomes)
 *    method — 'fonnte' | 'deeplink' | 'skipped'
 *    error  — set only when something unexpectedly failed
 *
 *  No external dependencies. Reads config from window.PSOTS.
 * ════════════════════════════════════════════════════
 */
window.PSOTS_NOTIFY = (() => {
  'use strict';

  /* ── Internal constants ─────────────────────────── */
  const FONNTE_API      = 'https://api.fonnte.com/send';
  const FONNTE_LS_KEY   = 'psots_fonnte_token';
  const MOBILE_REGEXP   = /^\d{10}$/;

  /* ── Helpers ────────────────────────────────────── */

  /**
   * Safely read window.PSOTS, returning a default if undefined.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  function _cfg(key, fallback = '') {
    try { return window.PSOTS?.[key] ?? fallback; } catch { return fallback; }
  }

  /**
   * Format a number as Indian-locale currency string (e.g. "₹1,001").
   * @param {number|string} n
   * @returns {string}
   */
  function _fmt(n) {
    try { return '₹' + parseInt(n || 0).toLocaleString('en-IN'); } catch { return '₹' + n; }
  }

  /**
   * Return the Fonnte token from localStorage, or null if not set.
   * @returns {string|null}
   */
  function _getFonnteToken() {
    try { return localStorage.getItem(FONNTE_LS_KEY) || null; } catch { return null; }
  }

  /**
   * Build a wa.me deep-link URL for the given mobile + message.
   * Works as a universal WhatsApp link on both mobile and desktop.
   *
   * @param {string} mobile  - E.164-style number without '+' (e.g. "919482088904")
   * @param {string} message - Pre-filled message text (will be URI-encoded)
   * @returns {string}        WhatsApp deep-link URL
   */
  function getDeepLinkUrl(mobile, message) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${mobile}?text=${encoded}`;
  }

  /**
   * Send a single WhatsApp message via the Fonnte API.
   *
   * @param {string} token    - Fonnte account token
   * @param {string} target   - Recipient number (e.g. "919482088904")
   * @param {string} message  - Message text
   * @returns {Promise<{ok:boolean, raw?:object, error?:string}>}
   */
  async function _sendFonnte(token, target, message) {
    try {
      const resp = await fetch(FONNTE_API, {
        method:  'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ target, message }),
      });

      let raw;
      try { raw = await resp.json(); } catch { raw = {}; }

      if (!resp.ok || raw.status === false) {
        return {
          ok:    false,
          raw,
          error: raw.reason || raw.message || `HTTP ${resp.status}`,
        };
      }
      return { ok: true, raw };
    } catch (err) {
      return { ok: false, error: err?.message || 'Network error' };
    }
  }

  /**
   * Open a WhatsApp deep-link in a new tab (browser fallback).
   * On mobile this will trigger the WA app; on desktop it opens web.whatsapp.com.
   *
   * @param {string} mobile  - E.164-style number without '+'
   * @param {string} message - Pre-filled message text
   */
  function _openDeepLink(mobile, message) {
    try {
      window.open(getDeepLinkUrl(mobile, message), '_blank', 'noopener,noreferrer');
    } catch { /* ignore — user may have blocked popups */ }
  }

  /* ── Message builders ───────────────────────────── */

  /**
   * Build the committee alert message.
   *
   * @param {{ name:string, flat:string, amount:number|string, receiptNo:string, method:string }} p
   * @returns {string}
   */
  function _buildCommitteeMsg(p) {
    const year    = _cfg('activeYear', new Date().getFullYear());
    const event   = _cfg('eventName', `PSOTS Chhath Puja ${year}`);
    const society = _cfg('society',   'Prestige Song of the South, Bengaluru');

    return (
      `🪔 *New Contribution — ${event}*\n\n` +
      `*Name:* ${p.name || '—'}\n` +
      `*Flat:* ${p.flat || '—'}\n` +
      `*Amount:* ${_fmt(p.amount)}\n` +
      `*Mode:* ${p.method || 'UPI'}\n` +
      `*Receipt No:* \`${p.receiptNo || '—'}\`\n\n` +
      `📍 ${society}\n` +
      `_Please verify and update the records. 🙏_`
    );
  }

  /**
   * Build the user confirmation message.
   *
   * @param {{ name:string, amount:number|string, receiptNo:string, eventYear?:number }} p
   * @returns {string}
   */
  function _buildUserMsg(p) {
    const year  = p.eventYear || _cfg('activeYear', new Date().getFullYear());
    const event = _cfg('eventName', `PSOTS Chhath Puja ${year}`);

    return (
      `🪔 *Thank you, ${p.name || 'Dear Resident'}!*\n\n` +
      `Your contribution of *${_fmt(p.amount)}* for\n` +
      `*${event}*\n` +
      `has been received successfully.\n\n` +
      `🧾 *Receipt No:* \`${p.receiptNo || '—'}\`\n\n` +
      `The committee will verify your payment shortly.\n` +
      `_Jai Chhathi Maiya! 🌅_`
    );
  }

  /* ── Public API ─────────────────────────────────── */

  /**
   * Send a WhatsApp alert to the committee when a contribution is submitted.
   *
   * Reads waOrg and waOrg2 from window.PSOTS.
   * Uses Fonnte if a token is available; falls back to a deep-link for waOrg only
   * (opening a new tab for each recipient would be disruptive beyond one).
   *
   * @param {{ name:string, flat:string, amount:number|string, receiptNo:string, method:string }} payload
   * @returns {Promise<{ ok:boolean, method:'fonnte'|'deeplink'|'skipped', error?:string }>}
   */
  async function alertCommittee(payload) {
    const message = _buildCommitteeMsg(payload);
    const token   = _getFonnteToken();
    const waOrg   = _cfg('waOrg');
    const waOrg2  = _cfg('waOrg2');

    if (!waOrg) {
      return { ok: true, method: 'skipped', error: 'waOrg not configured' };
    }

    /* ── Path A: Fonnte API (sends to both committee numbers) ── */
    if (token) {
      const results = await Promise.all(
        [waOrg, waOrg2].filter(Boolean).map(num => _sendFonnte(token, num, message))
      );
      const allOk = results.every(r => r.ok);
      const errors = results.filter(r => !r.ok).map(r => r.error).join('; ');
      return {
        ok:     allOk,
        method: 'fonnte',
        ...(errors && { error: errors }),
      };
    }

    /* ── Path B: Deep-link fallback (opens WA for primary number only) ── */
    _openDeepLink(waOrg, message);
    return { ok: true, method: 'deeplink' };
  }

  /**
   * Send a WhatsApp confirmation to the contributor (if mobile is provided).
   *
   * Only sends when the mobile number is a valid 10-digit Indian number.
   * Prefixes "91" to form the E.164 number.
   *
   * @param {{ mobile:string, name:string, amount:number|string, receiptNo:string, eventYear?:number }} payload
   * @returns {Promise<{ ok:boolean, method:'fonnte'|'deeplink'|'skipped', error?:string }>}
   */
  async function confirmUser(payload) {
    const rawMobile = String(payload.mobile || '').replace(/\D/g, '');

    /* Skip quietly when no valid 10-digit mobile is provided */
    if (!MOBILE_REGEXP.test(rawMobile)) {
      return { ok: true, method: 'skipped' };
    }

    const target  = `91${rawMobile}`;
    const message = _buildUserMsg(payload);
    const token   = _getFonnteToken();

    /* ── Path A: Fonnte API ── */
    if (token) {
      const result = await _sendFonnte(token, target, message);
      return {
        ok:     result.ok,
        method: 'fonnte',
        ...(result.error && { error: result.error }),
      };
    }

    /* ── Path B: Deep-link fallback ── */
    _openDeepLink(target, message);
    return { ok: true, method: 'deeplink' };
  }

  /**
   * Combined helper — call this immediately after a successful payment submission.
   *
   * Sends committee alert AND user confirmation concurrently.
   * Never throws; resolves with a summary of both outcomes.
   *
   * @param {{
   *   name:string, flat:string, amount:number|string,
   *   receiptNo:string, method:string,
   *   mobile?:string, eventYear?:number
   * }} payload
   * @returns {Promise<{
   *   ok:boolean,
   *   committee: { ok:boolean, method:string, error?:string },
   *   user:      { ok:boolean, method:string, error?:string }
   * }>}
   */
  async function onPaymentSubmitted(payload) {
    try {
      const [committee, user] = await Promise.all([
        alertCommittee(payload).catch(err => ({
          ok: false, method: 'skipped', error: err?.message || 'Unknown',
        })),
        confirmUser(payload).catch(err => ({
          ok: false, method: 'skipped', error: err?.message || 'Unknown',
        })),
      ]);

      return {
        ok: committee.ok && user.ok,
        committee,
        user,
      };
    } catch (err) {
      /* Belt-and-suspenders — the inner catches above should prevent this */
      console.warn('[PSOTS_NOTIFY] onPaymentSubmitted unexpected error:', err);
      const skipped = { ok: true, method: 'skipped', error: err?.message };
      return { ok: true, committee: skipped, user: skipped };
    }
  }

  /* ── Expose public API ──────────────────────────── */
  return {
    alertCommittee,
    confirmUser,
    onPaymentSubmitted,
    getDeepLinkUrl,
  };
})();
