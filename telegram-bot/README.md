# PSOTS Society Group — Telegram Moderation Bot

An intelligent, always-on Telegram bot that automatically moderates the PSOTS Owners Group
based on the official Group Etiquettes document.

## Features

- **Auto-deletes** messages that violate group rules
- **Notifies** the user with the exact reason their message was removed
- **Two-stage detection**: Fast keyword filter + Gemini AI (context-aware)
- **Admin commands** to manage warnings, whitelist users, and add custom keywords at runtime
- **Free to run** — hosted on Render.com free tier

## What Gets Moderated

| Violation | Examples |
|-----------|---------|
| Foul language | Abusive words, derogatory comments |
| Personal attacks / bullying | Direct insults, threats |
| Political content | BJP, Congress, election, vote, party names |
| Religious conflict | Religion-vs-religion debates |
| Communal/sensitive topics | Caste, communal riots, regional discrimination |
| Unauthorized ads / buy-sell | "for sale", "earn money", MLM schemes |
| Unsolicited external links | Any `http://` or `https://` links |
| Mass social broadcasts | "Good morning everyone", forwarded chain messages |

## Admin Commands

| Command | Usage | Description |
|---------|-------|-------------|
| `/rules` | Anyone | Show group etiquette rules |
| `/warnings` | Reply to a message | Check that user's warning count |
| `/reset` | Reply to a message | Reset that user's warnings |
| `/stats` | Admins only | Show all warned users |
| `/allow` | Reply to a message | Whitelist a user (exempt from moderation) |
| `/addkeyword <term>` | Admins only | Add a custom banned keyword at runtime |
| `/removekeyword <term>` | Admins only | Remove a custom banned keyword |
| `/listkeywords` | Admins only | Show all custom banned keywords |

## Quick Setup

See [SETUP.md](SETUP.md) for full step-by-step instructions.

**Short version:**
1. Create bot via @BotFather → get `BOT_TOKEN`
2. Get Gemini API key (free) from Google AI Studio
3. Deploy to Render.com (free) — connect this GitHub repo
4. Add bot to group as admin with *Delete Messages* permission

## Tech Stack

- Python 3.11+
- `python-telegram-bot` 20.7 (async)
- `google-generativeai` (Gemini 1.5 Flash — free tier)
- `flask` (webhook server for Render)
- `sqlite3` (warning tracking, custom keywords)

## Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/psots-telegram-bot.git
cd psots-telegram-bot

# Install dependencies
pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Edit .env and fill in BOT_TOKEN, GEMINI_API_KEY, ADMIN_IDS

# Run locally (polling mode — no webhook needed)
python bot.py
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | Yes | Telegram bot token from @BotFather |
| `GEMINI_API_KEY` | Recommended | Google Gemini AI key (free tier) |
| `ADMIN_IDS` | Yes | Your Telegram user ID(s), comma-separated |
| `RENDER` | Auto-set | Set to `true` on Render to enable webhook mode |
| `WEBHOOK_URL` | On Render | Your Render app URL |
| `PORT` | On Render | Port number (Render sets this automatically) |
