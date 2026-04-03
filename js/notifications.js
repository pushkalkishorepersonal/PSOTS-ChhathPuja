/**
 * ════════════════════════════════════════════════════
 *  PSOTS_NOTIFY — WhatsApp Notification System
 *
 *  Sends committee alerts (with inline Approve/Reject/Hold
 *  buttons via Fonnte) and resident confirmations after a
 *  payment submission on payment.html.
 *
 *  Transport priority:
 *    1. Apps Script proxy  — calls action=sendFonnteMessage on the
 *       deployed Apps Script, which holds the FONNTE_TOKEN securely
 *       in Script Properties. No token needed in the browser.
 *    2. WhatsApp deep-link — fallback when Apps Script is unavailable.
 *       Opens WA with a pre-filled message for the user to send.
 *
 *  Committee approval flow (Fonnte button message):
 *    Committee receives a WA message with 3 tap-able buttons:
 *      ✅ Appr #NNNN  /  ❌ Reject #NNNN  /  ⏳ Hold #NNNN
 *    When tapped, Fonnte fires a webhook to the Apps Script URL.
 *    Apps Script parses the button reply and updates the Sheet +
 *    Firestore, then sends a confirmation WA to the resident.
 *
 *  All public methods return Promise<{ ok, method, error? }>
 *    ok     — true even for non-fatal outcomes ('skipped', 'deeplink')
 *    method — 'fonnte-proxy' | 'deeplink' | 'skipped'
 *    error  — set only on unexpected failure
 *
 *  No external dependencies. Reads config from window.PSOTS.
 * ════════════════════════════════════════════════════
 */
window.PSOTS_NOTIFY = (() => {
  'use strict';

  /* ── Config helpers ─────────────────────────────── */

  function _cfg(key, fallback = '') {
    try { return window.PSOTS?.[key] ?? fallback; } catch { return fallback; }
  }

  function _scriptUrl() {
    try { return window.PSOTS?.scriptUrl || localStorage.getItem('psots_script_url') || ''; } catch { return ''; }
  }

  function _fmt(n) {
    try { return '₹' + parseInt(n || 0).toLocaleString('en-IN'); } catch { return '₹' + n; }
  }

  function _now() {
    return new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /* ── URL builders ───────────────────────────────── */

  function _siteUrl() { return _cfg('siteUrl', 'https://chhath.psots.in'); }

  function _adminReviewUrl(docId) {
    const base = _siteUrl();
    return docId
      ? `${base}/admin.html?review=${encodeURIComponent(docId)}`
      : `${base}/admin.html`;
  }

  function _receiptViewUrl(receiptNo) {
    return `${_siteUrl()}/pages/payment.html?receipt=${encodeURIComponent(receiptNo)}`;
  }

  function getDeepLinkUrl(mobile, message) {
    return `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
  }

  /* ── Transport layer ────────────────────────────── */

  /**
   * Route Fonnte send through Apps Script (token stays server-side).
   * Uses GET so no CORS preflight — Apps Script already supports this pattern.
   *
   * @param {string[]} targets  E.164 numbers without '+' (e.g. "919482088904")
   * @param {string}   message  WhatsApp message text
   * @param {string}  [buttons] Pipe-separated button labels e.g. "✅ Yes|❌ No"
   */
  async function _sendViaAppsScript(targets, message, buttons) {
    const url = _scriptUrl();
    if (!url || url.includes('YOUR_APPS')) {
      return { ok: false, error: 'Apps Script URL not configured' };
    }
    try {
      const params = new URLSearchParams({
        action:  'sendFonnteMessage',
        targets: targets.join(','),
        message,
      });
      if (buttons) params.set('buttons', buttons);
      const r = await fetch(url + '?' + params.toString());
      const d = await r.json();
      if (d.ok || (d.sent && d.sent > 0)) return { ok: true, method: 'fonnte-proxy', sent: d.sent };
      return { ok: false, method: 'fonnte-proxy', error: d.msg || d.error || 'Fonnte rejected' };
    } catch (e) {
      return { ok: false, error: e?.message || 'Network error' };
    }
  }

  function _openDeepLink(mobile, message) {
    try {
      window.open(getDeepLinkUrl(mobile, message), '_blank', 'noopener,noreferrer');
    } catch { /* ignore popup-blocked */ }
  }

  /**
   * Store pending-approval metadata in Apps Script Script Properties
   * so the Fonnte webhook handler can look up which payment to approve.
   * Fire-and-forget — failures are non-critical.
   */
  async function _storePendingApproval(data) {
    const url = _scriptUrl();
    if (!url || url.includes('YOUR_APPS')) return;
    try {
      await fetch(url, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'storePendingApproval', ...data }),
      });
    } catch { /* non-critical */ }
  }

  /* ── Message builders ───────────────────────────── */

  function _buildCommitteeMsg(p) {
    const year    = _cfg('activeYear', new Date().getFullYear());
    const event   = _cfg('eventName',  `PSOTS Chhath Puja ${year}`);
    const society = _cfg('society',    'Prestige Song of the South, Bengaluru');
    const adminUrl = _adminReviewUrl(p.docId);

    return (
      `🪔 *New Payment — ${event}*\n\n` +
      `👤 *${p.name || '—'}*  |  🏠 Flat *${p.flat || '—'}*\n` +
      `💰 *${_fmt(p.amount)}* via ${p.method || 'UPI'}\n` +
      `🧾 Receipt: \`${p.receiptNo || '—'}\`\n` +
      `🕐 ${_now()}\n\n` +
      `👉 *One-tap review:*\n${adminUrl}\n\n` +
      `_Tap a button below to update status instantly, or visit the link above._\n` +
      `📍 ${society}`
    );
  }

  /**
   * Build 3 Fonnte button labels that include the 4-digit receipt sequence
   * so the webhook knows which payment each button reply belongs to.
   * Fonnte button labels: max 20 chars each, pipe-separated.
   */
  function _buildCommitteeButtons(receiptNo) {
    const seq4 = receiptNo ? receiptNo.slice(-4) : '????';
    return `✅ Appr #${seq4}|❌ Reject #${seq4}|⏳ Hold #${seq4}`;
  }

  function _buildUserMsg(p) {
    const year        = p.eventYear || _cfg('activeYear', new Date().getFullYear());
    const event       = _cfg('eventName', `PSOTS Chhath Puja ${year}`);
    const portalUrl   = `${_siteUrl()}/portal.html`;
    const receiptLink = p.receiptNo ? _receiptViewUrl(p.receiptNo) : '';

    return (
      `🌅 *Thank you, ${p.name || 'Dear Resident'}!*\n\n` +
      `Your contribution of *${_fmt(p.amount)}* for\n` +
      `*${event}*\n` +
      `has been submitted successfully.\n\n` +
      `🧾 *Receipt No:* \`${p.receiptNo || '—'}\`\n` +
      `⏳ *Status:* Pending verification\n\n` +
      (receiptLink
        ? `📥 *Save / print receipt:*\n${receiptLink}\n\n`
        : '') +
      `🔗 *Track payment status:*\n${portalUrl}\n\n` +
      `The committee will verify your payment shortly.\n` +
      `_Jai Chhathi Maiya! 🌅_`
    );
  }

  /* ── Public API ─────────────────────────────────── */

  /**
   * Alert the committee when a contribution is submitted.
   * Sends a Fonnte button message (✅ Approve / ❌ Reject / ⏳ Hold)
   * via Apps Script proxy. Falls back to a WhatsApp deep-link.
   *
   * @param {{ name, flat, amount, method, receiptNo, docId, mobile }} payload
   */
  async function alertCommittee(payload) {
    const message = _buildCommitteeMsg(payload);
    const buttons = _buildCommitteeButtons(payload.receiptNo);
    const waOrg  = _cfg('waOrg');
    const waOrg2 = _cfg('waOrg2');

    if (!waOrg) return { ok: true, method: 'skipped', error: 'waOrg not configured' };

    /* Store approval metadata before sending so webhook can resolve it */
    if (payload.receiptNo) {
      _storePendingApproval({
        receiptNo: payload.receiptNo,
        docId:     payload.docId   || '',
        flat:      payload.flat    || '',
        name:      payload.name    || '',
        mobile:    payload.mobile  || '',
        amount:    payload.amount  || 0,
      });
    }

    /* Path A: Apps Script proxy → Fonnte button message */
    const url = _scriptUrl();
    if (url && !url.includes('YOUR_APPS')) {
      const targets = [waOrg, waOrg2].filter(Boolean);
      const r = await _sendViaAppsScript(targets, message, buttons);
      if (r.ok) return { ok: true, method: 'fonnte-proxy' };
      /* Fonnte configured but failed — still try deep-link below */
    }

    /* Path B: Deep-link fallback — opens WA on resident's device */
    _openDeepLink(waOrg, message);
    return { ok: true, method: 'deeplink' };
  }

  /**
   * Send a WhatsApp confirmation to the contributor.
   * Includes receipt number, receipt download link, and portal status link.
   *
   * @param {{ mobile, name, amount, receiptNo, eventYear? }} payload
   */
  async function confirmUser(payload) {
    const rawMobile = String(payload.mobile || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(rawMobile)) return { ok: true, method: 'skipped' };

    const target  = `91${rawMobile}`;
    const message = _buildUserMsg(payload);

    /* Path A: Apps Script proxy */
    const url = _scriptUrl();
    if (url && !url.includes('YOUR_APPS')) {
      const r = await _sendViaAppsScript([target], message);
      if (r.ok) return { ok: true, method: 'fonnte-proxy' };
    }

    /* Path B: Deep-link fallback */
    _openDeepLink(target, message);
    return { ok: true, method: 'deeplink' };
  }

  /**
   * Combined — call immediately after a successful payment submission.
   * Fires committee alert + resident confirmation concurrently.
   * Never throws.
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
      return { ok: committee.ok && user.ok, committee, user };
    } catch (err) {
      console.warn('[PSOTS_NOTIFY] onPaymentSubmitted unexpected error:', err);
      const skipped = { ok: true, method: 'skipped', error: err?.message };
      return { ok: true, committee: skipped, user: skipped };
    }
  }

  return { alertCommittee, confirmUser, onPaymentSubmitted, getDeepLinkUrl };
})();
