/**
 * Port of `services/scraper/app/extractors/stores/profiles.py`.
 *
 * Python regexes become JS literals: `title_cleanup` and `image_replacements`
 * used `re.sub` (replace-all, case-insensitive) so they carry `gi`; the
 * `*_regex` fields used `re.search` so they carry `i` only.
 */

export type FieldRule = {
  xpaths: readonly string[];
  attributes?: readonly string[];
};

export const DEFAULT_FIELD_ATTRIBUTES = [
  "content",
  "value",
  "data-price",
  "data-qaprice",
  "src",
] as const;

export type StoreProfile = {
  name: string;
  patterns: readonly string[];
  title: FieldRule;
  currentPrice: FieldRule;
  oldPrice?: FieldRule;
  description?: FieldRule;
  image?: FieldRule;
  currency?: FieldRule;
  defaultCurrency?: string;
  titleCleanup?: readonly RegExp[];
  currentPriceRegex?: readonly RegExp[];
  oldPriceRegex?: readonly RegExp[];
  currencyRegex?: RegExp;
  imageReplacements?: readonly (readonly [RegExp, string])[];
  blockedTitles?: readonly string[];
};

const OG_TITLE: FieldRule = {
  xpaths: ["//meta[@property='og:title']", "//h1[1]", "//title[1]"],
};
const OG_DESCRIPTION: FieldRule = {
  xpaths: ["//meta[@property='og:description']", "//meta[@name='description']"],
};
const OG_IMAGE: FieldRule = {
  xpaths: [
    "//meta[@property='og:image']",
    "//meta[@property='og:image:url']",
    "//*[@itemprop='image'][1]",
  ],
};
const ITEM_PRICE: FieldRule = {
  xpaths: ["//*[@itemprop='price'][1]", "//meta[@property='product:price:amount']"],
};
const ITEM_CURRENCY: FieldRule = {
  xpaths: ["//*[@itemprop='priceCurrency'][1]", "//meta[@property='product:price:currency']"],
};

export const PROFILES: readonly StoreProfile[] = [
  {
    name: "sidelineswap",
    patterns: ["sidelineswap.com"],
    title: OG_TITLE,
    currentPrice: {
      xpaths: ["//*[contains(@class,'text-4xl') and contains(@class,'font-bold')][1]"],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "USD",
    titleCleanup: [/\s*\|\s*SidelineSwap.*$/gi],
  },
  {
    name: "zalora_hk",
    patterns: ["zalora.com.hk"],
    title: { xpaths: ["//*[@data-test-id='productName'][1]", ...OG_TITLE.xpaths] },
    currentPrice: { xpaths: ["//h1//div[contains(@class,'hidden')]/span[2]"] },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "HKD",
    currentPriceRegex: [/"product"\s*:\s*\{[\s\S]{0,600}?"Price"\s*:\s*"([\d.]+)"/i],
  },
  {
    name: "lamoda",
    patterns: ["lamoda.ru"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: [
        "//*[@data-testid='price-current'][1]",
        "//*[contains(@class,'x-premium-product-prices__price')][1]",
        ...ITEM_PRICE.xpaths,
      ],
    },
    oldPrice: {
      xpaths: [
        "//*[@data-testid='price-old'][1]",
        "//*[contains(@class,'x-premium-product-prices__price_old')][1]",
        "//del[1]",
      ],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "RUB",
    titleCleanup: [/\s*[|—-]\s*Lamoda.*$/gi],
  },
  {
    name: "lazada",
    patterns: ["lazada."],
    title: {
      xpaths: ["//h1[contains(@class,'pdp-mod-product-badge-title')][1]", ...OG_TITLE.xpaths],
    },
    currentPrice: {
      xpaths: [
        "//*[contains(@class,'pdp-price_type_normal')][1]",
        "//*[contains(@class,'pdp-price')][1]",
        ...ITEM_PRICE.xpaths,
      ],
    },
    oldPrice: { xpaths: ["//*[contains(@class,'pdp-price_type_deleted')][1]", "//del[1]"] },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "THB",
    blockedTitles: ["lazada"],
  },
  {
    name: "meesho",
    patterns: ["meesho.com"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: [
        "//*[@data-testid='product-price'][1]",
        "//*[contains(@class,'ProductPrice')][1]",
        ...ITEM_PRICE.xpaths,
      ],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "INR",
    titleCleanup: [/\s*\|\s*Meesho$/gi],
  },
  {
    name: "overstock",
    patterns: ["overstock.com"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: ITEM_PRICE,
    oldPrice: { xpaths: ["//del[1]", "//*[contains(@class,'original-price')][1]"] },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "USD",
    titleCleanup: [/\s*[-|]\s*Overstock.*$/gi],
    blockedTitles: ["access denied", "just a moment"],
  },
  {
    name: "emag",
    patterns: ["emag."],
    title: { xpaths: ["//h1[contains(@class,'page-title')][1]", "//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: ["//*[contains(@class,'product-new-price')][1]", ...ITEM_PRICE.xpaths],
    },
    oldPrice: { xpaths: ["//*[contains(@class,'product-old-price')][1]", "//del[1]"] },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "RON",
    blockedTitles: ["javascript is disabled"],
  },
  {
    name: "takealot",
    patterns: ["takealot.com"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "ZAR",
    titleCleanup: [/\s*[-|]\s*Takealot.*$/gi],
    blockedTitles: ["online shopping"],
  },
  {
    name: "cdiscount",
    patterns: ["cdiscount.com"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: ["//*[@id='fpPrice'][1]", "//*[contains(@class,'fpPrice')][1]", ...ITEM_PRICE.xpaths],
    },
    oldPrice: { xpaths: ["//del[1]", "//*[contains(@class,'oldPrice')][1]"] },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "EUR",
    titleCleanup: [/\s*[-|]\s*Cdiscount.*$/gi],
    blockedTitles: ["cdiscount.com"],
  },
  {
    name: "farfetch",
    patterns: ["farfetch.com"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "GBP",
    titleCleanup: [/\s*[-|]\s*FARFETCH.*$/gi],
    blockedTitles: ["register & sign in", "sign in"],
  },
  {
    name: "abebooks",
    patterns: ["abebooks.com"],
    title: { xpaths: ["//h1[@data-test-id='main-heading']", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: [
        "//meta[@itemprop='price']",
        "//*[@id='book-price']",
        "//*[contains(@class,'item-price')][1]",
      ],
    },
    description: OG_DESCRIPTION,
    image: {
      xpaths: ["//img[@data-test-id='feature-image']", "//link[@rel='preload' and @as='image']"],
      attributes: ["src", "href"],
    },
    currency: { xpaths: ["//meta[@itemprop='priceCurrency']"] },
    defaultCurrency: "USD",
  },
  {
    name: "zvab",
    patterns: ["zvab.com"],
    title: { xpaths: ["//*[@data-test-id='book-title'][1]"] },
    currentPrice: { xpaths: ["//meta[@itemprop='price']", "//*[@data-test-id='item-price'][1]"] },
    description: { xpaths: ["//meta[@name='description']"] },
    image: { xpaths: ["//meta[@itemprop='image'][1]"] },
    currency: { xpaths: ["//meta[@itemprop='priceCurrency'][1]"] },
    defaultCurrency: "EUR",
  },
  {
    name: "souq",
    patterns: ["souq.co"],
    title: { xpaths: ["//meta[@property='og:title']"] },
    currentPrice: { xpaths: ["//*[contains(@class,'discounted-unit-price')][1]"] },
    description: OG_DESCRIPTION,
    image: { xpaths: ["//meta[@property='og:image']"] },
    defaultCurrency: "USD",
  },
  {
    name: "avrora",
    patterns: ["avrora.ua"],
    title: { xpaths: ["//h1[1]", "//title[1]"] },
    currentPrice: {
      xpaths: [
        "//*[contains(@class,'ty-price-update')]//*[contains(@class,'ty-price-num')][1]",
        "//*[contains(@class,'ty-price-num')][1]",
        ...ITEM_PRICE.xpaths,
      ],
    },
    oldPrice: {
      xpaths: [
        "//*[contains(@class,'ty-price-old')]//*[contains(@class,'ty-price-num')][1]",
        "//*[contains(@class,'ty-list-price')]//*[contains(@class,'ty-price-num')][1]",
        "//del[1]",
        "//s[1]",
      ],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "UAH",
    titleCleanup: [/\s*\(\d+\)\s*/gi, /\s*[-–|].*$/gi],
  },
  {
    name: "dba",
    patterns: ["dba.dk"],
    title: OG_TITLE,
    currentPrice: { xpaths: ["//p[contains(@class,'h2')][1]"] },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "DKK",
    titleCleanup: [/\s*\|\s*DBA$/gi],
    currentPriceRegex: [/"price\\?"\s*:\s*(\d+)/i],
  },
  {
    name: "ebay",
    patterns: ["ebay."],
    title: {
      xpaths: ["//h1[contains(@class,'x-item-title__mainTitle')]//span[1]", ...OG_TITLE.xpaths],
    },
    currentPrice: {
      xpaths: [
        "//*[contains(@class,'x-price-primary')]//*[contains(@class,'ux-textspans')][1]",
        ...ITEM_PRICE.xpaths,
      ],
    },
    oldPrice: {
      xpaths: [
        "//*[contains(@class,'ux-textspans--STRIKETHROUGH')][1]",
        "//*[contains(@class,'x-price-was')]//*[contains(@class,'ux-textspans')][1]",
      ],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    currency: ITEM_CURRENCY,
    imageReplacements: [[/\/s-l\d+\./gi, "/s-l1600."]],
  },
  {
    name: "epicentr",
    patterns: ["epicentrk.ua"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: ["//*[contains(@class,'product-box__main_price')][1]", ...ITEM_PRICE.xpaths],
    },
    oldPrice: {
      xpaths: [
        "//*[contains(@class,'product-box__main_discount')]//label[1]",
        "//del[1]",
        "//s[1]",
      ],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "UAH",
  },
  {
    name: "flipkart",
    patterns: ["flipkart.com"],
    title: OG_TITLE,
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "INR",
    titleCleanup: [/\s*-\s*Buy\s[\s\S]*$/gi],
    currentPriceRegex: [/(?:Rs\.?|₹)\s*([\d,]+)/i],
    imageReplacements: [[/\/image\/\d+\/\d+\//gi, "/image/1500/1500/"]],
    blockedTitles: ["recaptcha"],
  },
  {
    name: "grailed",
    patterns: ["grailed.com"],
    title: OG_TITLE,
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "USD",
    currentPriceRegex: [/"price"\s*:\s*"?([\d.]+)"?/i],
  },
  {
    name: "hepsiburada",
    patterns: ["hepsiburada.com"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: [
        "//*[@data-test-id='price-current-price'][1]",
        "//*[contains(@class,'current-price')][1]",
        ...ITEM_PRICE.xpaths,
      ],
    },
    oldPrice: {
      xpaths: ["//*[@data-test-id='price-old-price'][1]", "//*[contains(@class,'old-price')][1]"],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "TRY",
  },
  {
    name: "horoshop",
    patterns: ["bujobox.com.ua", "hobymonster.com.ua", "leleka.camp"],
    title: { xpaths: ["//h1[@itemprop='name']", "//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: [
        "//*[@itemprop='price'][1]",
        "//*[contains(@class,'price') and not(contains(@class,'old'))][1]",
      ],
    },
    oldPrice: {
      xpaths: [
        "//*[contains(@class,'old-price')][1]",
        "//*[contains(@class,'price-old')][1]",
        "//del[1]",
      ],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "UAH",
  },
  {
    name: "lelekan",
    patterns: ["lelekan.com.ua"],
    title: { xpaths: ["//h1[@itemprop='name']", "//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: [
        "//*[contains(@class,'product-info')]//*[contains(@class,'price')]//h2[1]",
        "//*[@itemprop='price'][1]",
      ],
    },
    oldPrice: {
      xpaths: [
        "//*[contains(@class,'product-info')]//*[contains(@class,'price')]/span[1]",
        "//*[contains(@class,'old-price')][1]",
      ],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "UAH",
  },
  {
    name: "miinto",
    patterns: ["miinto.com"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    currency: ITEM_CURRENCY,
    currentPriceRegex: [/"salePrice"\s*:\s*"?(\d+)"?/i],
    oldPriceRegex: [/"originalPrice"\s*:\s*"?(\d+)"?/i],
    titleCleanup: [/\s*\|\s*[^|]+\s*\|\s*[\s\S]*$/gi],
  },
  {
    name: "modaoperandi",
    patterns: ["modaoperandi.com"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    currency: ITEM_CURRENCY,
    oldPriceRegex: [/"compareAtPrice"\s*:\s*"?([\d.]+)"?/i],
  },
  {
    name: "octopus",
    patterns: ["octopus.in.ua"],
    title: { xpaths: ["//h1[contains(@class,'cathead')][1]", ...OG_TITLE.xpaths] },
    currentPrice: { xpaths: ["//*[contains(@class,'normalprice')][1]"] },
    oldPrice: { xpaths: ["//*[contains(@class,'oldprice')][1]"] },
    description: { xpaths: ["//*[@id='tab-description']"] },
    image: OG_IMAGE,
    defaultCurrency: "UAH",
  },
  {
    name: "olx",
    patterns: ["olx.ua"],
    title: { xpaths: ["//*[@data-cy='ad_title'][1]", "//title[1]", ...OG_TITLE.xpaths] },
    currentPrice: { xpaths: ["//*[@data-testid='ad-price-container'][1]"] },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "UAH",
    currentPriceRegex: [/:\s*([\d\s.,]+)\s*грн/i],
    titleCleanup: [/:\s*[\d\s.,]+\s*грн[\s\S]*$/gi, /\s*[-–|:][\s\S]*\b(?:на|on)\s*OLX[\s\S]*$/gi],
    imageReplacements: [[/:443\//gi, "/"]],
  },
  {
    name: "prom",
    patterns: ["prom.ua"],
    title: { xpaths: ["//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: ["//*[@data-qaid='product_price'][1]", "//*[contains(@class,'product-price')][1]"],
    },
    oldPrice: {
      xpaths: ["//*[@data-qaid='old_price'][1]", "//*[@data-qaid='product_old_price'][1]"],
    },
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "UAH",
  },
  {
    name: "rubylane",
    patterns: ["rubylane.com"],
    title: OG_TITLE,
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    currency: ITEM_CURRENCY,
    defaultCurrency: "USD",
    titleCleanup: [/\s*:\s*Ruby\s*Lane$/gi],
    blockedTitles: ["page load problem"],
  },
  {
    name: "target",
    patterns: ["target.com"],
    title: { xpaths: ["//h1[@data-test='product-title']", ...OG_TITLE.xpaths] },
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "USD",
    currentPriceRegex: [
      /"current_retail(?:_min)?"\s*:\s*([\d.]+)/i,
      /"formatted_current_price"\s*:\s*"([^"]+)"/i,
    ],
    oldPriceRegex: [
      /"reg_retail(?:_max)?"\s*:\s*([\d.]+)/i,
      /"formatted_comparison_price"\s*:\s*"([^"]+)"/i,
    ],
  },
  {
    name: "trendyol",
    patterns: ["trendyol.com"],
    title: OG_TITLE,
    currentPrice: ITEM_PRICE,
    description: OG_DESCRIPTION,
    image: OG_IMAGE,
    defaultCurrency: "TRY",
    titleCleanup: [/\s*[–—-]\s*(?:[\s\S]*?\s+)?Trendyol[\s\S]*$/gi],
    currentPriceRegex: [
      /"product_discounted_price"\s*:\s*([\d.]+)/i,
      /"product_price"\s*:\s*([\d.]+)/i,
    ],
    oldPriceRegex: [/"product_original_price"\s*:\s*([\d.]+)/i],
    currencyRegex: /"currency"\s*:\s*"([A-Z]{3})"/i,
  },
  {
    name: "ua-tao",
    patterns: ["ua-tao.com"],
    title: { xpaths: ["//main//h1[1]", "//h1[1]", ...OG_TITLE.xpaths] },
    currentPrice: {
      xpaths: ["//*[@id='price'][1]", "//input[@name='price'][1]", ...ITEM_PRICE.xpaths],
    },
    description: OG_DESCRIPTION,
    image: {
      xpaths: [
        "//*[@id='image-slider']//img[1]",
        "//input[@id='item_data'][1]",
        ...OG_IMAGE.xpaths,
      ],
      attributes: ["src", "content"],
    },
    defaultCurrency: "UAH",
    titleCleanup: [/\s*-\s*[\d\s.,]+\s*грн\.?\s*$/gi],
  },
];
