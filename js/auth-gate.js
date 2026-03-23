/* ══════════════════════════════════════════════════════════
   PSOTS Auth Gate
   Include in <head> after config.js on any page that
   requires a resident sign-in to view.

   Public pages (no gate needed): index.html, schedule.html
══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── 1. Check session ─────────────────────────────────
  function getUser() {
    try {
      // Accept resident session OR admin session (admin signs in via admin.html Google button)
      var u = JSON.parse(localStorage.getItem('psots_user') || 'null');
      if (u && u.id) return u;
      var a = JSON.parse(localStorage.getItem('psots_admin_user') || 'null');
      if (a && (a.id || a.email)) return a;
      return null;
    } catch (e) { return null; }
  }
  var user = getUser();
  if (user && (user.id || user.email)) return; // ✅ already signed in

  // ── 2. Immediately hide page body until gate resolves ─
  var hideStyle = document.createElement('style');
  hideStyle.id = 'psots-gate-hide';
  hideStyle.textContent = 'body>*:not(#psots-auth-gate){display:none!important}';
  document.head.appendChild(hideStyle);

  // ── 3. Inject gate overlay once DOM is ready ──────────
  function injectGate() {
    if (document.getElementById('psots-auth-gate')) return;

    // Compute event year dynamically from config (or current year)
    var evtYear = (window.PSOTS && window.PSOTS.eventStart)
      ? new Date(window.PSOTS.eventStart).getFullYear()
      : new Date().getFullYear();

    // Build relative back-links that work from /pages/ directory
    var here    = window.location.pathname;
    var inPages = here.indexOf('/pages/') !== -1;
    var homeUrl = inPages ? '../index.html' : 'index.html';
    var schedUrl= inPages ? 'schedule.html' : 'pages/schedule.html';

    var gate = document.createElement('div');
    gate.id = 'psots-auth-gate';
    gate.style.cssText = [
      'position:fixed','inset:0','z-index:99999',
      'display:flex','align-items:center','justify-content:center',
      'padding:1rem',
      'background:linear-gradient(160deg,#fff8f0 0%,#ffe8d0 100%)',
      'font-family:"DM Sans",system-ui,sans-serif'
    ].join(';');

    gate.innerHTML = [
      '<div style="background:#fff;border-radius:22px;box-shadow:0 24px 64px rgba(26,8,0,.18);',
        'padding:2.4rem 2rem 2rem;max-width:360px;width:100%;text-align:center">',

        // Branding
        '<div style="font-size:3rem;margin-bottom:.35rem">🌅</div>',
        '<div style="font-family:\'Yatra One\',serif;font-size:1.35rem;color:#e85c00;margin-bottom:.15rem">',
          'PSOTS Chhath Puja</div>',
        '<div style="font-size:.75rem;color:#c8a880;margin-bottom:1.4rem;letter-spacing:.05em">',
          'PSOTS Residents &nbsp;·&nbsp; ' + evtYear + '</div>',

        // Lock notice
        '<div style="background:linear-gradient(135deg,#fff8f0,#fff0e0);border:1.5px solid #f0d5b8;',
          'border-radius:12px;padding:.75rem 1rem;margin-bottom:1.4rem">',
          '<div style="font-size:.78rem;color:#7a4a1a;line-height:1.7">',
            '🔒 This page is for <strong>PSOTS residents</strong> only.',
            '<br/>Please sign in with your account to continue.</div>',
        '</div>',

        // Google Sign-In button container
        '<div id="gate-google-wrap">',
          '<div id="gate-google-btn" style="display:flex;justify-content:center;min-height:44px;',
            'margin-bottom:1rem"></div>',
          '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem">',
            '<div style="flex:1;height:1px;background:#f0d5b8"></div>',
            '<span style="font-size:.68rem;color:#c8a880;white-space:nowrap">or sign in with email</span>',
            '<div style="flex:1;height:1px;background:#f0d5b8"></div>',
          '</div>',
        '</div>',

        // Email step
        '<div id="gate-email-step">',
          '<input type="email" id="gate-email" placeholder="your@email.com" autocomplete="email"',
            ' onkeydown="if(event.key===\'Enter\')window._psGate.sendOtp()"',
            ' style="width:100%;box-sizing:border-box;padding:.68rem 1rem;border:1.5px solid #f0d5b8;',
            'border-radius:10px;font-family:\'DM Sans\',sans-serif;font-size:.88rem;outline:none;',
            'margin-bottom:.7rem;color:#1a0800;background:#fff8f0"/>',
          '<button onclick="window._psGate.sendOtp()" id="gate-send-btn"',
            ' style="width:100%;padding:.7rem;background:linear-gradient(135deg,#e85c00,#c93800);',
            'color:#fff;border:none;border-radius:10px;font-family:\'DM Sans\',sans-serif;',
            'font-size:.88rem;font-weight:600;cursor:pointer">',
            'Send Sign-in Code →</button>',
        '</div>',

        // OTP step
        '<div id="gate-otp-step" style="display:none">',
          '<div style="font-size:.8rem;color:#7a4a1a;margin-bottom:.7rem;line-height:1.6">',
            '📧 Check your email for a 6-digit code</div>',
          '<input type="text" id="gate-otp" placeholder="123456" maxlength="6" inputmode="numeric"',
            ' onkeydown="if(event.key===\'Enter\')window._psGate.verifyOtp()"',
            ' style="width:100%;box-sizing:border-box;padding:.68rem 1rem;border:1.5px solid #f0d5b8;',
            'border-radius:10px;font-family:\'DM Sans\',sans-serif;font-size:1.2rem;font-weight:700;',
            'letter-spacing:.35em;text-align:center;outline:none;margin-bottom:.7rem;',
            'color:#1a0800;background:#fff8f0"/>',
          '<button onclick="window._psGate.verifyOtp()" id="gate-verify-btn"',
            ' style="width:100%;padding:.7rem;background:linear-gradient(135deg,#e85c00,#c93800);',
            'color:#fff;border:none;border-radius:10px;font-family:\'DM Sans\',sans-serif;',
            'font-size:.88rem;font-weight:600;cursor:pointer;margin-bottom:.5rem">',
            'Verify & Enter →</button>',
          '<button onclick="window._psGate.backToEmail()"',
            ' style="width:100%;padding:.5rem;background:none;border:1.5px solid #f0d5b8;',
            'border-radius:10px;font-family:\'DM Sans\',sans-serif;font-size:.78rem;',
            'color:#b08060;cursor:pointer">← Change email</button>',
        '</div>',

        // Success state
        '<div id="gate-success" style="display:none;padding:.8rem;background:#f0fff4;',
          'border:1.5px solid #a5d6a7;border-radius:10px;color:#2e7d32;font-weight:600;',
          'font-size:.88rem"></div>',

        // Error
        '<div id="gate-error" style="display:none;margin-top:.6rem;padding:.55rem .8rem;',
          'background:#fdecea;border-radius:8px;font-size:.76rem;color:#c0392b"></div>',

        // Public links
        '<div style="margin-top:1.5rem;font-size:.72rem;color:#c8a880">',
          '<a href="', homeUrl, '" style="color:#c8a880;text-decoration:none">← Home</a>',
          '&nbsp;·&nbsp;',
          '<a href="', schedUrl, '" style="color:#c8a880;text-decoration:none">View Schedule</a>',
        '</div>',

      '</div>'
    ].join('');

    document.body.prepend(gate);

    // Load Google GSI
    var cfg = window.PSOTS || {};
    var clientId = cfg.googleClientId || '';
    if (clientId && clientId.indexOf('YOUR_') === -1) {
      var gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.async = true;
      gsiScript.onload = function () {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: window._psGate.onGoogle
        });
        window.google.accounts.id.renderButton(
          document.getElementById('gate-google-btn'),
          { theme: 'outline', size: 'large', width: 300, shape: 'pill', logo_alignment: 'center' }
        );
      };
      document.head.appendChild(gsiScript);
    } else {
      var googleWrap = document.getElementById('gate-google-wrap');
      if (googleWrap) googleWrap.style.display = 'none';
    }
  }

  // ── 4. Gate actions (exposed globally for onclick handlers) ──
  window._psGate = {
    onGoogle: function (response) {
      try {
        var payload = JSON.parse(atob(response.credential.split('.')[1]));
        var u = { id: payload.sub, name: payload.name, email: payload.email,
                  picture: payload.picture || null, loginTime: Date.now(), provider: 'google' };
        localStorage.setItem('psots_user', JSON.stringify(u));
        window._psGate._unlock(u.name);
      } catch (e) { window._psGate._err('Google sign-in failed. Please try email.'); }
    },

    sendOtp: function () {
      var email = (document.getElementById('gate-email').value || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        window._psGate._err('Enter a valid email address'); return;
      }
      var su = (window.PSOTS && window.PSOTS.scriptUrl) || '';
      if (!su || su.indexOf('YOUR_APPS') !== -1) {
        window._psGate._err('Auth service not configured — contact admin'); return;
      }
      var btn = document.getElementById('gate-send-btn');
      btn.disabled = true; btn.textContent = 'Sending…';
      window._psGate._clearErr();
      fetch(su + '?action=sendOtp&email=' + encodeURIComponent(email))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) { window._psGate._err(d.msg || d.error || 'Could not send code'); btn.disabled = false; btn.textContent = 'Send Sign-in Code →'; return; }
          document.getElementById('gate-email-step').style.display = 'none';
          document.getElementById('gate-otp-step').style.display = 'block';
          var gw = document.getElementById('gate-google-wrap');
          if (gw) gw.style.display = 'none';
          setTimeout(function () { var otpEl = document.getElementById('gate-otp'); if (otpEl) otpEl.focus(); }, 100);
        })
        .catch(function () { window._psGate._err('Network error — try again'); btn.disabled = false; btn.textContent = 'Send Sign-in Code →'; });
    },

    verifyOtp: function () {
      var email = (document.getElementById('gate-email').value || '').trim();
      var otp   = (document.getElementById('gate-otp').value || '').trim();
      if (!otp || !/^\d{6}$/.test(otp)) { window._psGate._err('Enter the 6-digit code'); return; }
      var su = (window.PSOTS && window.PSOTS.scriptUrl) || '';
      var btn = document.getElementById('gate-verify-btn');
      btn.disabled = true; btn.textContent = 'Verifying…';
      window._psGate._clearErr();
      fetch(su + '?action=verifyOtp&email=' + encodeURIComponent(email) + '&otp=' + encodeURIComponent(otp))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) { window._psGate._err(d.msg || d.error || 'Incorrect code. Try again.'); btn.disabled = false; btn.textContent = 'Verify & Enter →'; return; }
          var u = {
            id: d.userId,
            name: (d.profile && d.profile.name) || email.split('@')[0],
            email: email, picture: null, provider: 'email', loginTime: Date.now()
          };
          localStorage.setItem('psots_user', JSON.stringify(u));
          if (d.profile) localStorage.setItem('psots_profile_' + d.userId, JSON.stringify(d.profile));
          window._psGate._unlock(u.name);
        })
        .catch(function () { window._psGate._err('Verification failed — try again'); btn.disabled = false; btn.textContent = 'Verify & Enter →'; });
    },

    backToEmail: function () {
      document.getElementById('gate-otp-step').style.display = 'none';
      document.getElementById('gate-email-step').style.display = 'block';
      var gw = document.getElementById('gate-google-wrap');
      if (gw) gw.style.display = 'block';
      var sendBtn = document.getElementById('gate-send-btn');
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send Sign-in Code →'; }
      window._psGate._clearErr();
    },

    _unlock: function (name) {
      var suc = document.getElementById('gate-success');
      if (suc) { suc.style.display = 'block'; suc.textContent = '🙏 Welcome, ' + (name || 'Resident') + '! Loading…'; }
      // Hide email/otp steps
      ['gate-email-step','gate-otp-step','gate-google-wrap','gate-error']
        .forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
      // Remove body hide and reload so page scripts reinitialise with user context
      var hs = document.getElementById('psots-gate-hide');
      if (hs) hs.remove();
      setTimeout(function () { location.reload(); }, 600);
    },

    _err: function (msg) {
      var el = document.getElementById('gate-error');
      if (el) { el.textContent = msg; el.style.display = 'block'; }
    },
    _clearErr: function () {
      var el = document.getElementById('gate-error');
      if (el) el.style.display = 'none';
    }
  };

  // Inject on DOMContentLoaded (or immediately if already ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGate);
  } else {
    injectGate();
  }

})();
