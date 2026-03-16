import asyncio
import logging
import os
import sys

from dotenv import load_dotenv
from flask import Flask, request
from telegram import Update, Chat
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from database import Database
from keywords import check_external_links
from moderator import Moderator

load_dotenv()

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────

BOT_TOKEN = os.environ.get("BOT_TOKEN")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")  # e.g. https://your-app.onrender.com
PORT = int(os.environ.get("PORT", 8080))
IS_RENDER = bool(os.environ.get("RENDER"))

# Comma-separated Telegram user IDs of bot admins (can use commands like /reset)
ADMIN_IDS = set(
    int(x.strip()) for x in os.environ.get("ADMIN_IDS", "").split(",") if x.strip().isdigit()
)

if not BOT_TOKEN:
    logger.error("BOT_TOKEN is not set. Please set it in .env or environment variables.")
    sys.exit(1)

# ── Globals ────────────────────────────────────────────────────────────────────

db = Database()
moderator = Moderator(gemini_api_key=GEMINI_API_KEY, db=db)
flask_app = Flask(__name__)

# ── Helpers ────────────────────────────────────────────────────────────────────

async def is_group_admin(update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int) -> bool:
    """Check if user is an admin in the current chat."""
    if user_id in ADMIN_IDS:
        return True
    try:
        member = await context.bot.get_chat_member(update.effective_chat.id, user_id)
        return member.status in ("administrator", "creator")
    except Exception:
        return False


def get_username_display(user) -> str:
    if user.username:
        return f"@{user.username}"
    return user.full_name or f"User {user.id}"


# ── Message Handler ─────────────────────────────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Main moderation handler — runs on every group message."""
    message = update.effective_message
    chat = update.effective_chat
    user = update.effective_user

    # Only moderate group/supergroup chats
    if chat.type not in (Chat.GROUP, Chat.SUPERGROUP):
        return

    if not message or not user:
        return

    text = message.text or message.caption or ""

    # Skip empty messages and bot messages
    if not text.strip() or user.is_bot:
        return

    admin = await is_group_admin(update, context, user.id)

    # Skip whitelisted users
    if db.is_whitelisted(user.id, chat.id):
        return

    has_link = check_external_links(text)
    result = moderator.check_message(text, is_admin=admin, has_external_link=has_link)

    if not result.flagged:
        return

    username_display = get_username_display(user)
    warning_count = db.add_warning(user.id, chat.id, user.username or "", user.full_name or "")
    db.log_deleted_message(chat.id, user.id, user.username or "", text, result.reason)

    # Delete the offending message
    try:
        await message.delete()
        logger.info(f"Deleted message from {username_display} in chat {chat.id}. Reason: {result.reason}")
    except Exception as e:
        logger.warning(f"Could not delete message: {e}")

    # Send warning in group
    warning_msg = (
        f"⚠️ {username_display}, your message was removed.\n\n"
        f"🚫 *Reason:* {result.reason}\n\n"
        f"Please keep this group relevant to PSOTS society matters only. "
        f"Thank you 🙏\n\n"
        f"_(Warning {warning_count} recorded)_"
    )

    try:
        await context.bot.send_message(
            chat_id=chat.id,
            text=warning_msg,
            parse_mode="Markdown"
        )
    except Exception as e:
        logger.warning(f"Could not send warning message: {e}")


# ── Admin Commands ──────────────────────────────────────────────────────────────

async def cmd_warnings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin command: /warnings @username — show warning count for a user."""
    if not await is_group_admin(update, context, update.effective_user.id):
        await update.message.reply_text("This command is only for admins.")
        return

    # Check if replying to a message
    if update.message.reply_to_message:
        target = update.message.reply_to_message.from_user
        count = db.get_warnings(target.id, update.effective_chat.id)
        name = get_username_display(target)
        await update.message.reply_text(f"⚠️ {name} has *{count}* warning(s).", parse_mode="Markdown")
        return

    await update.message.reply_text("Reply to a user's message with /warnings to check their warning count.")


async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin command: /reset — reply to a message to reset that user's warnings."""
    if not await is_group_admin(update, context, update.effective_user.id):
        await update.message.reply_text("This command is only for admins.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("Reply to a user's message with /reset to clear their warnings.")
        return

    target = update.message.reply_to_message.from_user
    db.reset_warnings(target.id, update.effective_chat.id)
    name = get_username_display(target)
    await update.message.reply_text(f"✅ Warnings for {name} have been reset.")


async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin command: /stats — show all warned users."""
    if not await is_group_admin(update, context, update.effective_user.id):
        await update.message.reply_text("This command is only for admins.")
        return

    warned = db.get_all_warnings(update.effective_chat.id)
    if not warned:
        await update.message.reply_text("✅ No active warnings in this group.")
        return

    lines = ["📊 *Moderation Stats* (last 30 days)\n"]
    for u in warned:
        name = f"@{u['username']}" if u['username'] else u['full_name'] or f"User {u['user_id']}"
        lines.append(f"• {name} — *{u['count']}* warning(s)")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_allow(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin command: /allow — reply to a message to whitelist that user."""
    if not await is_group_admin(update, context, update.effective_user.id):
        await update.message.reply_text("This command is only for admins.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("Reply to a user's message with /allow to whitelist them.")
        return

    target = update.message.reply_to_message.from_user
    db.whitelist_user(target.id, update.effective_chat.id, update.effective_user.id)
    name = get_username_display(target)
    await update.message.reply_text(f"✅ {name} has been whitelisted and won't be moderated.")


async def cmd_rules(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Public command: /rules — display group rules based on the etiquette document."""
    rules = (
        "📋 *PSOTS Owners Group — Etiquettes*\n\n"
        "*Goals:* Connect residents, share society updates, stay spam-free.\n\n"
        "✅ *Allowed:*\n"
        "• Society maintenance & management\n"
        "• Event announcements (Chhath Puja, festivals)\n"
        "• Resident concerns (parking, security, water, lift)\n"
        "• Payment & contribution updates\n"
        "• Committee notices & circulars\n\n"
        "🚫 *Strictly NOT allowed:*\n"
        "• Foul language or derogatory comments\n"
        "• Personal attacks or bullying\n"
        "• Sharing others' pictures without consent\n"
        "• Advertisements / buy-sell (without admin approval)\n"
        "• Political or religious posts\n"
        "• Communal or sensitive discussions\n\n"
        "⚠️ *Good to avoid:*\n"
        "• Unsolicited references / recommendations\n"
        "• Sharing contact details with interior photos\n"
        "• Social broadcast messages (birthdays, marriages)\n"
        "• Jokes, sarcasm, light-content mass-forwards\n\n"
        "_The moderation bot auto-removes violations. "
        "Repeated offenders may be muted or removed by admins._"
    )
    await update.message.reply_text(rules, parse_mode="Markdown")


# ── Keyword Management Commands ─────────────────────────────────────────────────

async def cmd_addkeyword(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin command: /addkeyword <keyword> — add a custom banned keyword."""
    if not await is_group_admin(update, context, update.effective_user.id):
        await update.message.reply_text("This command is only for admins.")
        return

    if not context.args:
        await update.message.reply_text(
            "Usage: `/addkeyword <keyword>`\n"
            "Example: `/addkeyword buy flat`",
            parse_mode="Markdown"
        )
        return

    keyword = " ".join(context.args).strip().lower()
    if len(keyword) < 3:
        await update.message.reply_text("Keyword must be at least 3 characters long.")
        return

    added = db.add_custom_keyword(keyword, "custom", update.effective_user.id)
    if added:
        await update.message.reply_text(f"✅ Keyword `{keyword}` has been added to the banned list.", parse_mode="Markdown")
    else:
        await update.message.reply_text(f"⚠️ Keyword `{keyword}` already exists in the banned list.", parse_mode="Markdown")


async def cmd_removekeyword(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin command: /removekeyword <keyword> — remove a custom banned keyword."""
    if not await is_group_admin(update, context, update.effective_user.id):
        await update.message.reply_text("This command is only for admins.")
        return

    if not context.args:
        await update.message.reply_text(
            "Usage: `/removekeyword <keyword>`\n"
            "Example: `/removekeyword buy flat`",
            parse_mode="Markdown"
        )
        return

    keyword = " ".join(context.args).strip().lower()
    removed = db.remove_custom_keyword(keyword)
    if removed:
        await update.message.reply_text(f"✅ Keyword `{keyword}` has been removed from the banned list.", parse_mode="Markdown")
    else:
        await update.message.reply_text(f"⚠️ Keyword `{keyword}` was not found in the custom banned list.", parse_mode="Markdown")


async def cmd_listkeywords(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin command: /listkeywords — show all custom banned keywords."""
    if not await is_group_admin(update, context, update.effective_user.id):
        await update.message.reply_text("This command is only for admins.")
        return

    keywords = db.get_custom_keywords()
    if not keywords:
        await update.message.reply_text(
            "No custom keywords added yet.\n"
            "Use `/addkeyword <keyword>` to add one.",
            parse_mode="Markdown"
        )
        return

    lines = ["🔑 *Custom Banned Keywords:*\n"]
    for kw in keywords:
        lines.append(f"• `{kw['keyword']}` _(added {kw['added_at'][:10]})_")

    lines.append(f"\n_Total: {len(keywords)} custom keyword(s)_")
    lines.append("_Use /removekeyword to remove any._")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.type == Chat.PRIVATE:
        await update.message.reply_text(
            "👋 I'm the PSOTS Society Group Moderation Bot.\n\n"
            "Add me to your group as an admin with *Delete Messages* permission, "
            "and I'll automatically moderate messages.\n\n"
            "Use /rules in the group to see the rules.",
            parse_mode="Markdown"
        )


# ── Application Setup ───────────────────────────────────────────────────────────

def build_application() -> Application:
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("rules", cmd_rules))
    app.add_handler(CommandHandler("warnings", cmd_warnings))
    app.add_handler(CommandHandler("reset", cmd_reset))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("allow", cmd_allow))
    app.add_handler(CommandHandler("addkeyword", cmd_addkeyword))
    app.add_handler(CommandHandler("removekeyword", cmd_removekeyword))
    app.add_handler(CommandHandler("listkeywords", cmd_listkeywords))

    # Catch all text + caption messages in groups
    app.add_handler(MessageHandler(
        filters.TEXT | filters.CAPTION,
        handle_message
    ))

    return app


# ── Webhook Mode (Render) ───────────────────────────────────────────────────────

ptb_app: Application = None


@flask_app.route("/webhook", methods=["POST"])
def webhook():
    if not ptb_app:
        return "Bot not ready", 503
    data = request.get_json(force=True)
    update = Update.de_json(data, ptb_app.bot)
    asyncio.run(ptb_app.process_update(update))
    return "ok", 200


@flask_app.route("/health", methods=["GET"])
def health():
    return "ok", 200


def run_webhook():
    global ptb_app
    ptb_app = build_application()

    async def setup():
        await ptb_app.initialize()
        await ptb_app.bot.set_webhook(url=f"{WEBHOOK_URL}/webhook")
        logger.info(f"Webhook set to {WEBHOOK_URL}/webhook")

    asyncio.run(setup())
    flask_app.run(host="0.0.0.0", port=PORT)


# ── Polling Mode (local dev) ────────────────────────────────────────────────────

def run_polling():
    app = build_application()
    logger.info("Starting bot in polling mode...")
    app.run_polling(drop_pending_updates=True)


# ── Entry Point ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if IS_RENDER:
        if not WEBHOOK_URL:
            logger.error("WEBHOOK_URL must be set when running on Render. Set it to your Render app URL.")
            sys.exit(1)
        logger.info("Running in webhook mode (Render)")
        run_webhook()
    else:
        logger.info("Running in polling mode (local)")
        run_polling()
