from dataclasses import dataclass
from enum import StrEnum


class BlockReason(StrEnum):
    HTTP_STATUS = "http_status"
    CHALLENGE = "challenge"
    ACCESS_DENIED = "access_denied"
    CAPTCHA = "captcha"
    EMPTY_RESPONSE = "empty_response"
    SOFT_BLOCK = "soft_block"


@dataclass(frozen=True, slots=True)
class BlockDecision:
    blocked: bool
    reason: BlockReason | None = None


_BLOCKED_STATUSES = {401, 403, 407, 429, 444, 503}
_CHALLENGE_MARKERS = (
    "cf-chl-",
    "cloudflare ray id",
    "checking your browser",
    "just a moment",
    "challenge-platform",
)
_ACCESS_DENIED_MARKERS = (
    "<title>access denied",
    "<title>forbidden",
    "request blocked",
    "automated access is prohibited",
)
_CAPTCHA_MARKERS = (
    "g-recaptcha",
    "hcaptcha",
    "captcha-container",
    "verify you are human",
)
_SOFT_BLOCK_MARKERS = (
    "<title>error page | ebay",
    "<title>javascript is disabled",
    "<title>register &amp; sign in - farfetch",
    "<title>register & sign in - farfetch",
    "<title>sign in | farfetch",
    "<title>page load problem",
    "please enable javascript to continue",
    "javascript is required to view this page",
    "enable javascript and cookies to continue",
)


def classify_block(status: int, body: str) -> BlockDecision:
    normalized = body[:500_000].lower()
    if not normalized.strip():
        return BlockDecision(True, BlockReason.EMPTY_RESPONSE)
    if any(marker in normalized for marker in _CHALLENGE_MARKERS):
        return BlockDecision(True, BlockReason.CHALLENGE)
    if any(marker in normalized for marker in _ACCESS_DENIED_MARKERS):
        return BlockDecision(True, BlockReason.ACCESS_DENIED)
    if any(marker in normalized for marker in _CAPTCHA_MARKERS):
        return BlockDecision(True, BlockReason.CAPTCHA)
    if any(marker in normalized for marker in _SOFT_BLOCK_MARKERS):
        return BlockDecision(True, BlockReason.SOFT_BLOCK)
    if status in _BLOCKED_STATUSES:
        return BlockDecision(True, BlockReason.HTTP_STATUS)
    return BlockDecision(False)
