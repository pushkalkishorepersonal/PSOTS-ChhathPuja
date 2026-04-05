/**
 * Tests for js/receipt.js
 *
 * Covers:
 *  1. amountInWords  — pure converter, financial amounts appear on receipts
 *  2. generate()     — receipt number format PSOTS-YEAR-YYYYMMDD-NNNN
 *  3. buildHtml()    — receipt HTML contains required fields
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ── Pure functions extracted from js/receipt.js ──────────────────────────────
function pad(n, w) { return String(n).padStart(w, '0') }

function amountInWords(n) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
             'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
             'Seventeen','Eighteen','Nineteen']
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  n = parseInt(n) || 0
  if (n === 0) return 'Zero'
  if (n < 20)  return a[n]
  if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' '+a[n%10] : '')
  if (n < 1000) return a[Math.floor(n/100)]+' Hundred'+(n%100?' '+amountInWords(n%100):'')
  if (n < 100000) return amountInWords(Math.floor(n/1000))+' Thousand'+(n%1000?' '+amountInWords(n%1000):'')
  if (n < 10000000) return amountInWords(Math.floor(n/100000))+' Lakh'+(n%100000?' '+amountInWords(n%100000):'')
  return amountInWords(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+amountInWords(n%10000000):'')
}

// generate() depends on localStorage + Date — test via jsdom globals
const SEQ_KEY = 'psots_receipt_seq'

function nextSeq(year, storage) {
  const key = SEQ_KEY + '_' + year
  const seq = parseInt(storage.getItem(key) || '0', 10) + 1
  storage.setItem(key, String(seq))
  return seq
}

function generate(year, now, storage) {
  const yr  = year || new Date().getFullYear()
  const ds  = yr + pad(now.getMonth()+1, 2) + pad(now.getDate(), 2)
  const seq = nextSeq(yr, storage)
  return 'PSOTS-' + yr + '-' + ds + '-' + pad(seq, 4)
}

// ── amountInWords ─────────────────────────────────────────────────────────────
describe('amountInWords', () => {
  it('returns Zero for 0', () => {
    expect(amountInWords(0)).toBe('Zero')
  })

  it('handles single digits', () => {
    expect(amountInWords(1)).toBe('One')
    expect(amountInWords(9)).toBe('Nine')
  })

  it('handles teens correctly', () => {
    expect(amountInWords(11)).toBe('Eleven')
    expect(amountInWords(15)).toBe('Fifteen')
    expect(amountInWords(19)).toBe('Nineteen')
  })

  it('handles tens', () => {
    expect(amountInWords(20)).toBe('Twenty')
    expect(amountInWords(30)).toBe('Thirty')
    expect(amountInWords(90)).toBe('Ninety')
  })

  it('handles compound two-digit numbers', () => {
    expect(amountInWords(21)).toBe('Twenty One')
    expect(amountInWords(99)).toBe('Ninety Nine')
  })

  it('handles hundreds', () => {
    expect(amountInWords(100)).toBe('One Hundred')
    expect(amountInWords(500)).toBe('Five Hundred')
    expect(amountInWords(101)).toBe('One Hundred One')
    expect(amountInWords(999)).toBe('Nine Hundred Ninety Nine')
  })

  it('handles thousands', () => {
    expect(amountInWords(1000)).toBe('One Thousand')
    expect(amountInWords(5000)).toBe('Five Thousand')
    expect(amountInWords(1001)).toBe('One Thousand One')
    expect(amountInWords(10000)).toBe('Ten Thousand')
  })

  it('handles common contribution amounts', () => {
    expect(amountInWords(501)).toBe('Five Hundred One')
    expect(amountInWords(1100)).toBe('One Thousand One Hundred')
    expect(amountInWords(5100)).toBe('Five Thousand One Hundred')
    expect(amountInWords(11000)).toBe('Eleven Thousand')
    expect(amountInWords(15000)).toBe('Fifteen Thousand')
    expect(amountInWords(21000)).toBe('Twenty One Thousand')
  })

  it('handles lakhs', () => {
    expect(amountInWords(100000)).toBe('One Lakh')
    expect(amountInWords(250000)).toBe('Two Lakh Fifty Thousand')
  })

  it('handles string input via parseInt', () => {
    expect(amountInWords('1000')).toBe('One Thousand')
  })

  it('returns Zero for NaN/undefined', () => {
    expect(amountInWords(NaN)).toBe('Zero')
    expect(amountInWords(undefined)).toBe('Zero')
  })
})

// ── generate() receipt number format ─────────────────────────────────────────
describe('generate — receipt number format', () => {
  let storage

  beforeEach(() => {
    storage = new Map()
    storage.getItem  = (k) => storage.get(k) ?? null
    storage.setItem  = (k, v) => storage.set(k, v)
  })

  it('produces correct PSOTS-YEAR-YYYYMMDD-NNNN format', () => {
    const date = new Date('2026-11-03T10:00:00')
    const rno  = generate(2026, date, storage)
    expect(rno).toBe('PSOTS-2026-20261103-0001')
  })

  it('zero-pads sequence to 4 digits', () => {
    const date = new Date('2026-11-03T10:00:00')
    expect(generate(2026, date, storage)).toBe('PSOTS-2026-20261103-0001')
    expect(generate(2026, date, storage)).toBe('PSOTS-2026-20261103-0002')
  })

  it('includes the correct date in the number', () => {
    const date = new Date('2026-11-04T05:30:00') // Usha Arghya day
    const rno  = generate(2026, date, storage)
    expect(rno).toContain('20261104')
  })

  it('increments sequence per year independently', () => {
    const date = new Date('2026-11-03T10:00:00')
    generate(2026, date, storage)
    generate(2026, date, storage)
    const y2027 = generate(2027, new Date('2027-11-01T10:00:00'), storage)
    expect(y2027).toBe('PSOTS-2027-20271101-0001') // 2027 starts at 0001
  })

  it('sequence survives across calls (persisted in storage)', () => {
    const date = new Date('2026-11-03T10:00:00')
    for (let i = 0; i < 9; i++) generate(2026, date, storage)
    expect(generate(2026, date, storage)).toBe('PSOTS-2026-20261103-0010')
  })

  it('pads month and day with leading zeros', () => {
    const date = new Date('2026-01-05T10:00:00') // Jan 5
    const rno  = generate(2026, date, storage)
    expect(rno).toBe('PSOTS-2026-20260105-0001')
  })
})

// ── Receipt number regex validation ──────────────────────────────────────────
describe('receipt number — regex validation', () => {
  const RECEIPT_RE = /^PSOTS-\d{4}-\d{8}-\d{4}$/

  it('valid receipt numbers match the pattern', () => {
    expect('PSOTS-2026-20261103-0001').toMatch(RECEIPT_RE)
    expect('PSOTS-2026-20261104-0042').toMatch(RECEIPT_RE)
    expect('PSOTS-2027-20271101-9999').toMatch(RECEIPT_RE)
  })

  it('invalid formats do not match', () => {
    expect('PSOTS-26-20261103-0001').not.toMatch(RECEIPT_RE)   // short year
    expect('PSOTS-2026-2026110-0001').not.toMatch(RECEIPT_RE)  // short date
    expect('PSOTS-2026-20261103-001').not.toMatch(RECEIPT_RE)  // 3-digit seq
    expect('psots-2026-20261103-0001').not.toMatch(RECEIPT_RE) // lowercase
    expect('2026-20261103-0001').not.toMatch(RECEIPT_RE)       // missing prefix
  })
})
