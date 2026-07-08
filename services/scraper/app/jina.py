import re
from urllib.parse import urlparse

from app.extractors.normalization import normalize_currency, normalize_image_url, normalize_price
from app.extractors.result import ExtractionResult
from app.models import ProductData


def reader_url(product_url: str) -> str:
    return f"https://r.jina.ai/{product_url}"


def parse_reader_markdown(markdown: str, product_url: str) -> ExtractionResult:
    identifiers = _identifiers(product_url)
    lowered = markdown.lower()
    if identifiers and not any(identifier in lowered for identifier in identifiers):
        return ExtractionResult(warnings=["jina_product_identity_mismatch"])

    title_match = re.search(r"^Title:\s*(.+)$", markdown, re.M)
    if not title_match:
        title_match = re.search(r"^#\s+(.+)$", markdown, re.M)
    title = title_match.group(1).strip() if title_match else None
    hostname = urlparse(product_url).hostname or ""
    if title and hostname.endswith("okazii.ro"):
        title = re.sub(r"(?<=\d)\s+\?\s+(?=\d)", " × ", title)
    image_match = _product_image(markdown, product_url)
    price_match = _product_price(markdown, product_url)
    raw_price = next((group for group in price_match.groups() if group), None) if price_match else None
    discount_price = None
    if hostname.endswith("stockx.com"):
        match = re.search(
            r"Buy Now for\s+(?:\n\s*)+##\s*US\$([\d,.]+)",
            markdown,
            re.I,
        )
        raw_price = match.group(1) if match else raw_price
    elif hostname.endswith("takealot.com"):
        match = re.search(r"(?m)^R\s*([\d,]+)\s*$", markdown)
        raw_price = match.group(1) if match else raw_price
    if hostname.endswith("sears.com"):
        prices = _sears_prices(markdown)
        if prices:
            raw_price, discount_price = prices
    currency_match = re.search(
        r"\b(USD|EUR|GBP|RON|RUB|THB|INR|ZAR|KES|KSh|Lei)\b|([$€£₹₽])",
        markdown,
        re.I,
    )
    currency = normalize_currency(currency_match.group(0)) if currency_match else None
    if raw_price and hostname.endswith("stockx.com"):
        currency = "USD"
    elif raw_price and hostname.endswith("takealot.com"):
        currency = "ZAR"
    product = ProductData(
        title=title,
        image=normalize_image_url(image_match.group(1), product_url) if image_match else None,
        price=normalize_price(raw_price),
        discount_price=normalize_price(discount_price),
        has_discount=discount_price is not None,
        currency=currency,
    )
    sources = {
        field: "jina_reader"
        for field, value in product.model_dump().items()
        if value not in (None, False)
    }
    return ExtractionResult(product=product, sources=sources)


def _product_image(markdown: str, product_url: str) -> re.Match[str] | None:
    hostname = urlparse(product_url).hostname or ""
    if hostname.endswith("natureetdecouvertes.com"):
        product_id = next(iter(_identifiers(product_url)), "")
        if product_id:
            match = re.search(
                rf"!\[[^\]]*]\((https?://[^)\s]*/Medias/Images/Articles/{re.escape(product_id)}/[^)\s]+)",
                markdown,
                re.I,
            )
            if match:
                return match
    if hostname.endswith("okazii.ro"):
        product_heading = markdown.lower().rfind("\n# ")
        if product_heading != -1:
            section = markdown[max(0, product_heading - 1_000) : product_heading + 1_500]
            matches = list(
                re.finditer(
                    r"!\[[^\]]*]\((https?://images\.okr\.ro/serve/product/[^)\s]+)",
                    section,
                    re.I,
                )
            )
            if matches:
                return matches[-1]
    if hostname.endswith("sears.com"):
        match = re.search(
            r"!\[[^\]]*]\((https?://c\.shld\.net/[^)\s]+)",
            markdown,
            re.I,
        )
        if match:
            return match
    if hostname.endswith("bidorbuy.co.ke"):
        match = re.search(
            r"!\[[^\]]*]\((https?://bidorbuy\.co\.ke/storage/listings/(?![^)\s]*/thumbs/)[^)\s]+)",
            markdown,
            re.I,
        )
        if match:
            return match
    return re.search(r"!\[[^\]]*]\((https?://[^)\s]+)", markdown)


def _product_price(markdown: str, product_url: str) -> re.Match[str] | None:
    hostname = urlparse(product_url).hostname or ""
    search_text = markdown
    if hostname.endswith(("natureetdecouvertes.com", "okazii.ro", "bidorbuy.co.ke")):
        product_heading = markdown.lower().rfind("\n# ")
        if product_heading != -1:
            search_text = markdown[product_heading : product_heading + 1_500]

    return re.search(
        r"(?:USD|EUR|GBP|RON|RUB|THB|INR|ZAR|KES|KSh|US\$|[$€£₹₽])\s*([\d][\d\s,.]*)"
        r"|([\d][\d\s,.]*)\s*(?:USD|EUR|GBP|RON|RUB|THB|INR|ZAR|KES|KSh|Lei|руб|[$€£₹₽])",
        search_text,
        re.I,
    )


def _sears_prices(markdown: str) -> tuple[str, str] | None:
    product_heading = markdown.lower().rfind("\n# ")
    section = markdown[product_heading:] if product_heading != -1 else markdown
    match = re.search(
        r"~~\s*\$([\d,.]+)[^~]*striked off~~[\s\S]{0,200}?##\s*\$([\d,.]+)",
        section,
        re.I,
    )
    return (match.group(1), match.group(2)) if match else None


def _identifiers(product_url: str) -> set[str]:
    path = urlparse(product_url).path.lower()
    candidates = re.findall(r"[a-z0-9]{5,}", path)
    return {value for value in candidates if any(character.isdigit() for character in value)}
