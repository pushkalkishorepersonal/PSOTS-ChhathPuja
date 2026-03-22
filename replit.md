# PSOTS Chhath Puja 2026 — Community Event Website

## Overview
Static HTML/CSS/JS community event site for **Prestige Song of the South** apartment complex celebrating the **5th year (Panch Varsh Mahotsav)** of Chhath Puja. Deployed at `chhath.psots.in`.

## Architecture
- **Pure static site**: No build step, served with `python3 -m http.server 5000`
- **Pages**: `index.html` + 14 inner pages in `pages/`
- **Shared styles**: `css/style.css` — all inner pages import this
- **Config**: `js/config.js` — runtime configuration (Google Apps Script URL, event dates)
- **Backend**: Google Apps Script (external) for data storage/retrieval
- **Auth**: `js/auth-gate.js` — Google Sign-In / email OTP gating

## Design System
- **Color palette**: Saffron (#e85c00), Gold (#ffc200), Deep Maroon backgrounds (#2d0800, #3d1000, #451800), Warm Ivory (#fdf5e0, #fff8f0), Deep Navy for water (#0d2244)
- **NO BLACK BACKGROUNDS**: All dark sections use deep maroon/burgundy/navy tones. Black text is permitted for readability.
- **Fonts**: Playfair Display (hero titles), Yatra One (Hindi/devotional), DM Sans (body/UI)
- **Hero**: Canvas animation — 55 twinkling stars + 48 marigold petals (falling, swaying, rotating) + responsive diya flames (7–14 lamps, clay bowl base + teardrop flame + amber halo) along waterline
- **Community stats strip**: 5th Year · 20 Vrati Families · 300+ Evening Ghat · 600+ Prasad Seva · 90kg Tekhua (between arghya cards and countdown)
- **Tiles**: Glassmorphism with deep maroon glass (`rgba(100,25,0,.65)`)
- **Animations**: `engPulse` breathing glow on "Chhath" text; meditative marigold/diya/star layered canvas

## Key Files
- `index.html` — Hero + dashboard with schedule carousel, payment, finance, contributor tiles
- `css/style.css` — Shared premium styles (nav, page-hero, cards, forms, buttons, animations)
- `pages/schedule.html` — 4-day event schedule
- `pages/payment.html` — UPI/QR payment with PayU integration
- `pages/finance.html` — Year-wise financial transparency
- `pages/contributors.html` — Contributor leaderboard
- `pages/announcements.html` — Community announcements
- `pages/volunteer.html` — Volunteer sign-up and RSVP
- `js/config.js` — Central configuration

## Responsive Typography
All key font sizes use `clamp(min, viewport-based, max)`:
- Hero countdown number: `clamp(1.4rem, 5.5vw, 2.1rem)` (mobile override: `clamp(1.1rem, 6.5vw, 1.5rem)`)
- Arghya card time: `clamp(1.3rem, 5vw, 1.7rem)` (mobile: `clamp(1.1rem, 5vw, 1.35rem)`)
- Schedule arghya time: `clamp(1.1rem, 4.5vw, 1.35rem)`
- Countdown label: `clamp(.6rem, .55rem + .5vw, .72rem)`
- All page-hero titles: `clamp()` via shared `css/style.css`

## Known Quirks
- Auth-gated pages (payment, finance, contributors, volunteer, gallery, etc.) redirect to Google sign-in — this is intentional for PSOTS residents only
- Google OAuth "origin not allowed" in dev/Replit preview is expected — works on `chhath.psots.in` production domain
- The lightbox in gallery uses a dark overlay (rgba 0,0,0,.92) — this is an overlay for photos, not a background, so it's allowed

## Development
- Start: `python3 -m http.server 5000`
- No build process needed — edit HTML/CSS/JS directly
- GitHub: `https://github.com/pushkalkishorepersonal/PSOTS-ChhathPuja`

## Bug Fixes Applied
- **config.js path fix**: All 14 inner pages had `../config.js` — corrected to `../js/config.js`
- **Countdown overflow**: Added `overflow:hidden` to `.cdb` and switched font sizes to `clamp()`
- **Gallery sticky nav**: Fixed `top:52px` → `top:56px` to match nav height
- **Schedule arghya strip**: Made `.ah-time` responsive with `clamp()`
