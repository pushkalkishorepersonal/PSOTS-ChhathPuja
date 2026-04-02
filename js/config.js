/**
 * ════════════════════════════════════════════════════
 *  PSOTS CHHATH — CENTRAL CONFIGURATION
 *  Edit THIS ONE FILE to update everything site-wide.
 *
 *  ── For a new year (e.g. 2026 → 2027) ─────────────
 *  1. Update eventName, eventStart, deadline, arghyaEvening,
 *     arghyaMorning, kharnaTime to next year's values.
 *  2. Move current year's actuals into history (see below).
 *  3. In Admin → Finance tab, click "Year Rollover" to
 *     archive this year's data and carry forward the balance.
 *  That's it — everything else derives from these values.
 *
 *  Only 2 values need filling after initial setup:
 *    1. scriptUrl      → after Google Sheet setup
 *    2. googleClientId → after Google Cloud setup
 * ════════════════════════════════════════════════════
 */
window.PSOTS = {

  /* ── PAYMENT ──────────────────── */
  upiId:     '9482088904@sbi',
  upiMobile: '9482088904',
  payeeName: 'ChhathPuja2026PSOTS',

  /* ── CONTACTS ─────────────────── */
  waOrg:  '919482088904',
  waOrg2: '919902837002',
  phone1: '9482088904',
  phone2: '9902837002',

  /* ── EVENT ────────────────────── */
  eventName:  'PSOTS Chhath Puja 2026 — पंच वर्ष महोत्सव',
  society:    'Prestige Song of the South, Bengaluru',
  eventStart: '2026-11-01T06:00:00',
  deadline:   '2026-10-25T23:59:00',
  venue:      'Society Ghat — Prestige Song of the South',

  arghyaEvening: { time: '5:45 PM', date: 'Nov 3, 2026' },
  arghyaMorning: { time: '6:15 AM', date: 'Nov 4, 2026' },
  kharnaTime:    { time: '7:00 PM', date: 'Nov 2, 2026', location: 'Community Hall' },

  /* ── COMMITTEE ────────────────── */
  committee: [
    { name:'Pushkal Kishore', role:'Chief Organiser',  phone:'9482088904', wa:'919482088904', initial:'P' },
    { name:'Treasurer',       role:'Finance',           phone:'9902837002', wa:'919902837002', initial:'T' },
    { name:'Decoration Head', role:'Ghat & Lighting',   phone:'',           wa:'',             initial:'D' },
    { name:'Prasad Coord.',   role:'Prasad & Food',     phone:'',           wa:'',             initial:'P' },
  ],

  /* ── HISTORICAL FINANCE ─────────
   *  Add the completed year's actuals here each year-end.
   *  The Finance page YoY chart and the Year Rollover tool
   *  both read from this object.
   * ──────────────────────────────── */
  history: {
    2022: { expenses: 125300 },
    2023: { expenses: 183630 },
    2024: { expenses: 217048 },
    2025: {
      contributors: 141, vratis: 15,
      collected: 235553, expenses: 198383, carry: 104670, budget: 282000,
      tent: 62801, kharna: 60201, thekua: 52908, misc: 22473,
    },
    // 2026 will be added here after year-end rollover
  },

  /* ── WHATSAPP CHANNEL ─────────── */
  waChannel: 'https://chat.whatsapp.com/G9hKgycJFZDB6Bcuqv3Uzp',

  /* ── DOMAIN ───────────────────── */
  domain:  'chhath.psots.in',
  siteUrl: 'https://chhath.psots.in',

  /* ── ADMIN EMAILS ─────────────── */
  adminEmails: ['pushkalkishore@gmail.com'],

  /* ══ FILL THESE AFTER SETUP ══════
     See README.md for exact steps.   */
  scriptUrl:      'https://script.google.com/macros/s/AKfycbwo_Q0zW-YQnfeKl-nBeS8vDjqQ0LYAavG5HP7Dv1rYr7Hzj5ZRLRknpTjE6pQ3yNhx/exec',
  googleClientId: '681152691156-g1q8bmionkcim033fhjhtn57jbiq1nij.apps.googleusercontent.com',
};

/* ── Live config override (saved by admin via UI) ──
 *  Admin Settings → Event Config → Save overwrites these keys
 *  in localStorage. Every page load picks them up instantly —
 *  no file editing required.
 * ─────────────────────────────────────────────── */
(function applyLiveConfig() {
  try {
    const live = JSON.parse(localStorage.getItem('psots_live_config') || 'null');
    if (!live) return;
    // Merge top-level scalar fields
    ['eventName','eventStart','deadline','payeeName','upiId','upiMobile','waOrg','waOrg2','phone1','phone2','venue','society'].forEach(k => {
      if (live[k] !== undefined) window.PSOTS[k] = live[k];
    });
    // Merge nested objects
    if (live.arghyaEvening) Object.assign(window.PSOTS.arghyaEvening, live.arghyaEvening);
    if (live.arghyaMorning) Object.assign(window.PSOTS.arghyaMorning, live.arghyaMorning);
    if (live.kharnaTime)    Object.assign(window.PSOTS.kharnaTime,    live.kharnaTime);
  } catch(e) {}
})();

/* ── Derived helpers (do not edit below) ── */
window.PSOTS.activeYear = new Date(window.PSOTS.eventStart).getFullYear();
window.PSOTS.fmt        = n => '₹' + parseInt(n||0).toLocaleString('en-IN');
window.PSOTS.daysLeft   = () => Math.max(0, Math.ceil((new Date(PSOTS.eventStart)-new Date())/86400000));

/* ── PWA: inject manifest link + register Service Worker ────────────────────
 *  Runs on every page (config.js is universal).
 *  The manifest href is always absolute so it works from /pages/ sub-paths.
 * ─────────────────────────────────────────────────────────────────────────── */
(function _psotsInstallPWA() {
  // Inject <link rel="manifest"> if not already present
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel   = 'manifest';
    link.href  = '/manifest.json';
    document.head.appendChild(link);
  }
  // Register the Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(function (reg) {
          console.info('[PSOTS SW] registered, scope:', reg.scope);
          // Check for updates on each page load (won't disrupt current session)
          reg.update().catch(function () {});
        })
        .catch(function (err) {
          console.warn('[PSOTS SW] registration failed:', err.message);
        });
    });
  }
})();

/* ── PWA: "Add to Home Screen" install banner ───────────────────────────────
 *  Shows a small bottom banner when the browser fires beforeinstallprompt.
 *  Dismissed state persists in localStorage for 30 days.
 *  Styled to match the site palette (maroon/gold) without any external deps.
 * ─────────────────────────────────────────────────────────────────────────── */
(function _psotsInstallBanner() {
  const DISMISS_KEY = 'psots_pwa_dismissed';
  const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

  function wasDismissed() {
    try {
      const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
      return ts && (Date.now() - ts) < DISMISS_TTL;
    } catch (e) { return false; }
  }

  let _deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    if (wasDismissed()) return;

    // Delay slightly so the page content loads first
    setTimeout(function () {
      if (!_deferredPrompt) return;

      const banner = document.createElement('div');
      banner.id = 'psots-install-banner';
      banner.innerHTML =
        '<style>' +
        '#psots-install-banner{position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
        'background:linear-gradient(135deg,#3d1000,#2d0800);color:#fff;' +
        'display:flex;align-items:center;gap:.75rem;padding:.9rem 1.1rem 1.1rem;' +
        'box-shadow:0 -4px 24px rgba(0,0,0,.35);animation:pib .35s ease both}' +
        '@keyframes pib{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
        '#psots-install-banner .pib-icon{font-size:2rem;flex-shrink:0}' +
        '#psots-install-banner .pib-text{flex:1;min-width:0}' +
        '#psots-install-banner .pib-title{font-weight:700;font-size:.88rem;color:#ffc200;margin-bottom:.15rem}' +
        '#psots-install-banner .pib-sub{font-size:.75rem;color:rgba(255,220,160,.78);line-height:1.4}' +
        '#psots-install-banner .pib-install{background:linear-gradient(135deg,#e85c00,#c93800);' +
        'color:#fff;border:none;border-radius:50px;padding:.5rem 1.1rem;font-size:.8rem;font-weight:700;' +
        'cursor:pointer;white-space:nowrap;flex-shrink:0;box-shadow:0 3px 10px rgba(232,92,0,.4)}' +
        '#psots-install-banner .pib-close{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.6);' +
        'border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:.9rem;flex-shrink:0;display:flex;align-items:center;justify-content:center}' +
        '</style>' +
        '<div class="pib-icon">🌅</div>' +
        '<div class="pib-text">' +
          '<div class="pib-title">Add to Home Screen</div>' +
          '<div class="pib-sub">One tap access — schedules, payments, updates even offline</div>' +
        '</div>' +
        '<button class="pib-install" onclick="window._psotsInstall()">Install</button>' +
        '<button class="pib-close" onclick="window._psotsInstallDismiss()" title="Dismiss">✕</button>';

      document.body.appendChild(banner);
    }, 3000);
  });

  window._psotsInstall = function () {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(function () {
      _deferredPrompt = null;
      const b = document.getElementById('psots-install-banner');
      if (b) b.remove();
    });
  };

  window._psotsInstallDismiss = function () {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
    _deferredPrompt = null;
    const b = document.getElementById('psots-install-banner');
    if (b) { b.style.animation = 'pib .3s ease reverse'; setTimeout(function () { b.remove(); }, 300); }
  };
})();
