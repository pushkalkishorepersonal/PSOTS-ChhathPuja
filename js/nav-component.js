/**
 * ═══════════════════════════════════════════════════════════════════
 *  PSOTS CHHATH — SHARED NAVIGATION COMPONENT
 *
 *  Drop this script into ANY page (<script src="/js/nav-component.js">
 *  or <script src="../js/nav-component.js">) and a fully responsive,
 *  config-driven navigation bar is injected automatically.
 *
 *  ✦ ZERO DEPENDENCIES — works before Firebase / config.js loads
 *    (upgrades itself when window.PSOTS becomes available)
 *  ✦ PATH-AWARE — auto-detects root vs /pages/ sub-directory
 *  ✦ ACTIVE-STATE — highlights the current page link
 *  ✦ AUTH-AWARE — shows user's first name when Firebase auth is ready
 *  ✦ CONFIG-DRIVEN — event year and name always come from config.js
 *
 *  ── Year-over-year maintenance ───────────────────────────────────
 *  Nothing in this file needs to change each year.
 *  Update js/config.js → window.PSOTS.eventStart and this nav
 *  automatically shows the correct year everywhere.
 * ═══════════════════════════════════════════════════════════════════
 */
(function PSOTS_NAV() {
  'use strict';

  /* ── Path resolution ──────────────────────────────────────────── */
  var path  = window.location.pathname;
  var depth = (path.match(/\//g) || []).length;
  // depth 1 = root (index.html), depth 2 = /pages/foo.html
  var root  = path.indexOf('/pages/') !== -1 ? '../' : './';

  /* ── Nav link definitions ─────────────────────────────────────── */
  // href is relative to SITE ROOT so active-detection is consistent.
  var NAV_LINKS = [
    { label: 'Schedule',      href: '/pages/schedule.html',      icon: '📅' },
    { label: 'Updates',       href: '/pages/announcements.html', icon: '📢' },
    { label: 'Gallery',       href: '/pages/gallery.html',       icon: '📸' },
    { label: 'FAQ',           href: '/pages/faq.html',           icon: '❓' },
  ];

  /* ── Active-page detection ────────────────────────────────────── */
  function isActive(href) {
    // Exact or trailing-slash match
    return path === href || path === href.replace('.html', '') ||
           path.endsWith(href.replace(/^\//, ''));
  }

  /* ── Build nav link HTML ──────────────────────────────────────── */
  function linkHtml(l, cls) {
    var active = isActive(l.href) ? ' pn-active' : '';
    var href   = root + l.href.replace(/^\//, '');
    return '<a href="' + href + '" class="' + cls + active + '">' + l.label + '</a>';
  }

  function mobileLinkHtml(l) {
    var active = isActive(l.href) ? ' pn-mob-active' : '';
    var href   = root + l.href.replace(/^\//, '');
    return '<a href="' + href + '" class="pn-mob-link' + active + '">'
         + '<span class="pn-mob-icon">' + l.icon + '</span>' + l.label + '</a>';
  }

  /* ── Year label (fallback to 'Chhath Puja' until config loads) ── */
  function yearLabel() {
    var yr = (window.PSOTS && window.PSOTS.activeYear) ? window.PSOTS.activeYear : '';
    return yr ? 'Chhath ' + yr : 'Chhath Puja';
  }

  /* ── Portal button label ──────────────────────────────────────── */
  function portalLabel() {
    return '👤 My Account';
  }

  /* ── CSS (self-contained so nav works before style.css loads) ─── */
  var CSS = '\
:root { --nav-height: 60px; }\
.psots-nav {\
  height: var(--nav-height);\
  position: sticky; top: 0; z-index: 300;\
  background: linear-gradient(135deg, rgba(61,16,0,.97) 0%, rgba(45,10,0,.97) 100%);\
  backdrop-filter: blur(24px) saturate(200%);\
  -webkit-backdrop-filter: blur(24px) saturate(200%);\
  border-bottom: 1px solid rgba(255,194,0,.25);\
  box-shadow: 0 4px 28px rgba(93,30,0,.35);\
  font-family: "DM Sans", system-ui, sans-serif;\
}\
.psots-nav::after {\
  content: ""; position: absolute; bottom: 0; left: 6%; right: 6%; height: 1px;\
  background: linear-gradient(90deg, transparent, rgba(255,194,0,.4), transparent);\
  pointer-events: none;\
}\
.pn-inner {\
  max-width: 1280px; margin: 0 auto;\
  height: 100%; padding: 0 1.25rem;\
  display: flex; align-items: center; gap: 0;\
}\
/* Brand */\
.pn-brand {\
  display: flex; align-items: center; gap: .5rem;\
  text-decoration: none; flex-shrink: 0; margin-right: auto;\
}\
.pn-brand-icon { font-size: 1.3rem; line-height: 1; }\
.pn-brand-name {\
  font-family: "Yatra One", serif; font-size: .9rem;\
  color: #ffc200; line-height: 1.15;\
  text-shadow: 0 0 18px rgba(255,194,0,.3);\
}\
.pn-brand-year {\
  font-size: .6rem; letter-spacing: .14em; text-transform: uppercase;\
  color: rgba(255,198,0,.7); display: block;\
}\
/* Desktop links */\
.pn-links {\
  display: none;\
  align-items: center; gap: .1rem;\
  margin: 0 .5rem;\
}\
.pn-link {\
  color: rgba(255,224,130,.82); text-decoration: none;\
  font-size: .8rem; font-weight: 500; letter-spacing: .01em;\
  padding: .4rem .65rem; border-radius: 8px;\
  transition: color .2s, background .2s;\
  white-space: nowrap;\
}\
.pn-link:hover { color: #ffc200; background: rgba(255,194,0,.1); }\
.pn-link.pn-active { color: #ffc200; background: rgba(255,194,0,.12); font-weight: 600; }\
/* Actions */\
.pn-actions { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }\
.pn-btn-contribute {\
  background: linear-gradient(135deg, #e85c00 0%, #c93800 100%);\
  color: #fff; text-decoration: none;\
  border-radius: 9999px; padding: .38rem 1rem;\
  font-size: .78rem; font-weight: 700;\
  box-shadow: 0 3px 14px rgba(232,92,0,.4);\
  transition: transform .18s, box-shadow .18s;\
  display: none; white-space: nowrap;\
}\
.pn-btn-contribute:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(232,92,0,.5); }\
.pn-btn-portal {\
  background: rgba(255,194,0,.12);\
  border: 1px solid rgba(255,194,0,.35);\
  color: #ffc200; text-decoration: none;\
  border-radius: 9999px; padding: .36rem .88rem;\
  font-size: .76rem; font-weight: 700; letter-spacing: .01em;\
  transition: background .2s, border-color .2s, box-shadow .2s;\
  white-space: nowrap;\
}\
.pn-btn-portal:hover {\
  background: rgba(255,194,0,.22);\
  border-color: rgba(255,194,0,.55);\
  box-shadow: 0 0 16px rgba(255,194,0,.2);\
}\
/* Hamburger */\
.pn-hamburger {\
  background: none; border: none; cursor: pointer;\
  display: flex; flex-direction: column;\
  justify-content: center; gap: 5px;\
  padding: .4rem .3rem; width: 36px; height: 36px;\
  flex-shrink: 0;\
  border-radius: 8px; transition: background .2s;\
}\
.pn-hamburger:hover { background: rgba(255,194,0,.1); }\
.pn-hamburger span {\
  display: block; height: 2px; width: 20px;\
  background: rgba(255,224,130,.9);\
  border-radius: 2px;\
  transition: transform .28s var(--ease, ease), opacity .2s, background .2s;\
  transform-origin: center;\
}\
.pn-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }\
.pn-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }\
.pn-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }\
/* Mobile dropdown */\
.pn-mob-menu {\
  display: none;\
  position: absolute; top: var(--nav-height); left: 0; right: 0;\
  background: rgba(32,8,0,.97);\
  backdrop-filter: blur(20px) saturate(200%);\
  -webkit-backdrop-filter: blur(20px) saturate(200%);\
  border-bottom: 1px solid rgba(255,194,0,.2);\
  padding: .65rem 1rem 1rem;\
  box-shadow: 0 12px 40px rgba(0,0,0,.45);\
  z-index: 299;\
}\
.pn-mob-menu.open { display: block; animation: pnSlide .22s ease both; }\
@keyframes pnSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }\
.pn-mob-link {\
  display: flex; align-items: center; gap: .75rem;\
  text-decoration: none; color: rgba(255,224,130,.88);\
  font-size: .9rem; font-weight: 500;\
  padding: .7rem .9rem; border-radius: 10px;\
  transition: background .18s, color .18s;\
}\
.pn-mob-link:hover, .pn-mob-link.pn-mob-active {\
  background: rgba(255,194,0,.1); color: #ffc200;\
}\
.pn-mob-icon { font-size: 1.1rem; width: 1.4rem; text-align: center; flex-shrink: 0; }\
.pn-mob-sep {\
  height: 1px; background: rgba(255,194,0,.12);\
  margin: .5rem .4rem;\
}\
.pn-mob-cta {\
  background: linear-gradient(135deg, rgba(232,92,0,.9), rgba(180,50,0,.9));\
  color: #fff !important; border-radius: 10px;\
  font-weight: 700 !important;\
}\
.pn-mob-cta:hover { background: linear-gradient(135deg, #e85c00, #c93800) !important; }\
/* Desktop layout breakpoints */\
@media (min-width: 720px) {\
  .pn-inner { padding: 0 2rem; gap: .5rem; }\
  .pn-brand { margin-right: 1rem; }\
  .pn-links { display: flex; }\
  .pn-btn-contribute { display: inline-flex; }\
  .pn-hamburger { display: none; }\
  .pn-mob-menu { display: none !important; }\
}\
@media (min-width: 1024px) {\
  .pn-inner { padding: 0 3rem; }\
  .pn-links { gap: .2rem; }\
  .pn-link { font-size: .85rem; padding: .42rem .8rem; }\
  .pn-btn-portal { font-size: .82rem; padding: .4rem 1rem; }\
  .pn-btn-contribute { font-size: .82rem; padding: .4rem 1.1rem; }\
}\
@media (min-width: 1280px) {\
  .pn-inner { padding: 0 4rem; }\
}\
/* Ensure body content starts below sticky nav */\
body { padding-top: 0; }\
';

  /* ── Build nav HTML ───────────────────────────────────────────── */
  function buildNav() {
    var yr    = yearLabel();
    var links = NAV_LINKS.map(function(l){ return linkHtml(l, 'pn-link'); }).join('');
    var mobs  = NAV_LINKS.map(mobileLinkHtml).join('');

    return '<nav class="psots-nav" id="psots-nav" role="navigation" aria-label="Main navigation">'
    + '<div class="pn-inner">'
    +   '<a href="' + root + 'index.html" class="pn-brand" aria-label="PSOTS Chhath Home">'
    +     '<span class="pn-brand-icon">🪔</span>'
    +     '<div>'
    +       '<div class="pn-brand-name">PSOTS</div>'
    +       '<div class="pn-brand-year" id="pn-brand-year">' + yr + '</div>'
    +     '</div>'
    +   '</a>'
    +   '<div class="pn-links">' + links + '</div>'
    +   '<div class="pn-actions">'
    +     '<a href="' + root + 'pages/payment.html" class="pn-btn-contribute">💸 Contribute</a>'
    +     '<a href="' + root + 'portal.html" class="pn-btn-portal" id="pn-portal-btn">' + portalLabel() + '</a>'
    +     '<button class="pn-hamburger" id="pn-hamburger" aria-label="Toggle menu" aria-expanded="false">'
    +       '<span></span><span></span><span></span>'
    +     '</button>'
    +   '</div>'
    + '</div>'
    + '<div class="pn-mob-menu" id="pn-mob-menu" role="menu">'
    +   mobs
    +   '<div class="pn-mob-sep"></div>'
    +   '<a href="' + root + 'pages/payment.html" class="pn-mob-link pn-mob-cta">'
    +     '<span class="pn-mob-icon">💸</span>Contribute Now'
    +   '</a>'
    +   '<a href="' + root + 'portal.html" class="pn-mob-link" id="pn-mob-portal">'
    +     '<span class="pn-mob-icon">👤</span>My Account'
    +   '</a>'
    + '</div>'
    + '</nav>';
  }

  /* ── Inject styles ────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('psots-nav-css')) return;
    var style = document.createElement('style');
    style.id  = 'psots-nav-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ── Inject nav into DOM ──────────────────────────────────────── */
  function injectNav() {
    if (document.getElementById('psots-nav')) return;

    injectStyles();

    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildNav();
    var nav = wrapper.firstElementChild;

    // Insert as first child of body
    document.body.insertBefore(nav, document.body.firstChild);

    // Hamburger toggle
    var btn  = document.getElementById('pn-hamburger');
    var menu = document.getElementById('pn-mob-menu');
    if (btn && menu) {
      btn.addEventListener('click', function() {
        var open = menu.classList.toggle('open');
        btn.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open);
      });
      // Close on link click
      menu.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() {
          menu.classList.remove('open');
          btn.classList.remove('open');
          btn.setAttribute('aria-expanded', false);
        });
      });
      // Close on outside click
      document.addEventListener('click', function(e) {
        if (!nav.contains(e.target)) {
          menu.classList.remove('open');
          btn.classList.remove('open');
          btn.setAttribute('aria-expanded', false);
        }
      });
    }
  }

  /* ── Upgrade with config data once window.PSOTS is ready ──────── */
  function applyConfig() {
    if (!window.PSOTS) return;
    var el = document.getElementById('pn-brand-year');
    if (el) el.textContent = 'Chhath ' + window.PSOTS.activeYear;
  }

  /* ── Auth state upgrade (only if Firebase auth available) ──────── */
  function watchAuth() {
    if (!window.firebase || !firebase.auth) return;
    try {
      firebase.auth().onAuthStateChanged(function(user) {
        var btn  = document.getElementById('pn-portal-btn');
        var mob  = document.getElementById('pn-mob-portal');
        if (!user) return;
        var first = user.displayName ? user.displayName.split(' ')[0] : 'My Account';
        var label = '👤 ' + first;
        if (btn) btn.textContent = label;
        if (mob) mob.childNodes[1].textContent = first;
      });
    } catch(e) {}
  }

  /* ── Bootstrap ────────────────────────────────────────────────── */
  function init() {
    injectNav();
    applyConfig();
    // Poll for PSOTS config if it loads after this script
    if (!window.PSOTS) {
      var attempts = 0;
      var poll = setInterval(function() {
        attempts++;
        if (window.PSOTS) { applyConfig(); clearInterval(poll); }
        if (attempts > 20) clearInterval(poll);
      }, 150);
    }
    // Poll for Firebase auth
    var authAttempts = 0;
    var authPoll = setInterval(function() {
      authAttempts++;
      if (window.firebase && firebase.auth) { watchAuth(); clearInterval(authPoll); }
      if (authAttempts > 30) clearInterval(authPoll);
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
