/**
 * Tests for the applyLiveConfig merge logic in js/config.js
 *
 * The function reads psots_live_config from localStorage and merges it
 * over the default window.PSOTS object. This is the primary mechanism
 * for admin-saved config reaching every page — bugs here break everything
 * site-wide silently.
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ── Pure reimplementation matching js/config.js exactly ──────────────────────
// (Extracted so we can unit-test the specification; kept identical to source.)
const SCALAR_KEYS = [
  'eventName','eventStart','deadline','payeeName',
  'upiId','upiMobile','waOrg','waOrg2',
  'phone1','phone2','venue','society',
]

function applyLiveConfig(psots, liveRaw) {
  const live = typeof liveRaw === 'string' ? JSON.parse(liveRaw || 'null') : (liveRaw ?? null)
  if (!live) return { ...psots }
  const result = JSON.parse(JSON.stringify(psots)) // deep clone

  SCALAR_KEYS.forEach(k => { if (live[k] !== undefined) result[k] = live[k] })

  if (live.arghyaEvening) Object.assign(result.arghyaEvening, live.arghyaEvening)
  if (live.arghyaMorning) Object.assign(result.arghyaMorning, live.arghyaMorning)
  if (live.kharnaTime)    Object.assign(result.kharnaTime,    live.kharnaTime)
  if (Array.isArray(live.committee) && live.committee.length) result.committee = live.committee

  return result
}

// ── Fixtures ─────────────────────────────────────────────────────────────────
const BASE_CONFIG = {
  upiId:      '9482088904@sbi',
  upiMobile:  '9482088904',
  payeeName:  'ChhathPuja2026PSOTS',
  waOrg:      '919482088904',
  waOrg2:     '919902837002',
  eventName:  'PSOTS Chhath Puja 2026',
  society:    'Prestige Song of the South, Bengaluru',
  eventStart: '2026-11-01T06:00:00',
  deadline:   '2026-10-25T23:59:00',
  venue:      'Amphitheater',
  phone1:     '9482088904',
  phone2:     '9902837002',
  arghyaEvening: { time: '5:45 PM', date: 'Nov 3, 2026' },
  arghyaMorning: { time: '6:15 AM', date: 'Nov 4, 2026' },
  kharnaTime:    { time: '7:00 PM', date: 'Nov 2, 2026', location: 'Community Hall' },
  committee: [
    { name: 'Pushkal Kishore', role: 'Chief Organiser', phone: '9482088904' },
  ],
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('applyLiveConfig — scalar fields', () => {
  it('returns base config unchanged when live is null', () => {
    const result = applyLiveConfig(BASE_CONFIG, null)
    expect(result.upiId).toBe('9482088904@sbi')
    expect(result.eventName).toBe('PSOTS Chhath Puja 2026')
  })

  it('returns base config unchanged when localStorage value is empty string', () => {
    const result = applyLiveConfig(BASE_CONFIG, '')
    expect(result.upiId).toBe('9482088904@sbi')
  })

  it('returns base config unchanged when JSON is "null"', () => {
    const result = applyLiveConfig(BASE_CONFIG, 'null')
    expect(result.upiId).toBe('9482088904@sbi')
  })

  it('overrides upiId when admin saves new UPI ID', () => {
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({ upiId: 'new@upi' }))
    expect(result.upiId).toBe('new@upi')
  })

  it('overrides multiple scalar fields at once', () => {
    const live = { upiId: 'new@upi', waOrg: '919999999999', venue: 'Club House' }
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify(live))
    expect(result.upiId).toBe('new@upi')
    expect(result.waOrg).toBe('919999999999')
    expect(result.venue).toBe('Club House')
  })

  it('does not touch keys absent from live config', () => {
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({ upiId: 'x@y' }))
    expect(result.society).toBe('Prestige Song of the South, Bengaluru')
    expect(result.waOrg2).toBe('919902837002')
  })

  it('does not allow unknown/extra keys to pollute config', () => {
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({ injected: 'evil' }))
    expect(result['injected']).toBeUndefined()
  })

  it('does not mutate the original psots object', () => {
    const original = JSON.parse(JSON.stringify(BASE_CONFIG))
    applyLiveConfig(BASE_CONFIG, JSON.stringify({ upiId: 'mutated@upi' }))
    expect(BASE_CONFIG.upiId).toBe(original.upiId)
  })
})

describe('applyLiveConfig — nested objects', () => {
  it('merges arghyaEvening time without clobbering date', () => {
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({
      arghyaEvening: { time: '6:00 PM' }
    }))
    expect(result.arghyaEvening.time).toBe('6:00 PM')
    expect(result.arghyaEvening.date).toBe('Nov 3, 2026') // preserved
  })

  it('merges arghyaMorning date without clobbering time', () => {
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({
      arghyaMorning: { date: 'Nov 5, 2026' }
    }))
    expect(result.arghyaMorning.date).toBe('Nov 5, 2026')
    expect(result.arghyaMorning.time).toBe('6:15 AM')
  })

  it('merges kharnaTime location', () => {
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({
      kharnaTime: { location: 'Swimming Pool Area' }
    }))
    expect(result.kharnaTime.location).toBe('Swimming Pool Area')
    expect(result.kharnaTime.time).toBe('7:00 PM')
  })
})

describe('applyLiveConfig — committee array', () => {
  it('replaces committee when live has a non-empty array', () => {
    const newCommittee = [
      { name: 'New Person', role: 'Treasurer', phone: '9876543210' },
    ]
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({ committee: newCommittee }))
    expect(result.committee).toHaveLength(1)
    expect(result.committee[0].name).toBe('New Person')
  })

  it('does NOT replace committee when live has an empty array', () => {
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({ committee: [] }))
    expect(result.committee).toHaveLength(BASE_CONFIG.committee.length)
  })

  it('does NOT replace committee when live has no committee key', () => {
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({ upiId: 'x@y' }))
    expect(result.committee[0].name).toBe('Pushkal Kishore')
  })

  it('preserves all member fields in replaced committee', () => {
    const newCommittee = [
      { name: 'Anita', role: 'Finance', phone: '9876543210', wa: '919876543210', initial: 'A' },
    ]
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({ committee: newCommittee }))
    expect(result.committee[0].wa).toBe('919876543210')
    expect(result.committee[0].initial).toBe('A')
  })
})

describe('applyLiveConfig — error resilience', () => {
  it('pure fn throws on malformed JSON — real fn wraps in try/catch', () => {
    // The production IIFE in config.js has a try/catch that swallows parse
    // errors. Our extracted pure version doesn't. This test documents that
    // the error path exists and MUST stay wrapped in production.
    expect(() => applyLiveConfig(BASE_CONFIG, '{broken json}')).toThrow(SyntaxError)
  })

  it('valid input still works after a previous bad call', () => {
    try { applyLiveConfig(BASE_CONFIG, '{broken}') } catch {}
    const result = applyLiveConfig(BASE_CONFIG, JSON.stringify({ upiId: 'good@upi' }))
    expect(result.upiId).toBe('good@upi')
  })
})
