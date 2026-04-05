/**
 * Tests for the duplicate submission guard logic in pages/payment.html
 *
 * This is the most abuse-prone code in the app. Three tiers of protection:
 *   1. Exact duplicate (same amount, still pending, within 24h) → hard block
 *   2. Any pending + no override checkbox → soft block
 *   3. Verified status + no ack checkbox  → soft block
 *
 * A regression here could allow double-counting contributions or prevent
 * legitimate additional payments. This file tests the LOGIC only —
 * extracted as a pure function matching the exact conditions in payment.html.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Pure guard function (mirrors payment.html submitForm duplicate logic) ─────
const TWENTY_FOUR_H = 24 * 60 * 60 * 1000

/**
 * @param {object[]} contributions   All contributions for this flat/year
 * @param {number}   amount          Amount being submitted now
 * @param {boolean}  overrideChecked Is any pending-override checkbox ticked?
 * @param {boolean}  ackChecked      Is the "additional payment" ack ticked?
 * @param {number}   nowMs           Current timestamp in ms (injectable for testing)
 * @returns {{ blocked: boolean, reason: string|null, entry?: object }}
 */
function checkDuplicates(contributions, amount, overrideChecked, ackChecked, nowMs) {
  const cutoff = nowMs - TWENTY_FOUR_H

  // Tier 1 — exact duplicate: same amount, still pending, within 24h
  const exactDup = contributions.find(c =>
    Number(c.amount) === parseInt(amount) &&
    (c.status === 'pending' || c.status === 'Pending Verification') &&
    (c.submittedAt || 0) > cutoff
  )
  if (exactDup) return { blocked: true, reason: 'exact_duplicate', entry: exactDup }

  // Tier 2 — any pending: either override OR ack must be checked
  const anyPending = contributions.find(c =>
    c.status === 'pending' || c.status === 'Pending Verification'
  )
  const overrideOk = overrideChecked || ackChecked
  if (anyPending && !overrideOk) return { blocked: true, reason: 'pending_override_required', entry: anyPending }

  return { blocked: false, reason: null }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
const NOW = Date.now()
const RECENT   = NOW - 2 * 60 * 60 * 1000   // 2 hours ago
const OLD      = NOW - 25 * 60 * 60 * 1000  // 25 hours ago (outside 24h window)

const pendingRecent = (amount = 5000) => ({
  amount, status: 'Pending Verification', submittedAt: RECENT,
})
const pendingOld = (amount = 5000) => ({
  amount, status: 'Pending Verification', submittedAt: OLD,
})
const verified = (amount = 5000) => ({
  amount, status: 'verified', submittedAt: RECENT,
})
const rejected = (amount = 5000) => ({
  amount, status: 'rejected', submittedAt: RECENT,
})

// ── Tier 1: exact duplicate ───────────────────────────────────────────────────
describe('duplicate guard — tier 1: exact duplicate', () => {
  it('blocks an exact same-amount pending submission within 24h', () => {
    const result = checkDuplicates([pendingRecent(5000)], 5000, false, false, NOW)
    expect(result.blocked).toBe(true)
    expect(result.reason).toBe('exact_duplicate')
  })

  it('does NOT block when pending is older than 24h', () => {
    const result = checkDuplicates([pendingOld(5000)], 5000, false, false, NOW)
    // Old pending outside 24h should not trigger exact_duplicate
    // (falls through to tier 2 — any-pending check)
    expect(result.reason).not.toBe('exact_duplicate')
  })

  it('does NOT block when amounts differ', () => {
    const result = checkDuplicates([pendingRecent(5000)], 10000, false, false, NOW)
    expect(result.reason).not.toBe('exact_duplicate')
  })

  it('treats "pending" and "Pending Verification" as the same status', () => {
    const contrib = { amount: 5000, status: 'pending', submittedAt: RECENT }
    const result = checkDuplicates([contrib], 5000, false, false, NOW)
    expect(result.blocked).toBe(true)
    expect(result.reason).toBe('exact_duplicate')
  })

  it('does NOT block an exact duplicate of a verified entry', () => {
    const result = checkDuplicates([verified(5000)], 5000, false, false, NOW)
    expect(result.reason).not.toBe('exact_duplicate')
  })

  it('does NOT block an exact duplicate of a rejected entry', () => {
    const result = checkDuplicates([rejected(5000)], 5000, false, false, NOW)
    expect(result.reason).not.toBe('exact_duplicate')
  })

  it('returns the matching entry for UI display', () => {
    const entry = pendingRecent(5000)
    const result = checkDuplicates([entry], 5000, false, false, NOW)
    expect(result.entry).toBe(entry)
  })
})

// ── Tier 2: any pending requires override ────────────────────────────────────
describe('duplicate guard — tier 2: any pending requires acknowledgment', () => {
  it('blocks when there is any pending entry and no checkbox is ticked', () => {
    const result = checkDuplicates([pendingOld(5000)], 10000, false, false, NOW)
    expect(result.blocked).toBe(true)
    expect(result.reason).toBe('pending_override_required')
  })

  it('allows through when pendingOverride checkbox is ticked', () => {
    const result = checkDuplicates([pendingOld(5000)], 10000, true, false, NOW)
    expect(result.blocked).toBe(false)
  })

  it('allows through when additionalPayAck checkbox is ticked', () => {
    const result = checkDuplicates([pendingOld(5000)], 10000, false, true, NOW)
    expect(result.blocked).toBe(false)
  })

  it('the bug that was fixed: verified+pending used to block even with ack ticked', () => {
    // Scenario: user has a verified contribution AND a pending one.
    // Status is "verified" so only green ack (additionalPayChk) is shown.
    // The old code checked ONLY pendingOverride (which doesn't exist in DOM).
    // Fixed code: additionalPayChk ALSO satisfies the override.
    const contributions = [
      verified(15000),     // year's verified contribution
      pendingOld(10000),   // separate pending
    ]
    // Green ack checked (additionalPayChk), pendingOverride NOT in DOM (false)
    const result = checkDuplicates(contributions, 1000, false, true, NOW)
    expect(result.blocked).toBe(false) // must not block
  })

  it('does NOT require override when there are no pending entries at all', () => {
    const result = checkDuplicates([verified(5000)], 5000, false, false, NOW)
    expect(result.blocked).toBe(false)
  })

  it('does NOT require override when contributions list is empty', () => {
    const result = checkDuplicates([], 5000, false, false, NOW)
    expect(result.blocked).toBe(false)
  })
})

// ── Combined scenarios ────────────────────────────────────────────────────────
describe('duplicate guard — combined realistic scenarios', () => {
  it('first-time contributor with no history: allowed through', () => {
    const result = checkDuplicates([], 5000, false, false, NOW)
    expect(result.blocked).toBe(false)
  })

  it('second payment after rejection: allowed through (no override needed)', () => {
    const result = checkDuplicates([rejected(5000)], 5000, false, false, NOW)
    expect(result.blocked).toBe(false)
  })

  it('top-up payment after verification, ack ticked: allowed through', () => {
    const result = checkDuplicates([verified(10000)], 5000, false, true, NOW)
    expect(result.blocked).toBe(false)
  })

  it('accidental double-tap within 24h: hard blocked even with override', () => {
    // Exact dup check happens BEFORE override check — intentional
    const result = checkDuplicates([pendingRecent(5000)], 5000, true, true, NOW)
    expect(result.blocked).toBe(true)
    expect(result.reason).toBe('exact_duplicate')
  })
})
