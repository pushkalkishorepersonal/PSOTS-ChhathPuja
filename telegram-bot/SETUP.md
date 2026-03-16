# PSOTS Society Group — Telegram Moderation Bot Setup Guide

This bot automatically monitors your Telegram group and removes inappropriate messages
(political content, unauthorized ads, irrelevant info). It also notifies the user with
the specific reason their message was removed.

---

## What You Need

- A Telegram account (you have this)
- A GitHub account (you have this — the bot code is already in the repo)
- A Render.com account (free — sign up at render.com)
- A Google account (for Gemini AI key — optional but recommended)

---

## Step 1: Create the Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name: e.g. `PSOTS Society Moderator`
4. Choose a username: e.g. `psots_moderator_bot` (must end in `bot`)
5. BotFather will give you a **token** — copy it, looks like: `7123456789:AAFxxxxxx`

---

## Step 2: Get Your Telegram User ID

1. Open Telegram and search for **@userinfobot**
2. Send `/start`
3. It will reply with your user ID — a number like `987654321`
4. Copy this — you'll use it as `ADMIN_IDS`

---

## Step 3: Get Gemini API Key (Free — Recommended)

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key — looks like `AIzaSy...`

> The free tier gives 15 requests/minute, 1 million tokens/day — more than enough for a society group.
> If you skip this step, the bot still works using keyword detection only.

---

## Step 4: Deploy to Render.com

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New +** → **Web Service**
3. Connect your GitHub account and select the `PSOTS-ChhathPuja` repository
4. Set the following:
   - **Root Directory**: `telegram-bot`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python bot.py`
   - **Plan**: Free
5. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `BOT_TOKEN` | Your bot token from Step 1 |
   | `GEMINI_API_KEY` | Your Gemini key from Step 3 (optional) |
   | `ADMIN_IDS` | Your Telegram user ID from Step 2 |
   | `RENDER` | `true` |
   | `WEBHOOK_URL` | Leave blank for now — fill in after first deploy |
   | `PORT` | `8080` |
6. Click **Create Web Service** — it will deploy
7. Once deployed, copy your app URL: `https://psots-society-bot.onrender.com`
8. Go back to **Environment** → update `WEBHOOK_URL` with your actual URL
9. Click **Save Changes** — Render will redeploy automatically

---

## Step 5: Add Bot to Your Telegram Group

1. Open your society Telegram group
2. Tap the group name → **Add Members**
3. Search for your bot username (e.g. `@psots_moderator_bot`)
4. Add it to the group
5. Tap the group name → **Administrators** → **Add Admin**
6. Select your bot
7. Enable **only** these permissions:
   - ✅ Delete Messages
   - ✅ Ban Users (optional, if you want muting in future)
8. Save

---

## Step 6: Verify It's Working

Send a test message in the group:
```
BJP is the best party
```
The bot should:
1. Delete the message immediately
2. Post a warning: `⚠️ @yourusername, your message was removed. 🚫 Reason: Political content detected...`

---

## Admin Commands

These work only if you are a group admin or your ID is in `ADMIN_IDS`:

| Command | How to use | What it does |
|---------|-----------|--------------|
| `/warnings` | Reply to someone's message | Shows their warning count |
| `/reset` | Reply to someone's message | Clears their warnings |
| `/allow` | Reply to someone's message | Whitelists them (they won't be moderated) |
| `/stats` | Just type it | Shows all warned users in the group |
| `/rules` | Anyone can use | Shows group rules |

---

## What Gets Moderated

| Type | Examples |
|------|---------|
| Political content | BJP, Congress, Modi, vote, election, Lok Sabha |
| Unauthorized ads | "for sale", "buy now", "contact me", "earn money", "MLM" |
| External links | Any `http://` or `https://` link (admin links are allowed) |
| Irrelevant content | Stock tips, crypto, forwarded jokes, "good morning" mass-forwards |

---

## Troubleshooting

**Bot not deleting messages?**
- Make sure the bot is an admin with "Delete Messages" permission

**Bot not responding to commands?**
- Check Render logs (Dashboard → your service → Logs)
- Make sure `BOT_TOKEN` is set correctly

**Getting false positives?**
- Use `/allow` (reply to that user's message) to whitelist trusted members
- Or contact the developer to add terms to the whitelist

---

## Cost

| Component | Cost |
|-----------|------|
| Render.com hosting | Free (750 hrs/month) |
| Gemini AI API | Free (15 req/min, 1M tokens/day) |
| Telegram Bot API | Free |
| **Total** | **₹0 / month** |
