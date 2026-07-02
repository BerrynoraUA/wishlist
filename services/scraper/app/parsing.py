from urllib.parse import urlparse

from app.extractors import ExtractionResult, extract_generic_product
from app.extractors.stores import extract_store_product
from app.models import QualityResult
from app.quality import evaluate_quality


def parse_product_html(
    html_text: str,
    page_url: str,
) -> tuple[ExtractionResult, QualityResult]:
    store_extraction = extract_store_product(html_text, page_url)
    generic_extraction = extract_generic_product(html_text, page_url)
    if store_extraction is None:
        extraction = generic_extraction
    else:
        blocked_merge_fields = {
            warning.split(":", 1)[1]
            for warning in store_extraction.warnings
            if warning.startswith("do_not_merge:")
        }
        for field_name in blocked_merge_fields:
            if field_name in generic_extraction.product.model_fields:
                setattr(generic_extraction.product, field_name, None)
                generic_extraction.sources.pop(field_name, None)
        extraction = store_extraction
        extraction.merge_missing(generic_extraction)
    _remove_store_placeholders(extraction, page_url)
    quality = evaluate_quality(extraction)
    return extraction, quality


def _remove_store_placeholders(
    extraction: ExtractionResult,
    page_url: str,
) -> None:
    hostname = (urlparse(page_url).hostname or "").lower()
    title = (extraction.product.title or "").strip().lower()
    blocked_titles: dict[str, set[str]] = {
        "aliexpress.": {"aliexpress", "aliexpress.com"},
        "ebay.": {"error page | ebay"},
        "emag.": {"javascript is disabled"},
        "takealot.com": {"takealot.com: online shopping | sa's leading online store"},
        "cdiscount.com": {"cdiscount.com"},
        "farfetch.com": {
            "register & sign in - farfetch",
            "register &amp; sign in - farfetch",
        },
    }
    matched_domain = next(
        (domain for domain in blocked_titles if domain in hostname),
        None,
    )
    if matched_domain and title in blocked_titles[matched_domain]:
        for field_name in extraction.product.model_fields:
            if field_name == "has_discount":
                setattr(extraction.product, field_name, False)
            else:
                setattr(extraction.product, field_name, None)
            extraction.sources.pop(field_name, None)
        extraction.warnings.append(f"{matched_domain.rstrip('.')}_non_product_page")
        return
    if "aliexpress." in hostname and title in {"aliexpress", "aliexpress.com"}:
        extraction.product.title = None
        extraction.sources.pop("title", None)
        extraction.warnings.append("aliexpress_placeholder_title")
    description = (extraction.product.description or "").strip()
    if "aliexpress." in hostname and description.lower().startswith("smarter shopping"):
        extraction.product.description = None
        extraction.sources.pop("description", None)
        extraction.warnings.append("aliexpress_placeholder_description")
