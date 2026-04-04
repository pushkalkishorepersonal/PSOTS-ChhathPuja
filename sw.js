/**
 * ════════════════════════════════════════════════════
 *  PSOTS Chhath Puja — Service Worker
 *
 *  Strategy:
 *  • HTML pages     → Network-first  (always show latest content)
 *  • JS / CSS       → Cache-first    (versioned, fast repeat loads)
 *  • Images         → Cache-first    (rarely change)
 *  • Firebase CDN   → Passthrough    (cross-origin, skip caching)
 *  • Google Fonts   → Cache-first    (rarely change)
 *
 *  To bust the cache after a deploy, increment CACHE_VERSION.
 * ════════════════════════════════════════════════════
 */

const CACHE_VERSION = 'psots-v3';

// Core assets to pre-cache on install
const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/css/style.css',
  '/js/config.js',
  '/js/auth-gate.js',
  '/js/db.js',
  '/js/firebase-config.js',
  '/js/receipt.js',
  '/js/notifications.js',
  '/js/nav-component.js',
  '/js/footer-component.js',
  '/images/favicon.svg',
  '/images/logo-main.png',
  '/images/chhath-logo-sugarcane-v2.png',
  '/images/chhath-logo-sugarcane-v1.png',
  '/pages/payment.html',
  '/pages/contributors.html',
  '/pages/announcements.html',
  '/pages/schedule.html',
  '/pages/gallery.html',
  '/pages/finance.html',
  '/pages/volunteer.html',
  '/pages/subscribe.html',
  '/pages/faq.html',
  '/pages/committee.html',
];

// ── Install: pre-cache core assets ─────────────────────────────────────────
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) {
        // addAll fails silently per-item; use individual puts so one 404 doesn't abort
        return Promise.allSettled(
          PRECACHE.map(url =>
            cache.add(url).catch(function () {
              console.warn('[SW] Failed to precache:', url);
            })
          )
        );
      })
      .then(function () { return self.skipWaiting(); })
  );
});

// ── Activate: delete stale caches ──────────────────────────────────────────
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) { return k !== CACHE_VERSION; })
            .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// ── Fetch: routing strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', function (e) {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Skip cross-origin requests (Firebase SDK CDN, Google Fonts API calls, etc.)
  // Exception: allow caching Google Fonts stylesheet and font files
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont  = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isSameOrigin && !isGoogleFont) return;

  // HTML → network-first so residents always see the latest page
  const acceptsHtml = req.headers.get('accept') && req.headers.get('accept').includes('text/html');
  if (acceptsHtml) {
    e.respondWith(
      fetch(req)
        .then(function (networkRes) {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_VERSION).then(function (c) { c.put(req, clone); });
          }
          return networkRes;
        })
        .catch(function () {
          // Offline fallback: serve cached version, then dedicated offline page
          return caches.match(req)
            .then(function (cached) { return cached || caches.match('/offline.html'); });
        })
    );
    return;
  }

  // JS / CSS / images / fonts → cache-first (fast + works offline)
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;

      return fetch(req).then(function (networkRes) {
        if (networkRes.ok || networkRes.type === 'opaque') {
          const clone = networkRes.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, clone); });
        }
        return networkRes;
      });
    })
  );
});
