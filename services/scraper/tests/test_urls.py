from app.urls import canonicalize_product_url


def test_aliexpress_canonical_url_keeps_matching_sku_price_context() -> None:
    url = (
        "https://www.aliexpress.com/item/1005009812127841.html"
        "?pdp_ext_f=%7B%22sku_id%22%3A%2212000050249700869%22%7D"
        "&pdp_npi=6%40dis%21USD%2123.64%219.93%21%21%21%2112000050249700869"
        "&spm=tracking"
    )

    canonical = canonicalize_product_url(url)

    assert "sku_id=12000050249700869" in canonical
    assert "pdp_npi=" in canonical
    assert "spm=" not in canonical


def test_aliexpress_canonical_url_drops_unrelated_price_context() -> None:
    url = (
        "https://www.aliexpress.com/item/1005009812127841.html"
        "?sku_id=12000050249700869"
        "&pdp_npi=6%40dis%21USD%2123.64%219.93%21%21%21%219999999999"
    )

    canonical = canonicalize_product_url(url)

    assert "sku_id=12000050249700869" in canonical
    assert "pdp_npi=" not in canonical
