# 🪔 PSOTS Chhath Puja 2026 — Complete Setup Guide
<!-- Last updated: 2026-03-24 -->

**Prestige Song of the South · पंच वर्ष महोत्सव**
**Contact:** Pushkal Kishore · 9482088904 · psots.in

---

## 📁 Files Overview

| File | Who Uses It | URL After Hosting |
|---|---|---|
| `index.html` | All residents — home dashboard | chhath.psots.in |
| `portal.html` | Residents — personal account | chhath.psots.in/portal.html |
| `admin.html` | Committee — manage everything | chhath.psots.in/admin.html |
| `data-manager.html` | Admin — import history & resident data | chhath.psots.in/data-manager.html |
| `config.js` | **Edit this to update all settings** | (not a page) |
| `css/style.css` | Shared styles | (not a page) |
| `pages/` | Individual section pages | psots.in/pages/... |

---

## ✅ WHAT'S ALREADY DONE (no action needed)

- UPI ID: `9482088904@sbi`
- Mobile: `9482088904` and `9902837002`
- Event dates: Nov 1–4, 2026
- Arghya times: 5:45 PM (Nov 3) and 6:15 AM (Nov 4)
- Financial data: All 2025 actuals (₹2,35,553 collected · ₹1,98,383 spent · ₹1,04,670 surplus)
- Committee: Pushkal Kishore as Chief Organiser
- Firebase project: `psots-chhath` (Firestore configured, credentials in `js/firebase-config.js`)
- Google OAuth Client ID: configured in `js/config.js`
- Apps Script URL: configured in `js/config.js`
- Hosting: Cloudflare Pages → `chhath.psots.in`
- Historical data: 429 contribution records (2022–2025) in `data/history.json`

---

## 🗄️ DATABASE ARCHITECTURE

### How data is stored (priority order)

| Layer | Store | Speed | Purpose |
|---|---|---|---|
| 1 | Memory cache | Instant | Page-load speed |
| 2 | localStorage | Instant | Offline fallback |
| **3** | **Firestore (PRIMARY)** | **~50ms** | **Source of truth — real-time** |
| 4 | Google Sheet (secondary) | 1–2s | Backup + export |

**Firestore collections:**

| Collection | What's in it | Document ID |
|---|---|---|
| `profiles` | Resident profile (flat, mobile, family) | Google OAuth user ID |
| `contributions` | All payment records 2022–2026 | `year_flat_name_amount` |

### One-time: Sync historical data to Firestore

After the site is live, do this once to populate Firestore with 2022–2025 data:

1. Open `chhath.psots.in/data-manager.html`
2. Tap **Import History** tab
3. Tap **"Load BaseSheet (offline fallback)"** — loads 429 records
4. Tap **"🔥 Sync to Firestore"** — writes all records to Firestore
5. Verify in Firebase Console → Firestore → `contributions` collection

---

## 🚀 HOSTING SETUP — 4 STEPS

---

### STEP 1 — Create GitHub Account & Upload Files (10 mins)

1. Go to **github.com** → Sign Up with your Gmail
2. Click the green **New** button (top left)
3. Repository name: `psots-chhath-2026`
4. Set to **Public** → click **Create repository**
5. On the next screen, click **"uploading an existing file"**
6. **Drag and drop the entire `psots-chhath-2026` folder contents** (all files and subfolders)
7. Scroll down → click **Commit changes**

✅ Your code is now on GitHub at: `github.com/YOUR-USERNAME/psots-chhath-2026`

---

### STEP 2 — Deploy on Cloudflare Pages (already done ✅)

**Hosting:** Cloudflare Pages
**Project:** `psots-chhathpuja`
**Live URLs:**
- `https://psots-chhathpuja.pages.dev` (Cloudflare default)
- `https://chhath.psots.in` (custom domain — primary)

**Every time you push to `main` on GitHub → Cloudflare auto-deploys in ~18 seconds.**

---

### STEP 3 — Domain (already done ✅)

`chhath.psots.in` is connected to Cloudflare Pages and live with HTTPS.

---

### STEP 4 — Google Sheets Backend (10 mins)

This connects your Google Sheet to the website for form submissions and the live contributors list.

#### In your Google Sheet:
1. Open your existing Chhath sheet
2. Create a new tab — name it exactly: `2026`
3. In Row 1 of the `2026` tab, add these headers:
   ```
   A: Timestamp  B: Name  C: Flat  D: Mobile  E: Amount
   F: Date  G: Method  H: Status  I: Account Type  J: User ID
   ```

#### Create the Apps Script:
1. In your Google Sheet → **Extensions** → **Apps Script**
2. Delete ALL existing code in the editor
3. Go to `chhath.psots.in/data-manager.html` → login → **⚙️ Apps Script Setup tab**
4. Click **📋 Copy Script** → paste into the Apps Script editor
5. Click **Save** (💾)

#### Deploy:
1. Click **Deploy** (top right) → **New Deployment**
2. Click the ⚙️ gear next to "Select type" → choose **Web app**
3. Fill in:
   - Description: `PSOTS Chhath 2026`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Google asks you to **authorize** — click through all the permission screens
6. You'll see a URL like:
   ```
   https://script.google.com/macros/s/AKfycbXXXXXXXXXX/exec
   ```
7. **Copy this URL**

#### Add to your config:
Open `config.js` → find `scriptUrl: ''` → paste your URL:
```js
scriptUrl: 'https://script.google.com/macros/s/AKfycbXXXXXXXXXX/exec',
```
Save the file → push to GitHub → Cloudflare auto-deploys → live in ~18 seconds.

**Test it:** go to `chhath.psots.in/data-manager.html` → ⚙️ Apps Script Setup → paste URL → click **Test Connection** → should say ✅ Connected.

---

### STEP 5 — Google Login for Resident Portal (15 mins)

Residents sign in with their existing Google/Gmail account — no new passwords needed.

1. Go to **console.cloud.google.com** → Sign in with your Gmail
2. Click **Select a project** (top) → **New Project**
   - Name: `PSOTS Chhath` → Create
3. Left menu → **APIs & Services** → **OAuth consent screen**
   - User type: **External** → Create
   - App name: `PSOTS Chhath 2026`
   - User support email: your Gmail
   - Developer contact email: your Gmail
   - Click **Save and Continue** through all screens (leave defaults)
4. Left menu → **Credentials** → **+ Create Credentials** → **OAuth Client ID**
   - Application type: **Web application**
   - Name: `PSOTS Chhath Web`
   - Authorized JavaScript origins — click **Add URI**, type:
     ```
     https://chhath.psots.in
     https://psots-chhathpuja.pages.dev
     ```
   - Click **Create**
5. A popup shows your **Client ID** — looks like:
   ```
   123456789012-abcdefghijk.apps.googleusercontent.com
   ```
6. Copy it → open `config.js` → find `googleClientId: ''` → paste:
   ```js
   googleClientId: '123456789012-abcdefghijk.apps.googleusercontent.com',
   ```
7. Save → push to GitHub → live in ~18 seconds ✅

---

## 🔄 HOW TO UPDATE THE WEBSITE AFTER LAUNCH

### Change event timings, announcements, committee details:
1. Open `config.js` on GitHub (click the file → pencil ✏️ icon)
2. Edit the value
3. Scroll down → click **Commit changes**
4. Cloudflare auto-deploys in ~18 seconds — **live immediately** ✅

### Change Arghya timings:
In `config.js`:
```js
arghyaEvening: { time: '5:52 PM', date: 'Nov 3, 2026' },
arghyaMorning: { time: '6:18 AM', date: 'Nov 4, 2026' },
```

### Add a new announcement:
In `config.js` → `announcements` array → add a new object:
```js
{ tag: '📢 Update', meta: 'Oct 15, 2026', text: 'Your announcement here.' },
```

### Update finance figures as expenses happen:
In `config.js` → `finance2026`:
```js
finance2026: {
  budget:    282000,
  collected: 185000,  // ← update this as you verify payments
  expenses:  45000,   // ← update this as you spend
},
```

### Import historical data / sync to Firestore:
Go to `chhath.psots.in/data-manager.html` → 📥 Import History tab → paste from your old sheet → Import → then tap **🔥 Sync to Firestore**.

---

## 🔐 Admin Access

| Page | Password | Change it at |
|---|---|---|
| `admin.html` | `chhath2026psots` | Admin → Settings → Change Password |
| `data-manager.html` | same as admin | same |

**Change the password on first login!**

---

## 📱 WhatsApp Broadcast Setup

1. Open WhatsApp on your phone
2. Tap the **three dots** (⋮) → **New broadcast**
3. Add all subscriber numbers (from subscribe requests you receive)
4. Name the list: **PSOTS Chhath 2026**
5. To send an update: Admin panel → 📲 Broadcast tab → compose → tap Send → **select your broadcast list** → Send

---

## 📞 Support

- Pushkal Kishore: 9482088904
- Second contact: 9902837002

---

*🪔 PSOTS — पंच वर्ष महोत्सव · Nov 1–4, 2026 · Prestige Song of the South*
