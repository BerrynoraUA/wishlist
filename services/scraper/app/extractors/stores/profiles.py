from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class FieldRule:
    xpaths: tuple[str, ...]
    attributes: tuple[str, ...] = ("content", "value", "data-price", "data-qaprice", "src")


@dataclass(frozen=True, slots=True)
class StoreProfile:
    name: str
    patterns: tuple[str, ...]
    title: FieldRule
    current_price: FieldRule
    old_price: FieldRule | None = None
    description: FieldRule | None = None
    image: FieldRule | None = None
    currency: FieldRule | None = None
    default_currency: str | None = None
    title_cleanup: tuple[str, ...] = ()
    current_price_regex: tuple[str, ...] = ()
    old_price_regex: tuple[str, ...] = ()
    currency_regex: str | None = None
    image_replacements: tuple[tuple[str, str], ...] = ()
    blocked_titles: tuple[str, ...] = ()


OG_TITLE = FieldRule(("//meta[@property='og:title']", "//h1[1]", "//title[1]"))
OG_DESCRIPTION = FieldRule(
    ("//meta[@property='og:description']", "//meta[@name='description']")
)
OG_IMAGE = FieldRule(
    (
        "//meta[@property='og:image']",
        "//meta[@property='og:image:url']",
        "//*[@itemprop='image'][1]",
    )
)
ITEM_PRICE = FieldRule(
    (
        "//*[@itemprop='price'][1]",
        "//meta[@property='product:price:amount']",
    )
)
ITEM_CURRENCY = FieldRule(
    (
        "//*[@itemprop='priceCurrency'][1]",
        "//meta[@property='product:price:currency']",
    )
)


PROFILES: tuple[StoreProfile, ...] = (
    StoreProfile(
        name="lamoda",
        patterns=("lamoda.ru",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=FieldRule((
            "//*[@data-testid='price-current'][1]",
            "//*[contains(@class,'x-premium-product-prices__price')][1]",
        ) + ITEM_PRICE.xpaths),
        old_price=FieldRule((
            "//*[@data-testid='price-old'][1]",
            "//*[contains(@class,'x-premium-product-prices__price_old')][1]",
            "//del[1]",
        )),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="RUB",
        title_cleanup=(r"\s*[|—-]\s*Lamoda.*$",),
    ),
    StoreProfile(
        name="lazada",
        patterns=("lazada.",),
        title=FieldRule(("//h1[contains(@class,'pdp-mod-product-badge-title')][1]",) + OG_TITLE.xpaths),
        current_price=FieldRule((
            "//*[contains(@class,'pdp-price_type_normal')][1]",
            "//*[contains(@class,'pdp-price')][1]",
        ) + ITEM_PRICE.xpaths),
        old_price=FieldRule((
            "//*[contains(@class,'pdp-price_type_deleted')][1]",
            "//del[1]",
        )),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="THB",
        blocked_titles=("lazada",),
    ),
    StoreProfile(
        name="meesho",
        patterns=("meesho.com",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=FieldRule((
            "//*[@data-testid='product-price'][1]",
            "//*[contains(@class,'ProductPrice')][1]",
        ) + ITEM_PRICE.xpaths),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="INR",
        title_cleanup=(r"\s*\|\s*Meesho$",),
    ),
    StoreProfile(
        name="overstock",
        patterns=("overstock.com",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=ITEM_PRICE,
        old_price=FieldRule(("//del[1]", "//*[contains(@class,'original-price')][1]")),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="USD",
        title_cleanup=(r"\s*[-|]\s*Overstock.*$",),
        blocked_titles=("access denied", "just a moment"),
    ),
    StoreProfile(
        name="emag",
        patterns=("emag.",),
        title=FieldRule(("//h1[contains(@class,'page-title')][1]", "//h1[1]") + OG_TITLE.xpaths),
        current_price=FieldRule((
            "//*[contains(@class,'product-new-price')][1]",
        ) + ITEM_PRICE.xpaths),
        old_price=FieldRule((
            "//*[contains(@class,'product-old-price')][1]",
            "//del[1]",
        )),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="RON",
        blocked_titles=("javascript is disabled",),
    ),
    StoreProfile(
        name="takealot",
        patterns=("takealot.com",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="ZAR",
        title_cleanup=(r"\s*[-|]\s*Takealot.*$",),
        blocked_titles=("online shopping",),
    ),
    StoreProfile(
        name="cdiscount",
        patterns=("cdiscount.com",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=FieldRule((
            "//*[@id='fpPrice'][1]",
            "//*[contains(@class,'fpPrice')][1]",
        ) + ITEM_PRICE.xpaths),
        old_price=FieldRule(("//del[1]", "//*[contains(@class,'oldPrice')][1]")),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="EUR",
        title_cleanup=(r"\s*[-|]\s*Cdiscount.*$",),
        blocked_titles=("cdiscount.com",),
    ),
    StoreProfile(
        name="farfetch",
        patterns=("farfetch.com",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="GBP",
        title_cleanup=(r"\s*[-|]\s*FARFETCH.*$",),
        blocked_titles=("register & sign in", "sign in"),
    ),
    StoreProfile(
        name="abebooks",
        patterns=("abebooks.com",),
        title=FieldRule(("//h1[@data-test-id='main-heading']",) + OG_TITLE.xpaths),
        current_price=FieldRule(
            ("//meta[@itemprop='price']", "//*[@id='book-price']", "//*[contains(@class,'item-price')][1]")
        ),
        description=OG_DESCRIPTION,
        image=FieldRule(
            (
                "//img[@data-test-id='feature-image']",
                "//link[@rel='preload' and @as='image']",
            ),
            ("src", "href"),
        ),
        currency=FieldRule(("//meta[@itemprop='priceCurrency']",)),
        default_currency="USD",
    ),
    StoreProfile(
        name="avrora",
        patterns=("avrora.ua",),
        title=FieldRule(("//h1[1]", "//title[1]")),
        current_price=FieldRule(
            (
                "//*[contains(@class,'ty-price-update')]//*[contains(@class,'ty-price-num')][1]",
                "//*[contains(@class,'ty-price-num')][1]",
            )
            + ITEM_PRICE.xpaths
        ),
        old_price=FieldRule(
            (
                "//*[contains(@class,'ty-price-old')]//*[contains(@class,'ty-price-num')][1]",
                "//*[contains(@class,'ty-list-price')]//*[contains(@class,'ty-price-num')][1]",
                "//del[1]",
                "//s[1]",
            )
        ),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="UAH",
        title_cleanup=(r"\s*\(\d+\)\s*", r"\s*[-–|].*$"),
    ),
    StoreProfile(
        name="dba",
        patterns=("dba.dk",),
        title=OG_TITLE,
        current_price=FieldRule(("//p[contains(@class,'h2')][1]",)),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="DKK",
        title_cleanup=(r"\s*\|\s*DBA$",),
        current_price_regex=(r'"price\\?"\s*:\s*(\d+)',),
    ),
    StoreProfile(
        name="ebay",
        patterns=("ebay.",),
        title=FieldRule(
            ("//h1[contains(@class,'x-item-title__mainTitle')]//span[1]",) + OG_TITLE.xpaths
        ),
        current_price=FieldRule(
            (
                "//*[contains(@class,'x-price-primary')]//*[contains(@class,'ux-textspans')][1]",
            )
            + ITEM_PRICE.xpaths
        ),
        old_price=FieldRule(
            (
                "//*[contains(@class,'ux-textspans--STRIKETHROUGH')][1]",
                "//*[contains(@class,'x-price-was')]//*[contains(@class,'ux-textspans')][1]",
            )
        ),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        currency=ITEM_CURRENCY,
        image_replacements=((r"/s-l\d+\.", "/s-l1600."),),
    ),
    StoreProfile(
        name="epicentr",
        patterns=("epicentrk.ua",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=FieldRule(
            ("//*[contains(@class,'product-box__main_price')][1]",) + ITEM_PRICE.xpaths
        ),
        old_price=FieldRule(
            (
                "//*[contains(@class,'product-box__main_discount')]//label[1]",
                "//del[1]",
                "//s[1]",
            )
        ),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="UAH",
    ),
    StoreProfile(
        name="flipkart",
        patterns=("flipkart.com",),
        title=OG_TITLE,
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="INR",
        title_cleanup=(r"\s*-\s*Buy\s.*$",),
        current_price_regex=(r"(?:Rs\.?|₹)\s*([\d,]+)",),
        image_replacements=((r"/image/\d+/\d+/", "/image/1500/1500/"),),
        blocked_titles=("recaptcha",),
    ),
    StoreProfile(
        name="grailed",
        patterns=("grailed.com",),
        title=OG_TITLE,
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="USD",
        current_price_regex=(r'"price"\s*:\s*"?([\d.]+)"?',),
    ),
    StoreProfile(
        name="hepsiburada",
        patterns=("hepsiburada.com",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=FieldRule(
            (
                "//*[@data-test-id='price-current-price'][1]",
                "//*[contains(@class,'current-price')][1]",
            )
            + ITEM_PRICE.xpaths
        ),
        old_price=FieldRule(
            (
                "//*[@data-test-id='price-old-price'][1]",
                "//*[contains(@class,'old-price')][1]",
            )
        ),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="TRY",
    ),
    StoreProfile(
        name="horoshop",
        patterns=("bujobox.com.ua", "hobymonster.com.ua", "leleka.camp"),
        title=FieldRule(("//h1[@itemprop='name']", "//h1[1]") + OG_TITLE.xpaths),
        current_price=FieldRule(
            (
                "//*[@itemprop='price'][1]",
                "//*[contains(@class,'price') and not(contains(@class,'old'))][1]",
            )
        ),
        old_price=FieldRule(
            (
                "//*[contains(@class,'old-price')][1]",
                "//*[contains(@class,'price-old')][1]",
                "//del[1]",
            )
        ),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="UAH",
    ),
    StoreProfile(
        name="lelekan",
        patterns=("lelekan.com.ua",),
        title=FieldRule(("//h1[@itemprop='name']", "//h1[1]") + OG_TITLE.xpaths),
        current_price=FieldRule(
            (
                "//*[contains(@class,'product-info')]"
                "//*[contains(@class,'price')]//h2[1]",
                "//*[@itemprop='price'][1]",
            )
        ),
        old_price=FieldRule(
            (
                "//*[contains(@class,'product-info')]"
                "//*[contains(@class,'price')]/span[1]",
                "//*[contains(@class,'old-price')][1]",
            )
        ),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="UAH",
    ),
    StoreProfile(
        name="miinto",
        patterns=("miinto.com",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        currency=ITEM_CURRENCY,
        current_price_regex=(r'"salePrice"\s*:\s*"?(\d+)"?',),
        old_price_regex=(r'"originalPrice"\s*:\s*"?(\d+)"?',),
        title_cleanup=(r"\s*\|\s*[^|]+\s*\|\s*.*$",),
    ),
    StoreProfile(
        name="modaoperandi",
        patterns=("modaoperandi.com",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        currency=ITEM_CURRENCY,
        old_price_regex=(r'"compareAtPrice"\s*:\s*"?([\d.]+)"?',),
    ),
    StoreProfile(
        name="octopus",
        patterns=("octopus.in.ua",),
        title=FieldRule(("//h1[contains(@class,'cathead')][1]",) + OG_TITLE.xpaths),
        current_price=FieldRule(("//*[contains(@class,'normalprice')][1]",)),
        old_price=FieldRule(("//*[contains(@class,'oldprice')][1]",)),
        description=FieldRule(("//*[@id='tab-description']",)),
        image=OG_IMAGE,
        default_currency="UAH",
    ),
    StoreProfile(
        name="olx",
        patterns=("olx.ua",),
        title=FieldRule(("//*[@data-cy='ad_title'][1]", "//title[1]") + OG_TITLE.xpaths),
        current_price=FieldRule(("//*[@data-testid='ad-price-container'][1]",)),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="UAH",
        current_price_regex=(r":\s*([\d\s.,]+)\s*грн",),
        title_cleanup=(r":\s*[\d\s.,]+\s*грн.*$", r"\s*[-–|:].*\b(?:на|on)\s*OLX.*$"),
        image_replacements=((r":443/", "/"),),
    ),
    StoreProfile(
        name="prom",
        patterns=("prom.ua",),
        title=FieldRule(("//h1[1]",) + OG_TITLE.xpaths),
        current_price=FieldRule(
            ("//*[@data-qaid='product_price'][1]", "//*[contains(@class,'product-price')][1]")
        ),
        old_price=FieldRule(
            (
                "//*[@data-qaid='old_price'][1]",
                "//*[@data-qaid='product_old_price'][1]",
            )
        ),
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="UAH",
    ),
    StoreProfile(
        name="rubylane",
        patterns=("rubylane.com",),
        title=OG_TITLE,
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        currency=ITEM_CURRENCY,
        default_currency="USD",
        title_cleanup=(r"\s*:\s*Ruby\s*Lane$",),
        blocked_titles=("page load problem",),
    ),
    StoreProfile(
        name="target",
        patterns=("target.com",),
        title=FieldRule(("//h1[@data-test='product-title']",) + OG_TITLE.xpaths),
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="USD",
        current_price_regex=(
            r'"current_retail(?:_min)?"\s*:\s*([\d.]+)',
            r'"formatted_current_price"\s*:\s*"([^"]+)"',
        ),
        old_price_regex=(
            r'"reg_retail(?:_max)?"\s*:\s*([\d.]+)',
            r'"formatted_comparison_price"\s*:\s*"([^"]+)"',
        ),
    ),
    StoreProfile(
        name="trendyol",
        patterns=("trendyol.com",),
        title=OG_TITLE,
        current_price=ITEM_PRICE,
        description=OG_DESCRIPTION,
        image=OG_IMAGE,
        default_currency="TRY",
        title_cleanup=(r"\s*[–—-]\s*(?:.*?\s+)?Trendyol.*$",),
        current_price_regex=(
            r'"product_discounted_price"\s*:\s*([\d.]+)',
            r'"product_price"\s*:\s*([\d.]+)',
        ),
        old_price_regex=(r'"product_original_price"\s*:\s*([\d.]+)',),
        currency_regex=r'"currency"\s*:\s*"([A-Z]{3})"',
    ),
    StoreProfile(
        name="ua-tao",
        patterns=("ua-tao.com",),
        title=FieldRule(("//main//h1[1]", "//h1[1]") + OG_TITLE.xpaths),
        current_price=FieldRule(
            (
                "//*[@id='price'][1]",
                "//input[@name='price'][1]",
            )
            + ITEM_PRICE.xpaths
        ),
        description=OG_DESCRIPTION,
        image=FieldRule(
            (
                "//*[@id='image-slider']//img[1]",
                "//input[@id='item_data'][1]",
            )
            + OG_IMAGE.xpaths,
            ("src", "content"),
        ),
        default_currency="UAH",
        title_cleanup=(r"\s*-\s*[\d\s.,]+\s*грн\.?\s*$",),
    ),
)
