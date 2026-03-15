# 🪔 PSOTS Chhath Puja 2026 — Complete Setup Guide

**Prestige Song of the South · पंच वर्ष महोत्सव**
**Contact:** Pushkal Kishore · 9482088904 · psots.in

---

## 📁 Files Overview

| File | Who Uses It | URL After Hosting |
|---|---|---|
| `index.html` | All residents — home dashboard | psots.in |
| `portal.html` | Residents — personal account | psots.in/portal.html |
| `admin.html` | Committee — manage everything | psots.in/admin.html |
| `data-manager.html` | Admin — import history & resident data | psots.in/data-manager.html |
| `config.js` | **Edit this to update all settings** | (not a page) |
| `css/style.css` | Shared styles | (not a page) |
| `pages/` | Individual section pages | psots.in/pages/... |

---

## ✅ WHAT'S ALREADY FILLED IN (you don't need to change these)

- UPI ID: `9482088904-3@ybl`
- Mobile: `9482088904` and `9902837002`
- Event dates: Nov 1–4, 2026
- Arghya times: 5:45 PM (Nov 3) and 6:15 AM (Nov 4)
- Financial data: All 2025 actuals (₹2,35,553 collected · ₹1,98,383 spent · ₹1,04,670 surplus)
- Committee: Pushkal Kishore as Chief Organiser

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

### STEP 2 — Deploy on Netlify (5 mins · FREE · auto-updates)

1. Go to **netlify.com** → click **Sign up** → choose **Continue with GitHub**
2. Click **Add new site** → **Import an existing project**
3. Click **GitHub** → authorise → select `psots-chhath-2026`
4. Leave all settings as they are → click **Deploy site**
5. Netlify gives you a random URL like: `https://funny-name-123.netlify.app`

**Test it:** open that URL — your site should be live! ✅

**Every time you update a file on GitHub → Netlify auto-deploys in 30 seconds.**

---

### STEP 3 — Connect psots.in Domain (15 mins)

You own `psots.in` via Google Domains. Here's exactly what to do:

#### In Netlify:
1. Go to your site → **Domain management** → **Add a custom domain**
2. Type: `psots.in` → click **Verify** → click **Add domain**
3. Netlify will show you DNS values like:
   ```
   Type: A      Name: @    Value: 75.2.60.5
   Type: CNAME  Name: www  Value: funny-name-123.netlify.app
   ```

#### In Google Domains:
1. Go to **domains.google.com** → click on `psots.in`
2. Left menu → **DNS**
3. Scroll to **Custom records** → click **Manage custom records**
4. Delete any existing A records for `@`
5. Add new record:
   - Type: **A** · Host: **@** · Value: **75.2.60.5** · TTL: 3600
6. Add another record:
   - Type: **CNAME** · Host: **www** · Value: **funny-name-123.netlify.app** · TTL: 3600
7. Click **Save**

**Wait 10–30 minutes** → psots.in will show your site ✅

Back in Netlify → Domain management → click **Verify DNS configuration** → it should show green.

**Enable HTTPS:** Netlify → Domain management → HTTPS → click **Verify DNS configuration** → **Provision certificate** — this gives you the padlock 🔒 automatically, free.

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
3. Go to `psots.in/data-manager.html` → login → **⚙️ Apps Script Setup tab**
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
Save the file → push to GitHub → Netlify auto-deploys → live in 30 seconds.

**Test it:** go to `data-manager.html` → ⚙️ Apps Script Setup → paste URL → click **Test Connection** → should say ✅ Connected.

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
     https://chhathatpsots.netlify.app
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
7. Save → push to GitHub → live in 30 seconds ✅

---

## 🔄 HOW TO UPDATE THE WEBSITE AFTER LAUNCH

### Change event timings, announcements, committee details:
1. Open `config.js` on GitHub (click the file → pencil ✏️ icon)
2. Edit the value
3. Scroll down → click **Commit changes**
4. Netlify auto-deploys in ~30 seconds — **live immediately** ✅

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

### Import historical data from old Sheets:
Go to `psots.in/data-manager.html` → 📥 Import History tab → paste from your old sheet → Import.

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
