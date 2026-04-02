/* ══════════════════════════════════════════════════════════
   PSOTS Auth Gate — Step 2: Firebase Auth
   ──────────────────────────────────────────────────────────
   Sign-in methods (in priority order):
     1. Firebase Google Sign-In (signInWithPopup)
     2. Firebase Email Link (passwordless, no OTP to type)
     3. Apps Script Email OTP (fallback if Firebase unavailable)

   Session management:
     • Firebase Auth handles token refresh automatically
     • Sessions stored in localStorage for backward compat
     • SESSION_TTL: 30 days (matches Firebase default)
     • Multi-tab sync via BroadcastChannel (sign-out all tabs)
     • Profile cache TTL: 1 hour (in db.js)
     • Forced refresh: on browser focus after >30 min idle

   Public pages (no gate needed): index.html, schedule.html, policy pages
   Gated pages: payment, portal, finance, contributors, gallery, volunteer,
                announcements, subscribe
══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Constants ──────────────────────────────────────── */
  const SESSION_TTL_MS   = 30 * 24 * 60 * 60 * 1000; // 30 days
  const IDLE_REFRESH_MS  = 30 * 60 * 1000;            // check token after 30 min idle
  const OTP_COOLDOWN_MS  = 30 * 1000;                 // 30s resend cooldown
  const OTP_MAX_ATTEMPTS = 5;

  /* ── Session helpers ─────────────────────────────────── */
  function _getUser() {
    try {
      const u = JSON.parse(localStorage.getItem('psots_user') || 'null');
      if (u && u.id && u.loginTime) {
        // Enforce TTL — expired sessions must re-authenticate
        if (Date.now() - u.loginTime < SESSION_TTL_MS) return u;
        _clearSession(); // expired
      }
      // Also accept admin session
      const a = JSON.parse(localStorage.getItem('psots_admin_user') || 'null');
      if (a && (a.id || a.email)) return a;
      return null;
    } catch (e) { return null; }
  }

  function _clearSession() {
    localStorage.removeItem('psots_user');
    // Broadcast sign-out to other tabs
    try { new BroadcastChannel('psots_auth').postMessage({ type: 'signed_out' }); } catch (e) {}
  }

  function _storeSession(u) {
    localStorage.setItem('psots_user', JSON.stringify({ ...u, loginTime: Date.now() }));
    try { new BroadcastChannel('psots_auth').postMessage({ type: 'signed_in', uid: u.id }); } catch (e) {}
  }

  /* ── Multi-tab sync: sign out all tabs when one signs out ── */
  try {
    const bc = new BroadcastChannel('psots_auth');
    bc.onmessage = function (e) {
      if (e.data && e.data.type === 'signed_out') {
        // Another tab signed out — clear this tab's session and reload
        localStorage.removeItem('psots_user');
        if (!window.__psots_gate_active) location.reload();
      }
    };
  } catch (e) { /* BroadcastChannel not supported (Safari < 15.4) — graceful degradation */ }

  /* ── 1. Check existing valid session ─────────────────── */
  const user = _getUser();
  if (user && (user.id || user.email)) {
    // Silently refresh Firebase token in background (if Firebase Auth is ready)
    _bgTokenRefresh();
    return; // ✅ already signed in — let the page load
  }

  /* ── 2. Anonymous mode bypass ───────────────────────── */
  if (new URLSearchParams(window.location.search).get('mode') === 'anon') return;

  /* ── 3. Firebase Auth might have a session even if localStorage was cleared ── */
  //  Check after DOM is ready (Firebase SDK loaded by the page after this script).
  //  If Firebase confirms a live session, restore localStorage and reload.
  window.__psots_gate_active = true;
  _checkFirebaseRestoredSession();

  /* ── 4. Immediately hide page body while gate resolves ── */
  const hideStyle = document.createElement('style');
  hideStyle.id = 'psots-gate-hide';
  hideStyle.textContent = 'body>*:not(#psots-auth-gate){display:none!important}';
  document.head.appendChild(hideStyle);

  /* ── 5. Inject gate overlay once DOM is ready ──────────── */
  function injectGate() {
    if (document.getElementById('psots-auth-gate')) return;

    const evtYear = (window.PSOTS && window.PSOTS.eventStart)
      ? new Date(window.PSOTS.eventStart).getFullYear()
      : new Date().getFullYear();
    const inPages  = window.location.pathname.includes('/pages/');
    const homeUrl  = inPages ? '../index.html' : 'index.html';
    const schedUrl = inPages ? 'schedule.html' : 'pages/schedule.html';

    const gate = document.createElement('div');
    gate.id = 'psots-auth-gate';
    gate.style.cssText = [
      'position:fixed','inset:0','z-index:99999',
      'display:flex','align-items:center','justify-content:center',
      'padding:1rem',
      'background:linear-gradient(160deg,#fff8f0 0%,#ffe8d0 100%)',
      'font-family:"DM Sans",system-ui,sans-serif',
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
          '<div id="gate-google-btn" style="display:flex;justify-content:center;min-height:44px;margin-bottom:1rem"></div>',
          '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem">',
            '<div style="flex:1;height:1px;background:#f0d5b8"></div>',
            '<span style="font-size:.68rem;color:#c8a880;white-space:nowrap">or sign in with email</span>',
            '<div style="flex:1;height:1px;background:#f0d5b8"></div>',
          '</div>',
        '</div>',

        // Email step
        '<div id="gate-email-step">',
          '<input type="email" id="gate-email" placeholder="your@email.com" autocomplete="email"',
            ' onkeydown="if(event.key===\'Enter\')window._psGate.sendEmail()"',
            ' style="width:100%;box-sizing:border-box;padding:.68rem 1rem;border:1.5px solid #f0d5b8;',
            'border-radius:10px;font-family:\'DM Sans\',sans-serif;font-size:.88rem;outline:none;',
            'margin-bottom:.7rem;color:#1a0800;background:#fff8f0"/>',
          '<button onclick="window._psGate.sendEmail()" id="gate-send-btn"',
            ' style="width:100%;padding:.7rem;background:linear-gradient(135deg,#e85c00,#c93800);',
            'color:#fff;border:none;border-radius:10px;font-family:\'DM Sans\',sans-serif;',
            'font-size:.88rem;font-weight:600;cursor:pointer">',
            'Send Sign-in Link →</button>',
        '</div>',

        // Email Link sent confirmation (Firebase Email Link flow)
        '<div id="gate-link-sent" style="display:none">',
          '<div style="background:#f0fff4;border:1.5px solid #a5d6a7;border-radius:12px;',
            'padding:1.1rem;margin-bottom:1rem">',
            '<div style="font-size:1.5rem;margin-bottom:.4rem">📧</div>',
            '<div style="font-size:.9rem;font-weight:700;color:#1b5e20;margin-bottom:.4rem">Check your email!</div>',
            '<div style="font-size:.78rem;color:#4a7c59;line-height:1.6">We sent a sign-in link to<br/>',
              '<strong id="gate-sent-email" style="color:#1b5e20"></strong><br/>',
              'Click the link to sign in — it\'s valid for <strong>10 minutes</strong>.</div>',
          '</div>',
          '<button onclick="window._psGate.backToEmail()"',
            ' style="width:100%;padding:.55rem;background:none;border:1.5px solid #f0d5b8;',
            'border-radius:10px;font-family:\'DM Sans\',sans-serif;font-size:.78rem;',
            'color:#b08060;cursor:pointer">← Try different email</button>',
        '</div>',

        // OTP step (fallback when Firebase unavailable)
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

        // Session info line
        '<div style="margin-top:1rem;font-size:.68rem;color:#d4b898;line-height:1.5">',
          '🔐 Session lasts 30 days &nbsp;·&nbsp; Secured by Firebase Auth',
        '</div>',

        // Public links
        '<div style="margin-top:.75rem;font-size:.72rem;color:#c8a880">',
          '<a href="', homeUrl, '" style="color:#c8a880;text-decoration:none">← Home</a>',
          '&nbsp;·&nbsp;',
          '<a href="', schedUrl, '" style="color:#c8a880;text-decoration:none">View Schedule</a>',
        '</div>',

      '</div>',
    ].join('');

    document.body.prepend(gate);

    // Initialise Google Sign-In (Firebase or GSI fallback)
    _initGoogleSignIn();
  }

  /* ── Google Sign-In initialisation ──────────────────────────────── */
  function _initGoogleSignIn() {
    const cfg       = window.PSOTS || {};
    const clientId  = cfg.googleClientId || '';
    const hasClientId = clientId && !clientId.includes('YOUR_');

    // ── Primary: Firebase Auth Google popup ─────────────────────────
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const btn = document.getElementById('gate-google-btn');
      if (btn && hasClientId) {
        // Render a styled Google button that triggers Firebase popup
        btn.innerHTML =
          '<button onclick="window._psGate.googlePopup()" style="' +
            'display:flex;align-items:center;gap:.6rem;padding:.65rem 1.4rem;' +
            'background:#fff;border:1.5px solid #dadce0;border-radius:50px;' +
            'font-family:\'DM Sans\',sans-serif;font-size:.88rem;font-weight:600;' +
            'color:#3c4043;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.08);' +
            'transition:box-shadow .15s;width:100%;justify-content:center"' +
            ' onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,.15)\'"' +
            ' onmouseout="this.style.boxShadow=\'0 1px 4px rgba(0,0,0,.08)\'">' +
            '<svg width="18" height="18" viewBox="0 0 48 48">' +
              '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
              '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
              '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
              '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
              '<path fill="none" d="M0 0h48v48H0z"/>' +
            '</svg>' +
            'Continue with Google</button>';
      }
      return; // Firebase handles it — don't load GSI
    }

    // ── Fallback: Google Identity Services (GSI) ─────────────────────
    if (!hasClientId) {
      const gw = document.getElementById('gate-google-wrap');
      if (gw) gw.style.display = 'none';
      return;
    }
    const gsiScript = document.createElement('script');
    gsiScript.src   = 'https://accounts.google.com/gsi/client';
    gsiScript.async = true;
    gsiScript.onload = function () {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback:  window._psGate.onGoogleGSI,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('gate-google-btn'),
        { theme: 'outline', size: 'large', width: 300, shape: 'pill', logo_alignment: 'center' }
      );
    };
    document.head.appendChild(gsiScript);
  }

  /* ── Firebase session restore check (after scripts load) ───────── */
  function _checkFirebaseRestoredSession() {
    // Wait for DOM + all scripts to load
    window.addEventListener('load', function () {
      if (typeof firebase === 'undefined' || !firebase.auth) return;
      firebase.auth().onAuthStateChanged(function (fbUser) {
        if (fbUser && !_getUser()) {
          // Firebase has a live session but localStorage was cleared — restore it
          _storeSession({
            id:      fbUser.uid,
            name:    fbUser.displayName || (fbUser.email || '').split('@')[0],
            email:   fbUser.email || '',
            picture: fbUser.photoURL || null,
            provider: fbUser.providerData[0] ? fbUser.providerData[0].providerId : 'firebase',
          });
          // Remove gate and reload
          const gate = document.getElementById('psots-auth-gate');
          const hs   = document.getElementById('psots-gate-hide');
          if (gate) gate.remove();
          if (hs)   hs.remove();
          window.__psots_gate_active = false;
          location.reload();
        }
      });
    });
  }

  /* ── Background token refresh on tab focus ──────────────────────── */
  function _bgTokenRefresh() {
    document.addEventListener('visibilitychange', function onVisible() {
      if (document.visibilityState !== 'visible') return;
      if (typeof firebase === 'undefined' || !firebase.auth) return;
      const fbUser = firebase.auth().currentUser;
      if (!fbUser) return;
      // Only refresh if been hidden > IDLE_REFRESH_MS
      const stored = _getUser();
      if (stored && Date.now() - stored.loginTime > IDLE_REFRESH_MS) {
        fbUser.getIdToken(/* forceRefresh= */ true)
          .then(function () {
            // Token refreshed — update loginTime in localStorage to reset TTL
            _storeSession({
              id:      fbUser.uid,
              name:    fbUser.displayName || stored.name,
              email:   fbUser.email || stored.email,
              picture: fbUser.photoURL || stored.picture,
              provider: stored.provider,
            });
          })
          .catch(function () {
            // Token refresh failed (revoked?) — force re-login
            _clearSession();
            if (typeof firebase !== 'undefined') firebase.auth().signOut().catch(() => {});
            location.reload();
          });
      }
    });
  }

  /* ── Client-side OTP guards (fallback path) ─────────────────────── */
  let _otpAttempts    = 0;
  let _otpSentAt      = 0;

  /* ══════════════════════════════════════════════════════
     PUBLIC GATE ACTIONS
  ══════════════════════════════════════════════════════ */
  window._psGate = {

    /* ── Firebase Google popup ──────────────────────── */
    googlePopup: function () {
      if (typeof firebase === 'undefined' || !firebase.auth) {
        window._psGate._err('Firebase not loaded. Please refresh.'); return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      firebase.auth().signInWithPopup(provider)
        .then(function (result) {
          _storeSession({
            id:      result.user.uid,
            name:    result.user.displayName || result.user.email.split('@')[0],
            email:   result.user.email,
            picture: result.user.photoURL || null,
            provider: 'google.com',
          });
          window._psGate._unlock(result.user.displayName || result.user.email.split('@')[0]);
        })
        .catch(function (e) {
          if (e.code !== 'auth/popup-closed-by-user') {
            window._psGate._err('Google sign-in failed: ' + (e.message || e.code));
          }
        });
    },

    /* ── GSI fallback (no Firebase Auth) ────────────── */
    onGoogleGSI: function (response) {
      try {
        const parts = (response.credential || '').split('.');
        if (parts.length !== 3) throw new Error('bad JWT');
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(
          parts[1].length + (4 - parts[1].length % 4) % 4, '='
        );
        const payload = JSON.parse(decodeURIComponent(
          atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        ));
        if (!payload.sub || !payload.email) throw new Error('incomplete payload');
        _storeSession({
          id: payload.sub, name: payload.name || payload.email.split('@')[0],
          email: payload.email, picture: payload.picture || null, provider: 'google',
        });
        window._psGate._unlock(payload.name || payload.email.split('@')[0]);
      } catch (e) { window._psGate._err('Google sign-in failed. Please try email.'); }
    },

    /* ── Send email sign-in (Firebase Email Link or OTP fallback) ── */
    sendEmail: function () {
      const email = ((document.getElementById('gate-email') || {}).value || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        window._psGate._err('Enter a valid email address'); return;
      }

      // Client-side resend cooldown
      const elapsed = Date.now() - _otpSentAt;
      if (_otpSentAt > 0 && elapsed < OTP_COOLDOWN_MS) {
        window._psGate._err('Please wait ' + Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000) + 's before retrying.'); return;
      }

      const btn = document.getElementById('gate-send-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      window._psGate._clearErr();

      /* ── Firebase Email Link (primary) ─── */
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const actionCodeSettings = {
          url:            window.location.href,
          handleCodeInApp: true,
        };
        firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
          .then(function () {
            _otpSentAt = Date.now();
            localStorage.setItem('psots_email_for_signin', email);
            document.getElementById('gate-email-step').style.display   = 'none';
            const sentEl = document.getElementById('gate-sent-email');
            if (sentEl) sentEl.textContent = email;
            document.getElementById('gate-link-sent').style.display    = 'block';
            const gw = document.getElementById('gate-google-wrap');
            if (gw) gw.style.display = 'none';
          })
          .catch(function (e) {
            if (btn) { btn.disabled = false; btn.textContent = 'Send Sign-in Link →'; }
            window._psGate._err(e.message || 'Could not send email. Try Google sign-in.');
          });
        return;
      }

      /* ── Apps Script OTP (fallback when Firebase unavailable) ─── */
      const su = (window.PSOTS && window.PSOTS.scriptUrl) || '';
      if (!su || su.includes('YOUR_APPS')) {
        if (btn) { btn.disabled = false; btn.textContent = 'Send Sign-in Link →'; }
        window._psGate._err('Auth service not configured — contact admin'); return;
      }
      fetch(su + '?action=sendOtp&email=' + encodeURIComponent(email))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) {
            if (btn) { btn.disabled = false; btn.textContent = 'Send Sign-in Link →'; }
            window._psGate._err(d.msg || d.error || 'Could not send code'); return;
          }
          _otpSentAt   = Date.now();
          _otpAttempts = 0;
          document.getElementById('gate-email-step').style.display = 'none';
          document.getElementById('gate-otp-step').style.display   = 'block';
          const gw = document.getElementById('gate-google-wrap');
          if (gw) gw.style.display = 'none';
          setTimeout(function () { const o = document.getElementById('gate-otp'); if (o) o.focus(); }, 100);
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Send Sign-in Link →'; }
          window._psGate._err('Network error — try again');
        });
    },

    /* ── Verify OTP (Apps Script fallback path only) ── */
    verifyOtp: function () {
      if (_otpAttempts >= OTP_MAX_ATTEMPTS) {
        window._psGate._err('Too many incorrect attempts. Please request a new code.'); return;
      }
      const email = ((document.getElementById('gate-email') || {}).value || '').trim().toLowerCase();
      const otp   = ((document.getElementById('gate-otp')   || {}).value || '').trim();
      if (!otp || !/^\d{6}$/.test(otp)) { window._psGate._err('Enter the 6-digit code'); return; }
      const su  = (window.PSOTS && window.PSOTS.scriptUrl) || '';
      const btn = document.getElementById('gate-verify-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Verifying…'; }
      window._psGate._clearErr();
      fetch(su + '?action=verifyOtp&email=' + encodeURIComponent(email) + '&otp=' + encodeURIComponent(otp))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) {
            _otpAttempts++;
            const left = OTP_MAX_ATTEMPTS - _otpAttempts;
            if (btn) { btn.disabled = false; btn.textContent = 'Verify & Enter →'; }
            window._psGate._err((d.msg || 'Incorrect code.') + (left > 0 ? ' (' + left + ' left)' : ' Request a new code.'));
            return;
          }
          _storeSession({
            id:      d.userId,
            name:    (d.profile && d.profile.name) || email.split('@')[0],
            email:   email, picture: null, provider: 'email_otp',
          });
          if (d.profile) localStorage.setItem('psots_profile_' + d.userId, JSON.stringify(d.profile));
          window._psGate._unlock((d.profile && d.profile.name) || email.split('@')[0]);
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Verify & Enter →'; }
          window._psGate._err('Verification failed — try again');
        });
    },

    /* ── Back to email form ───────────────────────────── */
    backToEmail: function () {
      ['gate-otp-step','gate-link-sent'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      document.getElementById('gate-email-step').style.display = 'block';
      const gw  = document.getElementById('gate-google-wrap');
      const btn = document.getElementById('gate-send-btn');
      if (gw)  gw.style.display  = 'block';
      if (btn) { btn.disabled = false; btn.textContent = 'Send Sign-in Link →'; }
      window._psGate._clearErr();
    },

    /* ── Unlock (success — remove gate and reload) ────── */
    _unlock: function (name) {
      const suc = document.getElementById('gate-success');
      if (suc) { suc.style.display = 'block'; suc.textContent = '🙏 Welcome, ' + (name || 'Resident') + '! Loading…'; }
      ['gate-email-step','gate-otp-step','gate-link-sent','gate-google-wrap','gate-error']
        .forEach(function (id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      const hs = document.getElementById('psots-gate-hide');
      if (hs) hs.remove();
      window.__psots_gate_active = false;
      setTimeout(function () { location.reload(); }, 600);
    },

    /* ── Error helpers ────────────────────────────────── */
    _err:      function (msg) { const el = document.getElementById('gate-error'); if (el) { el.textContent = msg; el.style.display = 'block'; } },
    _clearErr: function ()    { const el = document.getElementById('gate-error'); if (el) el.style.display = 'none'; },
  };

  // Inject on DOMContentLoaded (or immediately if already ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGate);
  } else {
    injectGate();
  }

  /* ── Session helpers (module-scoped) ─────────────────────────────── */
  function _storeSession(u) {
    localStorage.setItem('psots_user', JSON.stringify({ ...u, loginTime: Date.now() }));
    try { new BroadcastChannel('psots_auth').postMessage({ type: 'signed_in', uid: u.id }); } catch (e) {}
  }

})();
