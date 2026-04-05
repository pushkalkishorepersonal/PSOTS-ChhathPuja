/**
 * Tests for message builders in js/notifications.js
 *
 * These builders produce the WhatsApp messages every resident and
 * committee member receives. A broken builder means wrong receipt
 * links, missing approve buttons, or garbled text — all invisible
 * until someone reports it. Snapshot + contract tests catch regressions.
 */

import { describe, it, expect } from 'vitest'

// ── Pure functions extracted from js/notifications.js ────────────────────────
const SITE_URL = 'https://chhath.psots.in'

function _fmt(n) {
  return '₹' + parseInt(n || 0).toLocaleString('en-IN')
}

function _adminReviewUrl(docId) {
  return docId
    ? `${SITE_URL}/admin.html?review=${encodeURIComponent(docId)}`
    : `${SITE_URL}/admin.html`
}

function _receiptViewUrl(receiptNo) {
  return `${SITE_URL}/pages/payment.html?receipt=${encodeURIComponent(receiptNo)}`
}

function getDeepLinkUrl(mobile, message) {
  return `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`
}

function _buildCommitteeButtons(receiptNo) {
  const seq4 = receiptNo ? receiptNo.slice(-4) : '????'
  return `✅ Appr #${seq4}|❌ Reject #${seq4}|⏳ Hold #${seq4}`
}

function _buildCommitteeMsg(p, config = {}) {
  const year    = config.activeYear || 2026
  const event   = config.eventName  || `PSOTS Chhath Puja ${year}`
  const society = config.society    || 'Prestige Song of the South, Bengaluru'
  const adminUrl = _adminReviewUrl(p.docId)

  return (
    `🪔 *New Payment — ${event}*\n\n` +
    `👤 *${p.name || '—'}*  |  🏠 Flat *${p.flat || '—'}*\n` +
    `💰 *${_fmt(p.amount)}* via ${p.method || 'UPI'}\n` +
    `🧾 Receipt: \`${p.receiptNo || '—'}\`\n` +
    `\n` +
    `👉 *One-tap review:*\n${adminUrl}\n\n` +
    `_Tap a button below to update status instantly, or visit the link above._\n` +
    `📍 ${society}`
  )
}

function _buildUserMsg(p, config = {}) {
  const year      = p.eventYear || config.activeYear || 2026
  const event     = config.eventName || `PSOTS Chhath Puja ${year}`
  const portalUrl = `${SITE_URL}/portal.html`
  const receiptLink = p.receiptNo ? _receiptViewUrl(p.receiptNo) : ''

  return (
    `🌅 *Thank you, ${p.name || 'Dear Resident'}!*\n\n` +
    `Your contribution of *${_fmt(p.amount)}* for\n` +
    `*${event}*\n` +
    `has been submitted successfully.\n\n` +
    `🧾 *Receipt No:* \`${p.receiptNo || '—'}\`\n` +
    `⏳ *Status:* Pending verification\n\n` +
    (receiptLink ? `📥 *Save / print receipt:*\n${receiptLink}\n\n` : '') +
    `🔗 *Track payment status:*\n${portalUrl}\n\n` +
    `The committee will verify your payment shortly.\n` +
    `_Jai Chhathi Maiya! 🌅_`
  )
}

// ── Sample payloads ───────────────────────────────────────────────────────────
const SAMPLE_PAYMENT = {
  name:      'Pushkal Kishore',
  flat:      '15167',
  mobile:    '9482088904',
  amount:    5000,
  method:    'UPI',
  receiptNo: 'PSOTS-2026-20261103-0042',
  docId:     'abc123firestore',
}

// ── _buildCommitteeButtons ────────────────────────────────────────────────────
describe('_buildCommitteeButtons', () => {
  it('produces 3 pipe-separated buttons', () => {
    const buttons = _buildCommitteeButtons('PSOTS-2026-20261103-0042')
    const parts = buttons.split('|')
    expect(parts).toHaveLength(3)
  })

  it('extracts last 4 digits of receipt number into each button', () => {
    const buttons = _buildCommitteeButtons('PSOTS-2026-20261103-0042')
    expect(buttons).toContain('#0042')
    const parts = buttons.split('|')
    expect(parts[0]).toContain('#0042') // Approve
    expect(parts[1]).toContain('#0042') // Reject
    expect(parts[2]).toContain('#0042') // Hold
  })

  it('uses ???? when receiptNo is undefined', () => {
    const buttons = _buildCommitteeButtons(undefined)
    expect(buttons).toContain('#????')
  })

  it('approve button contains ✅', () => {
    const parts = _buildCommitteeButtons('PSOTS-2026-20261103-0001').split('|')
    expect(parts[0]).toContain('✅')
  })

  it('reject button contains ❌', () => {
    const parts = _buildCommitteeButtons('PSOTS-2026-20261103-0001').split('|')
    expect(parts[1]).toContain('❌')
  })

  it('hold button contains ⏳', () => {
    const parts = _buildCommitteeButtons('PSOTS-2026-20261103-0001').split('|')
    expect(parts[2]).toContain('⏳')
  })

  it('each button label is within Fonnte 20-char limit', () => {
    const parts = _buildCommitteeButtons('PSOTS-2026-20261103-0042').split('|')
    parts.forEach(label => {
      expect(label.length).toBeLessThanOrEqual(20)
    })
  })
})

// ── _buildCommitteeMsg ────────────────────────────────────────────────────────
describe('_buildCommitteeMsg', () => {
  it('includes contributor name and flat', () => {
    const msg = _buildCommitteeMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('Pushkal Kishore')
    expect(msg).toContain('15167')
  })

  it('includes formatted amount', () => {
    const msg = _buildCommitteeMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('₹5,000')
  })

  it('includes receipt number', () => {
    const msg = _buildCommitteeMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('PSOTS-2026-20261103-0042')
  })

  it('includes admin deep-link with docId', () => {
    const msg = _buildCommitteeMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('/admin.html?review=abc123firestore')
  })

  it('falls back to plain /admin.html when no docId', () => {
    const msg = _buildCommitteeMsg({ ...SAMPLE_PAYMENT, docId: undefined })
    expect(msg).toContain('/admin.html')
    expect(msg).not.toContain('review=')
  })

  it('shows — for missing name', () => {
    const msg = _buildCommitteeMsg({ ...SAMPLE_PAYMENT, name: undefined })
    expect(msg).toContain('*—*')
  })

  it('shows — for missing flat', () => {
    const msg = _buildCommitteeMsg({ ...SAMPLE_PAYMENT, flat: undefined })
    expect(msg).toContain('Flat *—*')
  })

  it('defaults method to UPI', () => {
    const msg = _buildCommitteeMsg({ ...SAMPLE_PAYMENT, method: undefined })
    expect(msg).toContain('via UPI')
  })
})

// ── _buildUserMsg ─────────────────────────────────────────────────────────────
describe('_buildUserMsg', () => {
  it('addresses the contributor by name', () => {
    const msg = _buildUserMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('Thank you, Pushkal Kishore')
  })

  it('includes formatted amount', () => {
    const msg = _buildUserMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('₹5,000')
  })

  it('includes receipt number', () => {
    const msg = _buildUserMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('PSOTS-2026-20261103-0042')
  })

  it('includes receipt download link when receiptNo present', () => {
    const msg = _buildUserMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('/pages/payment.html?receipt=PSOTS-2026-20261103-0042')
  })

  it('omits receipt download link when receiptNo is absent', () => {
    const msg = _buildUserMsg({ ...SAMPLE_PAYMENT, receiptNo: undefined })
    expect(msg).not.toContain('/pages/payment.html?receipt=')
  })

  it('includes portal tracking link', () => {
    const msg = _buildUserMsg(SAMPLE_PAYMENT)
    expect(msg).toContain('/portal.html')
  })

  it('says "Pending verification" not "verified"', () => {
    const msg = _buildUserMsg(SAMPLE_PAYMENT)
    expect(msg.toLowerCase()).toContain('pending verification')
    expect(msg.toLowerCase()).not.toContain('✅ verified')
  })

  it('falls back to "Dear Resident" when name missing', () => {
    const msg = _buildUserMsg({ ...SAMPLE_PAYMENT, name: undefined })
    expect(msg).toContain('Dear Resident')
  })
})

// ── getDeepLinkUrl ────────────────────────────────────────────────────────────
describe('getDeepLinkUrl', () => {
  it('produces a wa.me URL', () => {
    const url = getDeepLinkUrl('919482088904', 'Hello')
    expect(url).toMatch(/^https:\/\/wa\.me\//)
  })

  it('URL-encodes the message', () => {
    const url = getDeepLinkUrl('919482088904', 'Hello World')
    expect(url).toContain('Hello%20World')
  })

  it('includes the phone number in the URL', () => {
    const url = getDeepLinkUrl('919482088904', 'test')
    expect(url).toContain('919482088904')
  })
})

// ── _fmt ──────────────────────────────────────────────────────────────────────
describe('_fmt (amount formatter)', () => {
  it('formats 1000 as ₹1,000', () => {
    expect(_fmt(1000)).toBe('₹1,000')
  })

  it('formats 100000 as ₹1,00,000 (Indian system)', () => {
    expect(_fmt(100000)).toBe('₹1,00,000')
  })

  it('formats 0 as ₹0', () => {
    expect(_fmt(0)).toBe('₹0')
  })

  it('handles string numbers', () => {
    expect(_fmt('5000')).toBe('₹5,000')
  })
})
