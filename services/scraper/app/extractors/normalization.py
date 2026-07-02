import html as html_module
import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin, urlparse


_CURRENCY_ALIASES = {
    "$": "USD",
    "US$": "USD",
    "USD": "USD",
    "€": "EUR",
    "EUR": "EUR",
    "£": "GBP",
    "GBP": "GBP",
    "₴": "UAH",
    "ГРН": "UAH",
    "UAH": "UAH",
    "₺": "TRY",
    "TL": "TRY",
    "TRY": "TRY",
    "₽": "RUB",
    "RUB": "RUB",
    "ZŁ": "PLN",
    "PLN": "PLN",
    "KR": "DKK",
    "DKK": "DKK",
    "CAD": "CAD",
    "AU$": "AUD",
    "AUD": "AUD",
    "INR": "INR",
    "₹": "INR",
}


def clean_text(value: object) -> str | None:
    if value is None:
        return None
    text = html_module.unescape(str(value))
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def normalize_currency(value: object) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    upper = text.upper().replace(".", "")
    return _CURRENCY_ALIASES.get(upper, upper if re.fullmatch(r"[A-Z]{3}", upper) else None)


def normalize_price(value: object) -> str | None:
    text = clean_text(value)
    if not text:
        return None

    compact = re.sub(r"[^\d,.\-]", "", text)
    if not compact or not re.search(r"\d", compact):
        return None

    last_comma = compact.rfind(",")
    last_dot = compact.rfind(".")
    if last_comma >= 0 and last_dot >= 0:
        decimal_separator = "," if last_comma > last_dot else "."
        thousands_separator = "." if decimal_separator == "," else ","
        compact = compact.replace(thousands_separator, "").replace(decimal_separator, ".")
    elif last_comma >= 0:
        fractional_digits = len(compact) - last_comma - 1
        compact = compact.replace(",", "." if fractional_digits in {1, 2} else "")
    elif last_dot >= 0:
        fractional_digits = len(compact) - last_dot - 1
        if fractional_digits not in {1, 2}:
            compact = compact.replace(".", "")

    try:
        number = Decimal(compact)
    except InvalidOperation:
        return None
    if not number.is_finite() or number <= 0:
        return None

    normalized = format(number.normalize(), "f")
    if "." in normalized:
        normalized = normalized.rstrip("0").rstrip(".")
    return normalized


def normalize_image_url(value: object, page_url: str) -> str | None:
    text = clean_text(value)
    if not text or text.startswith(("data:", "javascript:")):
        return None
    # Some storefronts accidentally prepend a second scheme, for example
    # `https:https://cdn.example/image.jpg`. Keep the real absolute URL
    # instead of rejecting the otherwise valid product image.
    text = re.sub(r"^(https?):(?:https?:)+//", r"\1://", text, flags=re.I)
    absolute = urljoin(page_url, text)
    parsed = urlparse(absolute)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return absolute


def normalize_discount(
    price: str | None,
    discount_price: str | None,
) -> tuple[str | None, str | None, bool]:
    normalized_price = normalize_price(price)
    normalized_discount = normalize_price(discount_price)
    if not normalized_price or not normalized_discount:
        return normalized_price or normalized_discount, None, False

    regular = Decimal(normalized_price)
    discounted = Decimal(normalized_discount)
    if regular == discounted:
        return normalized_price, None, False
    if discounted > regular:
        normalized_price, normalized_discount = normalized_discount, normalized_price
    return normalized_price, normalized_discount, True
