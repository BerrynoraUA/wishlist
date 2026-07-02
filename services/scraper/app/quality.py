from decimal import Decimal, InvalidOperation

from app.extractors.result import ExtractionResult
from app.models import QualityResult


_BLOCKED_TITLES = {
    "access denied",
    "forbidden",
    "just a moment",
    "page not found",
    "error page | ebay",
    "javascript is disabled",
    "register & sign in - farfetch",
    "cdiscount.com",
}


def evaluate_quality(extraction: ExtractionResult) -> QualityResult:
    product = extraction.product
    warnings = list(dict.fromkeys(extraction.warnings))
    score = 0

    title = (product.title or "").strip()
    if title and title.lower() not in _BLOCKED_TITLES:
        score += 25
    elif title:
        warnings.append("blocked_or_placeholder_title")

    if _valid_price(product.price):
        score += 30
    elif product.price is not None:
        warnings.append("invalid_price")

    if product.currency:
        score += 10
    if product.image and product.image.startswith(("http://", "https://")):
        score += 20
    elif product.image:
        warnings.append("invalid_image")
    if product.description:
        score += 5

    if _has_independent_confirmation(extraction):
        score += 10

    accepted = score >= 70 and bool(title) and (
        _valid_price(product.price) or bool(product.image)
    )
    return QualityResult(
        score=min(score, 100),
        accepted=accepted,
        warnings=list(dict.fromkeys(warnings)),
    )


def _valid_price(value: str | None) -> bool:
    if value is None:
        return False
    try:
        return Decimal(value) > 0
    except InvalidOperation:
        return False


def _has_independent_confirmation(extraction: ExtractionResult) -> bool:
    sources = set(extraction.sources.values())
    return "json_ld" in sources and bool(sources.intersection({"meta_dom", "regex"}))
