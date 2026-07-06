import json
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit


def canonicalize_product_url(value: str) -> str:
    parts = urlsplit(value)
    hostname = (parts.hostname or "").lower()
    if "aliexpress." in hostname and parts.path.startswith("/item/"):
        query = parse_qs(parts.query)
        sku_id = (query.get("sku_id") or [None])[0]
        if not sku_id:
            product_context = (query.get("pdp_ext_f") or [None])[0]
            if product_context:
                try:
                    payload = json.loads(product_context)
                except (json.JSONDecodeError, TypeError):
                    payload = {}
                candidate = payload.get("sku_id") if isinstance(payload, dict) else None
                if candidate is not None:
                    sku_id = str(candidate)
        canonical_params: dict[str, str] = {}
        if sku_id:
            canonical_params["sku_id"] = sku_id
        price_context = (query.get("pdp_npi") or [None])[0]
        if price_context and sku_id and sku_id in price_context:
            canonical_params["pdp_npi"] = price_context
        canonical_query = urlencode(canonical_params)
        return urlunsplit(
            (parts.scheme, parts.netloc, parts.path, canonical_query, "")
        )
    return value
