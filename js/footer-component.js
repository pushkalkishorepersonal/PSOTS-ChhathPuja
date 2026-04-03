/**
 * ═══════════════════════════════════════════════════════════════════
 *  PSOTS CHHATH — SHARED FOOTER COMPONENT
 *
 *  Add <script src="/js/footer-component.js"></script> (or ../js/...)
 *  to any page and a consistent, config-driven footer is appended.
 *
 *  ✦ Config-driven: year, event name, committee contacts all come
 *    from window.PSOTS (js/config.js) — nothing hardcoded here.
 *  ✦ Path-aware: works from root and from /pages/ sub-directory.
 *  ✦ Zero dependencies: self-contained CSS, renders immediately.
 *
 *  ── Year-over-year maintenance ───────────────────────────────────
 *  Nothing in this file changes each year. Update config.js only.
 * ═══════════════════════════════════════════════════════════════════
 */
(function PSOTS_FOOTER() {
  'use strict';

  var path = window.location.pathname;
  var root = path.indexOf('/pages/') !== -1 ? '../' : './';

  /* ── Footer CSS ───────────────────────────────────────────────── */
  var CSS = '\
.psots-footer {\
  background: linear-gradient(180deg, #2a0800 0%, #1e0500 60%, #180400 100%);\
  color: rgba(255,220,140,.8);\
  font-family: "DM Sans", system-ui, sans-serif;\
  position: relative;\
  overflow: hidden;\
}\
.psots-footer::before {\
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;\
  background: linear-gradient(90deg, transparent, rgba(255,194,0,.5), rgba(255,140,0,.65), rgba(255,194,0,.5), transparent);\
}\
.pf-inner {\
  max-width: 1120px; margin: 0 auto;\
  padding: 3rem 1.5rem 2rem;\
  display: grid;\
  grid-template-columns: 1fr;\
  gap: 2rem;\
}\
/* Brand block */\
.pf-brand { text-align: center; }\
.pf-brand-icon { font-size: 2.4rem; display: block; margin-bottom: .5rem;\
  filter: drop-shadow(0 4px 16px rgba(255,140,0,.5));\
  animation: pfFloat 4s ease-in-out infinite;\
}\
@keyframes pfFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }\
.pf-brand-name {\
  font-family: "Yatra One", serif; font-size: 1.15rem;\
  color: #ffc200; margin-bottom: .25rem;\
  text-shadow: 0 0 20px rgba(255,194,0,.35);\
}\
.pf-brand-sub {\
  font-size: .75rem; color: rgba(255,198,0,.62);\
  letter-spacing: .18em; text-transform: uppercase;\
}\
.pf-tagline {\
  font-family: "Yatra One", serif;\
  font-size: .88rem; color: rgba(255,224,130,.78);\
  margin-top: .55rem; letter-spacing: .04em;\
}\
/* Nav columns */\
.pf-cols {\
  display: grid;\
  grid-template-columns: repeat(2, 1fr);\
  gap: 1.5rem;\
}\
.pf-col-title {\
  font-size: .68rem; font-weight: 700;\
  letter-spacing: .2em; text-transform: uppercase;\
  color: rgba(255,194,0,.7); margin-bottom: .75rem;\
  padding-bottom: .4rem;\
  border-bottom: 1px solid rgba(255,194,0,.12);\
}\
.pf-col ul { list-style: none; padding: 0; margin: 0; }\
.pf-col li { margin-bottom: .38rem; }\
.pf-col a {\
  color: rgba(255,220,140,.72); text-decoration: none;\
  font-size: .82rem; font-weight: 400;\
  transition: color .2s;\
  display: inline-flex; align-items: center; gap: .35rem;\
}\
.pf-col a:hover { color: #ffc200; }\
/* Contact */\
.pf-contact-item {\
  display: flex; align-items: flex-start; gap: .6rem;\
  margin-bottom: .55rem;\
}\
.pf-contact-icon { font-size: 1rem; flex-shrink: 0; margin-top: .05rem; }\
.pf-contact-name { font-size: .82rem; font-weight: 600; color: rgba(255,224,130,.88); }\
.pf-contact-role { font-size: .72rem; color: rgba(255,198,0,.55); display: block; }\
.pf-contact-phone { font-size: .76rem; color: rgba(255,220,140,.65); }\
/* Bottom bar */\
.pf-bottom {\
  border-top: 1px solid rgba(255,194,0,.1);\
  padding: 1.25rem 1.5rem;\
  text-align: center;\
  font-size: .73rem;\
  color: rgba(255,200,100,.45);\
  line-height: 2;\
}\
.pf-bottom a {\
  color: rgba(255,200,100,.55); text-decoration: none;\
  transition: color .2s;\
}\
.pf-bottom a:hover { color: rgba(255,194,0,.85); }\
.pf-bottom span { color: rgba(255,194,0,.7); }\
.pf-jai {\
  font-family: "Yatra One", serif;\
  font-size: .92rem; color: rgba(255,218,100,.78);\
  display: block; margin-bottom: .3rem;\
  letter-spacing: .04em;\
}\
/* Desktop grid */\
@media (min-width: 640px) {\
  .pf-cols { grid-template-columns: repeat(3, 1fr); }\
}\
@media (min-width: 900px) {\
  .pf-inner {\
    grid-template-columns: 1.6fr 2fr;\
    padding: 4rem 3rem 2.5rem;\
    gap: 3rem;\
  }\
  .pf-brand { text-align: left; }\
  .pf-cols { grid-template-columns: repeat(3, 1fr); }\
}\
@media (min-width: 1024px) {\
  .pf-inner { padding: 4.5rem 4rem 3rem; }\
}\
';

  /* ── Build footer HTML ────────────────────────────────────────── */
  function buildFooter() {
    var cfg  = window.PSOTS || {};
    var yr   = cfg.activeYear || new Date().getFullYear();
    var soc  = cfg.society    || 'Prestige Song of the South, Bengaluru';
    var comm = cfg.committee  || [];

    // Committee contacts (first 2 with phones)
    var contacts = comm.filter(function(m){ return m.phone; }).slice(0, 2);
    var contactsHtml = contacts.map(function(m) {
      return '<div class="pf-contact-item">'
        + '<span class="pf-contact-icon">📞</span>'
        + '<div>'
        +   '<div class="pf-contact-name">' + m.name + '</div>'
        +   '<span class="pf-contact-role">' + m.role + '</span>'
        +   '<div class="pf-contact-phone">' + m.phone + '</div>'
        + '</div></div>';
    }).join('');

    // WhatsApp channel link
    var waChannel = cfg.waChannel || '';
    var waHtml = waChannel
      ? '<li><a href="' + waChannel + '" target="_blank" rel="noopener">📲 WhatsApp Channel</a></li>'
      : '';

    return '<footer class="psots-footer" id="psots-footer">'
    + '<div class="pf-inner">'

    /* Brand */
    +   '<div class="pf-brand">'
    +     '<span class="pf-brand-icon">🪔</span>'
    +     '<div class="pf-brand-name">PSOTS — छठ महापर्व</div>'
    +     '<div class="pf-brand-sub">' + soc + '</div>'
    +     '<div class="pf-tagline">जय छठी मैया 🙏</div>'
    +   '</div>'

    /* Nav columns */
    +   '<div class="pf-cols">'

    +     '<div class="pf-col">'
    +       '<div class="pf-col-title">Celebration</div>'
    +       '<ul>'
    +         '<li><a href="' + root + 'pages/schedule.html">📅 Schedule</a></li>'
    +         '<li><a href="' + root + 'pages/gallery.html">📸 Gallery</a></li>'
    +         '<li><a href="' + root + 'pages/volunteer.html">🙌 Volunteer</a></li>'
    +         '<li><a href="' + root + 'pages/announcements.html">📢 Announcements</a></li>'
    +       '</ul>'
    +     '</div>'

    +     '<div class="pf-col">'
    +       '<div class="pf-col-title">Community</div>'
    +       '<ul>'
    +         '<li><a href="' + root + 'pages/payment.html">💸 Contribute</a></li>'
    +         '<li><a href="' + root + 'pages/finance.html">📊 Finance</a></li>'
    +         '<li><a href="' + root + 'pages/contributors.html">🏆 Leaderboard</a></li>'
    +         '<li><a href="' + root + 'pages/subscribe.html">🔔 Subscribe</a></li>'
    +         waHtml
    +       '</ul>'
    +     '</div>'

    +     '<div class="pf-col">'
    +       '<div class="pf-col-title">Committee</div>'
    +       (contactsHtml || '<p style="font-size:.8rem;color:rgba(255,200,100,.5)">For queries, reach out via WhatsApp.</p>')
    +     '</div>'

    +   '</div>'
    + '</div>'

    + '<div class="pf-bottom">'
    +   '<div class="pf-jai">जय छठी मैया · जय सूर्य देव</div>'
    +   '© ' + yr + ' PSOTS Chhath Puja Committee · ' + soc + '<br>'
    +   '<a href="' + root + 'pages/privacy-policy.html">Privacy</a> · '
    +   '<a href="' + root + 'pages/refund-policy.html">Refund Policy</a> · '
    +   '<a href="' + root + 'pages/terms.html">Terms</a> · '
    +   '<a href="' + root + 'pages/faq.html">FAQ</a>'
    + '</div>'
    + '</footer>';
  }

  /* ── Inject styles ────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('psots-footer-css')) return;
    var style = document.createElement('style');
    style.id  = 'psots-footer-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ── Append footer ────────────────────────────────────────────── */
  function injectFooter() {
    if (document.getElementById('psots-footer')) return;
    injectStyles();
    document.body.insertAdjacentHTML('beforeend', buildFooter());
  }

  /* ── Bootstrap ────────────────────────────────────────────────── */
  function init() {
    // Wait a tick so config.js / PSOTS can set up first
    setTimeout(function() {
      injectFooter();
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
