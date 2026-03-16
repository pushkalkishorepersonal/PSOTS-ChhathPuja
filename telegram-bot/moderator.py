import json
import logging
import os
from dataclasses import dataclass

from keywords import check_keywords, check_external_links
from database import Database

logger = logging.getLogger(__name__)


@dataclass
class ModerationResult:
    flagged: bool
    reason: str
    stage: str  # "keyword", "ai", or "none"


class Moderator:
    def __init__(self, gemini_api_key: str = None, db: Database = None):
        self.gemini_api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY")
        self._gemini_model = None
        self.db = db  # Used to fetch custom keywords at runtime

        if self.gemini_api_key:
            self._init_gemini()

    def _init_gemini(self):
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_api_key)
            self._gemini_model = genai.GenerativeModel("gemini-1.5-flash")
            logger.info("Gemini AI initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini: {e}. Falling back to keyword-only mode.")
            self._gemini_model = None

    def check_message(self, text: str, is_admin: bool = False, has_external_link: bool = False) -> ModerationResult:
        """
        Two-stage moderation check.
        Admins bypass all moderation.
        Returns ModerationResult.
        """
        if not text or not text.strip():
            return ModerationResult(flagged=False, reason="", stage="none")

        if is_admin:
            return ModerationResult(flagged=False, reason="", stage="none")

        # Stage 0: Check custom keywords added by admins at runtime
        if self.db:
            custom_kws = self.db.get_custom_keywords_list()
            text_lower = text.lower()
            for kw in custom_kws:
                if kw in text_lower:
                    return ModerationResult(
                        flagged=True,
                        reason=f"Message contains a restricted term ('{kw}') added by admins",
                        stage="custom_keyword"
                    )

        # Stage 1: Fast keyword check
        flagged, reason, _ = check_keywords(text)
        if flagged:
            return ModerationResult(flagged=True, reason=reason, stage="keyword")

        # Stage 1b: External link check (non-admins can't post links)
        if has_external_link:
            return ModerationResult(
                flagged=True,
                reason="External links are not allowed without admin approval — please ask an admin to share the link",
                stage="keyword"
            )

        # Stage 2: AI check (only if Gemini is available and text is long enough to be worth checking)
        if self._gemini_model and len(text.strip()) > 20:
            flagged, reason = self._ai_check(text)
            if flagged:
                return ModerationResult(flagged=True, reason=reason, stage="ai")

        return ModerationResult(flagged=False, reason="", stage="none")

    def _ai_check(self, text: str) -> tuple[bool, str]:
        """
        Stage 2: Gemini AI content classification.
        Returns (flagged: bool, reason: str)
        """
        prompt = f"""You are a moderator for a residential society Telegram group called PSOTS (Prestige Song of the South), Bengaluru.

The group is ONLY for:
- Society maintenance and management discussions
- Event announcements (Chhath Puja, festivals, etc.)
- Resident concerns (parking, security, water, electricity, lifts)
- Payment reminders and contribution updates
- Committee notices

Flag this message if it clearly contains:
1. Political opinions, party names, or electoral content
2. Unauthorized advertisements, promotions, or sales pitches
3. Content completely irrelevant to society/community matters (e.g. forwarded jokes, stock tips, cricket news)

Do NOT flag:
- Genuine society-related queries even if informal
- Festival greetings related to community events
- Maintenance complaints or queries
- Normal conversation between residents about society matters

Message to evaluate:
"{text}"

Respond with ONLY a JSON object, nothing else:
{{"flagged": true or false, "reason": "specific reason if flagged, empty string if not"}}"""

        try:
            response = self._gemini_model.generate_content(
                prompt,
                generation_config={"temperature": 0.1, "max_output_tokens": 100}
            )
            raw = response.text.strip()

            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            result = json.loads(raw)
            flagged = bool(result.get("flagged", False))
            reason = result.get("reason", "")

            if flagged and not reason:
                reason = "Content flagged as inappropriate by AI moderation"

            return flagged, reason

        except json.JSONDecodeError as e:
            logger.warning(f"Gemini returned non-JSON response: {e}")
            return False, ""
        except Exception as e:
            logger.error(f"Gemini AI check failed: {e}")
            return False, ""
