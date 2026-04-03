/**
 * ═══════════════════════════════════════════════════════════════════
 *  PSOTS CHHATH — RECEIPT SYSTEM
 *
 *  Generates and manages contribution receipts.
 *  Receipt numbers: PSOTS-[YEAR]-[YYYYMMDD]-[4-digit-seq]
 *  e.g. PSOTS-2026-20261103-0042
 *
 *  ── Year-over-year ───────────────────────────────────────────────
 *  Receipt HTML reads from window.PSOTS. No hardcoded years.
 * ═══════════════════════════════════════════════════════════════════
 */

window.PSOTS_RECEIPT = (function () {
  'use strict';

  var SEQ_KEY      = 'psots_receipt_seq';
  var RECEIPTS_KEY = 'psots_receipts';
  var MAX_STORED   = 20;

  /* ── Helpers ─────────────────────────────────────────────────── */
  function cfg() { return window.PSOTS || {}; }

  function pad(n, w) { return String(n).padStart(w, '0'); }

  function amountInWords(n) {
    var a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
             'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
             'Seventeen','Eighteen','Nineteen'];
    var b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    n = parseInt(n) || 0;
    if (n === 0) return 'Zero';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' '+a[n%10] : '');
    if (n < 1000) return a[Math.floor(n/100)]+' Hundred'+(n%100?' '+amountInWords(n%100):'');
    if (n < 100000) return amountInWords(Math.floor(n/1000))+' Thousand'+(n%1000?' '+amountInWords(n%1000):'');
    if (n < 10000000) return amountInWords(Math.floor(n/100000))+' Lakh'+(n%100000?' '+amountInWords(n%100000):'');
    return amountInWords(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+amountInWords(n%10000000):'');
  }

  /* ── Sequence counter (per year) ─────────────────────────────── */
  function nextSeq(year) {
    try {
      var key  = SEQ_KEY + '_' + year;
      var seq  = parseInt(localStorage.getItem(key) || '0', 10) + 1;
      localStorage.setItem(key, String(seq));
      return seq;
    } catch(e) { return Math.floor(Math.random() * 9000) + 1000; }
  }

  /* ── Public: generate receipt number ─────────────────────────── */
  function generate(year) {
    var yr  = year || cfg().activeYear || new Date().getFullYear();
    var now = new Date();
    var ds  = yr + pad(now.getMonth()+1, 2) + pad(now.getDate(), 2);
    var seq = nextSeq(yr);
    return 'PSOTS-' + yr + '-' + ds + '-' + pad(seq, 4);
  }

  /* ── Public: build receipt HTML ──────────────────────────────── */
  function buildHtml(d) {
    var C        = cfg();
    var society  = d.society  || C.society  || 'Prestige Song of the South, Bengaluru';
    var evtName  = d.eventName|| C.eventName|| 'PSOTS Chhath Puja ' + (d.year || C.activeYear || '');
    var dateStr  = d.date     || new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    var amtNum   = parseInt(d.amount) || 0;
    var amtFmt   = '₹' + amtNum.toLocaleString('en-IN');
    var amtWords = amountInWords(amtNum) + ' Rupees Only';

    return '<!DOCTYPE html><html lang="en"><head>' +
      '<meta charset="UTF-8"/>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
      '<title>Receipt ' + d.receiptNo + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Yatra+One&family=DM+Sans:wght@400;600;700;900&display=swap" rel="stylesheet">' +
      '<style>' +
        '*{box-sizing:border-box;margin:0;padding:0}' +
        'body{font-family:"DM Sans",system-ui,sans-serif;background:#fdf0e0;display:flex;justify-content:center;padding:2rem 1rem;min-height:100vh}' +
        '.receipt{background:#fff;width:100%;max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(93,30,0,.18);border:1px solid rgba(200,100,0,.12)}' +
        '.rh{background:linear-gradient(135deg,#2d0800,#5c1800 55%,#3d1000);padding:1.8rem 2rem 1.4rem;text-align:center;position:relative}' +
        '.rh::after{content:"";position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(255,194,0,.8),rgba(255,140,0,.9),rgba(255,194,0,.8),transparent)}' +
        '.rh-icon{font-size:2.8rem;display:block;margin-bottom:.6rem;filter:drop-shadow(0 4px 16px rgba(255,140,0,.6))}' +
        '.rh-title{font-size:.65rem;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,194,0,.75);font-weight:700;margin-bottom:.3rem}' +
        '.rh-event{font-family:"Yatra One",serif;font-size:1.1rem;color:#fff;margin-bottom:.18rem}' +
        '.rh-soc{font-size:.72rem;color:rgba(255,220,140,.65);letter-spacing:.06em}' +
        '.rb{padding:1.6rem 2rem}' +
        '.rno{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#fff5e8,#ffe8cc);border:1.5px solid rgba(232,92,0,.25);border-radius:10px;padding:.75rem 1rem;margin-bottom:1.4rem}' +
        '.rno-lbl{font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b3a18}' +
        '.rno-val{font-family:"DM Sans",sans-serif;font-weight:900;font-size:.88rem;color:#e85c00;letter-spacing:.04em}' +
        '.rrow{display:flex;justify-content:space-between;align-items:flex-start;padding:.55rem 0;border-bottom:1px solid #f5ebe0}' +
        '.rrow:last-of-type{border-bottom:none}' +
        '.rl{font-size:.78rem;color:#7a5030;font-weight:500;flex-shrink:0;padding-right:.8rem}' +
        '.rv{font-size:.82rem;font-weight:700;color:#1a0800;text-align:right}' +
        '.rv.big{font-size:1.5rem;font-weight:900;color:#e85c00}' +
        '.rv.words{font-size:.75rem;font-weight:600;color:#7a5030;font-style:italic}' +
        '.rdiv{height:1px;background:linear-gradient(90deg,transparent,rgba(232,92,0,.2),transparent);margin:1rem 0}' +
        '.rstatus{display:flex;align-items:center;gap:.5rem;background:rgba(255,152,0,.08);border:1px solid rgba(255,152,0,.25);border-radius:8px;padding:.5rem .85rem;margin-top:1rem}' +
        '.rstatus-dot{width:8px;height:8px;border-radius:50%;background:#ff9800;animation:rpulse 2s ease-in-out infinite;flex-shrink:0}' +
        '@keyframes rpulse{0%,100%{opacity:1}50%{opacity:.3}}' +
        '.rstatus-txt{font-size:.72rem;color:#7a5030;line-height:1.5}' +
        '.rf{background:#fdf5e0;padding:1rem 2rem;text-align:center;border-top:1px solid #f0d5b8}' +
        '.rf p{font-size:.68rem;color:#a07850;line-height:1.6}' +
        '.rf-jai{font-family:"Yatra One",serif;font-size:.95rem;color:#e85c00;margin-bottom:.3rem}' +
        '@media print{body{background:#fff;padding:0}.receipt{box-shadow:none;border:1px solid #ddd;border-radius:0}}' +
      '</style>' +
      '</head><body>' +
      '<div class="receipt">' +
        '<div class="rh">' +
          '<span class="rh-icon">🪔</span>' +
          '<div class="rh-title">Official Contribution Receipt</div>' +
          '<div class="rh-event">' + evtName + '</div>' +
          '<div class="rh-soc">' + society + '</div>' +
        '</div>' +
        '<div class="rb">' +
          '<div class="rno">' +
            '<span class="rno-lbl">Receipt No.</span>' +
            '<span class="rno-val">' + (d.receiptNo || '—') + '</span>' +
          '</div>' +
          '<div class="rrow"><span class="rl">Contributor</span><span class="rv">' + (d.name || '—') + '</span></div>' +
          '<div class="rrow"><span class="rl">Flat</span><span class="rv">' + (d.flat || '—') + '</span></div>' +
          '<div class="rrow"><span class="rl">Date</span><span class="rv">' + dateStr + '</span></div>' +
          '<div class="rrow"><span class="rl">Payment Method</span><span class="rv">' + (d.method || 'UPI') + '</span></div>' +
          '<div class="rdiv"></div>' +
          '<div class="rrow"><span class="rl">Amount</span><span class="rv big">' + amtFmt + '</span></div>' +
          '<div class="rrow"><span class="rl">In Words</span><span class="rv words">' + amtWords + '</span></div>' +
          '<div class="rstatus">' +
            '<div class="rstatus-dot"></div>' +
            '<div class="rstatus-txt">⚠️ <strong>Pending Verification</strong> — Subject to confirmation by the committee. This receipt is a record of your submission only.</div>' +
          '</div>' +
        '</div>' +
        '<div class="rf">' +
          '<div class="rf-jai">जय छठी मैया 🙏</div>' +
          '<p>This is a computer-generated receipt. For queries contact the committee.<br>Issued by PSOTS Chhath Puja Committee · ' + society + '</p>' +
        '</div>' +
      '</div>' +
      '<script>window.onload=function(){window.print();}</' + 'script>' +
      '</body></html>';
  }

  /* ── Public: save to localStorage ────────────────────────────── */
  function saveLocal(receiptData) {
    try {
      var receipts = JSON.parse(localStorage.getItem(RECEIPTS_KEY) || '[]');
      receipts.unshift({ ...receiptData, savedAt: new Date().toISOString() });
      if (receipts.length > MAX_STORED) receipts = receipts.slice(0, MAX_STORED);
      localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
    } catch(e) {}
  }

  /* ── Public: load from localStorage ─────────────────────────── */
  function load(receiptNo) {
    try {
      var receipts = JSON.parse(localStorage.getItem(RECEIPTS_KEY) || '[]');
      return receipts.find(function(r) { return r.receiptNo === receiptNo; }) || null;
    } catch(e) { return null; }
  }

  /* ── Public: open print dialog ───────────────────────────────── */
  function print(receiptData) {
    var html = buildHtml(receiptData);
    var win  = window.open('', '_blank', 'width=600,height=800');
    if (!win) { alert('Please allow popups to print the receipt.'); return; }
    win.document.write(html);
    win.document.close();
  }

  /* ── Public: download as HTML file ──────────────────────────── */
  function download(receiptData) {
    var html = buildHtml(receiptData);
    var blob = new Blob([html], { type: 'text/html' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'PSOTS-Receipt-' + (receiptData.receiptNo || 'draft') + '.html';
    a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
  }

  return { generate, buildHtml, saveLocal, load, print, download };

})();
