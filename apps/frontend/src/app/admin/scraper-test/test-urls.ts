import acceptanceCriteria from "./acceptance-criteria.json";

/**
 * Список тест-кейсів для тестування скрапера.
 * Кожен кейс містить URL та очікувані значення для валідації.
 * Якщо поле expected = null — воно не перевіряється.
 *
 * Очікувані значення для конкретних URL зберігаються в acceptance-criteria.json
 * і автоматично застосовуються до відповідних записів нижче.
 */
export interface TestCase {
  url: string;
  expected: {
    title: string | null;
    price: string | null;
    image: string | null;
    description: string | null;
  };
}

const ACCEPTANCE_CRITERIA: Map<string, TestCase["expected"]> = new Map(
  (acceptanceCriteria as TestCase[]).map((c) => [c.url, c.expected]),
);

const RAW_TEST_CASES: TestCase[] = [
  {
    url: "https://www.amazon.com/Z-Edge-Monitor-Ultra-Fast-UG27H-Frameless/dp/B0DXKZZF9B/ref=sr_1_2_sspa?dib=eyJ2IjoiMSJ9.vXjaZ5LQ60nRmS_W_8Noo5EbjU0g5iDcpTDcuW-x0Ai4TsnH_52c6EQnFilOgEOw7lyeqG8fciuEJz5pU5M8FhOr106LXyJF0vREN39JZpvD-Tx36TnnU8LbgdJilZYcQEmjVvB2dItfC_QTgAzNJMWitddbBBMKv-MDM3e5_33TkRf7KyOgbmhsPgumqkU7i9ZiNTFyM9IpszjkbL6zsDzR-qNDgw-BdF7pgLs_tSJpMon1Ccx2x5tvTpJdtDA_b14fOPOJCnaeWPoa_M54XCfwH4CVI2mVRCX8aMT-AZA.GUnhwbskjvWrgc_aemTfL2vPCWGkY5eZ49U6NZtYZ9c&dib_tag=se&qid=1775680156&s=computers-intl-ship&sr=1-2-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGZfYnJvd3Nl&th=1",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.ebay.com/itm/356259697556?var=625249480255&itmmeta=01KNQCVPJBF7CHVRDS8M3NAQG8&hash=item52f2bb9394:g:PuwAAOSwtIlnNgB8&itmprp=enc%3AAQALAAAA4Hkk9oQdLPf26rRUt0UxvIvOt4d4qLWJYWGxSY%2FvgQnJOslN2yYD9hJVTbmfBDWXh5LfjeSC84tLbQJRJP%2BaONbJYjLEx2k2Qrwd6qDhH9f5UktGs3Py3eVUxa5%2FPLGZtNWymJb7XdhusiVofkU1%2Ba8R0v0Ed4GYdjTEydmH3jX5lVl7WrOMz%2FANaYjvlKHVpgNHXc45zldh%2BFtxPZryfEQrKbNGcI%2BeawEv4ymkUbK%2F1%2BT9CqKBqdyGs8a1oGi9bKTti18snk8OmP7vFmTaPhx7QS5QPtruXSKi6Vs5A6vI%7Ctkp%3ABk9SR7jp7uytZw",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.aliexpress.com/item/1005009812127841.html?pvid=de301d73-401e-4819-8c9d-0958efed2202&pdp_ext_f=%7B%22ship_from%22:%22CN%22,%22sku_id%22:%2212000050249700869%22%7D&scm=1007.45714.362894.0&scm-url=1007.45714.362894.0&scm_id=1007.45714.362894.0&pdp_npi=6%40dis%21UAH%21165%2C59%20%D0%B3%D1%80%D0%BD.%2169%2C54%20%D0%B3%D1%80%D0%BD.%21%21%2123.64%219.93%21%402103956a17756808832358187e85bf%2112000050249700869%21gdf%21UA%21%21X%211%210%21n_tag%3A-29910%3Bd%3A2567c2da%3Bm03_new_user%3A-29895%3BpisId%3A5000000203279194&mainPicRatio=1&spm=a2g0o.tm1000016012.5810419720.d2&aecmd=true",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.etsy.com/listing/1403146486/handmade-ramadan-garland-felt-crescent?external=1&ref=hp_consolidated_gifting_listings-2&sr_prefetch=1&pf_from=home_non_recs&sts=1&logging_key=0f3f37222f75df8dc41c11ed0b16861fcacfe406%3A1403146486",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://ua-tao.com/ua/item/744686348106",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.wildberries.ru/catalog/412803412/detail.aspx?targetUrl=MI",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.trendyol.com/uk/deepsence/chorna-oversayz-basketbolna-futbolka-p-1128135535?boutiqueId=61",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.target.com/p/shark-rocket-ultra-light-corded-stick-vacuum/-/A-95006512?preselect=94779672#lnk=sametab",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.flipkart.com/clothology-cotton-double-flat-144-tc-jaipuri-prints-1-bedsheet-2-pillow-covers/p/itmf55284f38bfdf?pid=BDSFWGF93RZRG6RK&lid=LSTBDSFWGF93RZRG6RKZLELHB&marketplace=FLIPKART&store=jra&srno=b_1_2&otracker=browse&fm=neo%2Fmerchandising&iid=en__7tc_vrSsNTnsR6r7ZtLMmd1fUomLZEA2e6y9zrXnBV7sM3p2kjFHpkZY4XmW1Pd7ji3V8vu0mv1uU_w9R8edQ%3D%3D&ppt=clp&ppn=home-kitchen-25-at-store&ssid=5jhhgyg47k0000001775681381797&ov_redirect=true&ov_redirect=true",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://allegro.pl/oferta/frytkownica-beztluszczowa-frytownica-air-fryer-separator-4l-14778181626",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.zalando.sk/nike-performance-everyday-cush-crew-3-pack-sportove-ponozky-blackwhite-n1244d06l-q11.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.tokopedia.com/pose-shoes-idn/earthly-allure-live-streaming-pose-cloud-bounce-cat-paw-sandal-anti-selip-nyaman-elastis-materi-eva-cocok-untuk-aktivitas-di-dalam-dan-luar-unisex-home-living-2025-68101-1731699052112479870?t_id=1775681555863&t_st=1&t_pp=homepage&t_efo=pure_goods_card&t_ef=homepage&t_sm=rec_homepage_outer_flow&t_spt=homepage",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.lazada.co.th/products/pdp-i160552266-s193339147.html?&scm=1007.17760.398138.0&pvid=2f6d12cb-306f-4bc8-8d90-35363c9dfb8d&search=flashsale?search=1&mp=1&c=fs&clickTrackInfo=rs%3A0.0%3Bfs_item_discount_price%3A969.00%3Bitem_id%3A160552266%3Bpctr%3A0.0%3Bcalib_pctr%3A0.0%3Bvoucher_price%3A969%3Bmt%3Ahot%3Bpromo_price%3A969%3Bfs_utdid%3A-1%3Bfs_item_sold_cnt%3A59%3Babid%3A398138%3Bfs_item_price%3A1276.00%3Bpvid%3A2f6d12cb-306f-4bc8-8d90-35363c9dfb8d%3Bfs_min_price_l30d%3A0%3Bdata_type%3Aflashsale%3Bis_nep_hot%3A0%3Bfs_pvid%3A2f6d12cb-306f-4bc8-8d90-35363c9dfb8d%3Btime%3A1775681618%3Bfs_biz_type%3Afs%3Bscm%3A1007.17760.398138.%3Bchannel_id%3A0000%3Bfs_item_discount%3A24%25%3Bcampaign_id%3A355457&scm=1007.17760.398138.0",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.wayfair.com/furniture/pdp/wrought-studio-472-led-coffee-table-with-storage-smart-coffee-table-with-wireless-charging-and-bluetooth-speaker-2-tier-high-gloss-marble-pattern-modern-coffee-table-for-living-room-w117891591.html?piid=1468129979",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.mercari.com/us/item/m92781892091/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.hepsiburada.com/shaver-500-serisi-s591-05-islak-ve-kuru-elektrikli-kompakt-tiras-makinesi-p-HBCV0000AF62HL",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.americanas.com.br/kit-shampoo-350ml-e-condicionador-150ml-dove-bond-intense-repair-7501662710/p",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.vinted.com/items/8601148335-vintage-the-sak-distressed-leather-crossbody-bag?homepage_session_id=7f014652-1947-4d3f-bd51-822783973055",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.bol.com/nl/nl/p/giorgio-armani-acqua-di-gioia-30ml-eau-de-parfum/9200000010670730/?promo=main_860_deals_for_you___product_1_9200000010670730&cid=1775681870235-2547469958054&bltgh=b795852a-7ae7-43e8-a0d7-464bb8ebf49e.topDealsForYou.product-tile-9200000010670730.ProductTitle&promo=main_860_deals_for_you___product_1_9200000010670730",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.kaufland.it/product/220946881/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.asos.com/new-balance/new-balance-boston-city-run-t-shirt-in-dark-green/prd/209035766#colourWayId-209035776",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.myntra.com/bra/dressberry/dressberry-bra-full-coverage/41155651/buy",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://falabella.com.ua/index.php?route=product/product&product_id=97",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.otto.de/p/mans-world-sweatjacke-stehkragen-und-dezentem-logodruck-1893718482/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.discogs.com/release/36638488-Fabiano-do-Nascimento-Vittor-Santos-Orquestra-Vila",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://poshmark.com/listing/Free-People-Feeling-Groovy-Bohemian-Floral-Drop-Waist-Maxi-Dress-Size-L-69bbe755b142f35093c067f1",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.decathlon.co.uk/p/kids-20-6-9-years-mountain-bike-expl-500-black/337823/c1c132m8733720",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://zozo.jp/shop/onitsukatiger/goods/102816448/?did=167744187&rid=1203",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.marktplaats.nl/v/computers-en-software/routers-en-modems/m2386534106-asus-router",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.emag.ro/telefon-mobil-samsung-galaxy-s26-ultra-dual-sim-12gb-ram-512gb-5g-cobalt-violet-sm-s948bzvgeue/pd/DGWGTB2BM/?ref=profiled_categories_home_all_first_ml_1_2&provider=rec&recid=rec_106_ad6b4975a4629bca5efe0bb816d50b3697ab1484363d2adf425a82a0705389b2_1775683942&scenario_ID=106",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://patriciawolf.bandcamp.com/album/music-to-watch-seeds-grow-by-009-patricia-wolf-yarrow",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.dafiti.com.co/Tenis-Lifestyle-Blanco-Negro-Plateado-Nike-Initiator-1437678.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.overstock.com/Home-Garden/SAFAVIEH-Tori-Antiqued-Tufted-Brown-Club-Chair-28-x-34.4-x-32.7-.-28-W-x-34-D-x-33-H/43061862/product.html?refccid=46MD7YHTQNCIZEF33CLO6QJDEY&searchidx=0",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "http://farfetch.com/uk/shopping/men/gucci-lunetta-striped-shoulder-bag-item-35491510.aspx",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.laredoute.ru/ppdp/prod-350176363.aspx",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://extra.in.ua/ru/rozkladne-krislo-lizhko-z-podushkoiu-leobro-sire-fcb-s08/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://shophouzz.com/products/jerdon-lighted-mirror-direct-wire-nickel-prvw-vr-22409632",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.barnesandnoble.com/w/game-on-navessa-allen/1148120629?ean=9781638934561",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.manomano.fr/p/robot-de-piscine-airrobo-cp02-6000-lph-puissant-autonomie-de-120-minutes-fonction-dauto-stationnement-94400369",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.cdiscount.com/jardin/outillage-de-jardin/mammotion-luba-mini-awd-lidar-robot-tondeuse-sans/f-1632601-aaaxs16573.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.meesho.com/frekman-stylish-cotton-blend-check-mens-shirt-pack-of-1/p/1kv4b",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.n11.com/urun/sleepy-bio-natural-premium-plus-gross-paket-bebek-bezi-5-numara-junior-200-adet-59084254?magaza=sleepy",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.netshoes.com.br/p/camisa-botafogo-i-2526-sn-torcedor-reebok-masculina-D19-809O-028",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.fnac.com/TV-OLED-Samsung-TQ55S90F-140-cm-4K-UHD-2025/a21545213/w-4#int=S:PFreco|PF|56328|21545213|BL3|L1",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://stockx.com/en-gb/nike-fc-barcelona-2005-06-ronaldinho-10-home-jersey-multicolor",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.qoo10.jp/item/BYY%e3%82%b3%e3%83%a9%e3%83%9c-GIFT%e4%bb%98-AGE-R%e3%83%96%e3%83%bc%e3%82%b9%e3%82%bf%e3%83%bc%e3%83%97%e3%83%adX2-1%e5%8f%b06%e5%bd%b9%e9%ab%98%e7%b4%9a%e3%82%a8%e3%82%b9%e3%83%86%e3%82%b1%e3%82%a2-%e7%be%8e%e9%a1%94%e5%99%a8/1083259765?ga_priority=-1&ga_prdlist=bestseller&ga_tid=&ga_idx=1",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.newegg.com/p/3D5-006G-00047?Item=9SIC01CKPK0373&cm_sp=Homepage_SS-_-P3_9SIC01CKPK0373-_-04082026",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://reverb.com/uk/item/94690136-line-6-pod-guitar-processor-red-fair?bk=eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJjNTAwMTcyOC0wZDBjLTQwNTktOGIwMi02ZjFlZGU3MjU4NzEiLCJpYXQiOjE3NzU2ODY2MzcsInVzZXJfaWQiOiIiLCJzZXNzaW9uX2lkIjoiOTcxOThiZTMtYTFlYy00ZDEyLTljMGYtMzE0MWVmNWE5ZWFiIiwiY29va2llX2lkIjoiMGY3OTQxODItN2RiMi00ZTE5LTkzNzEtMTBjM2ZkYTQ5NGE3IiwicHJvZHVjdF9pZCI6Ijk0NjkwMTM2Iiwic291cmNlIjoiTk9ORSJ9.ZHflLbrPksWDhPdtuMS213RBcAak8uI7EvRGvBM1GVg",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.trademe.co.nz/a/marketplace/home-living/lamps/floor-lamps/listing/5865596237",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.bestbuy.ca/en-ca/product/apple-airpods-pro-3-noise-cancelling-true-wireless-earbuds-with-magsafe-charging-case/19451577?icmp=Recos_3across_tp_sllng_prdcts_plp&referrer=PLP+Top+Seller0",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.noon.com/uae-en/galaxy-s26-ultra-dual-sim-black-12gb-ram-512gb-5g-middle-east-version/N70283859V/p/?o=b282326d7369c80c&shareId=774830ca-174b-4925-a15c-e002f7271fbb",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.gunbroker.com/item/1158247715",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.lamoda.ru/p/ad002emiypi1/clothes-adidas-bryuki-sportivnye/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.fruugo.co.uk/handmade-cow-leather-wallet-hand-purse-soft-drawstring-storage-bag-coin-purse/p-449188675-944870516",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://tiki.in.ua/gorenje-ftg-30-smv9.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.darty.com/nav/achat/informatique/ordinateur_portable-portable/portable/samsung_np750xqb_qlc_16_512.html#dartyclic=H_MFA_2_8096538",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.abebooks.com/products/isbn/9780593135228?ref_=gw_1_z",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.galaxus.ch/en/s1/product/apple-macbook-air-2026-1530-1000-gb-16-gb-ch-m5-notebooks-67998867",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://shoptime.com.ua/ua/p2775386543-zhenskaya-koftochka-dekolte.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.takealot.com/redmi-watch-5-active-black/PLID96707778",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://shopgoodwill.com/item/260186871",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.dba.dk/recommerce/forsale/item/20189466",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.conforama.fr/gros-electromenager/refrigerateur/refrigerateur-congelateur-bas/refrigerateur-combine--congel-en-bas--far-cb2625wdwd/p/104411",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.joom.com/ru-ua/products/5ef9aba039b57e01067b679f?contextSeed=-stso9g&context=%7B%22type%22%3A%22product%22%2C%22value%22%3A%5B%7B%22id%22%3A%225ef9aba039b57e01067b679f%22%2C%22type%22%3A%22pg%22%2C%22data%22%3A%22IiLi4jc3b2%2BdnQEBAAAAAFUXkUm8DZpuEFruJQx476%2F2ztaKQN7Il9BH4%2Bcs9xZRoNxeTzxNliYMGTEoWSze4EG%2FPCMasEQI3vEtW%2F5o1rklbkbkmdi95YE29K9zvgD0krXti3qNzLjvgJyb3mahjMhZT8IgwLeJAECOwSEk%2FZD58j%2FeoVNKiYqZ9Rm7GTFYYI5%2BTxgRICXo4en56ITbXw1FmJkW44l%2F4An0D%2FFoMqk5rOdEQRTCGEDfSORcGWyDXOKkMAMDU6WnYfSKRdNZyIa1Uanlo7pBf248hWqjGOOdeCX4nMk3I66ViUGqfhwOZGKZpu1pwgH2KGjsL1j2C9R6elMuDKEHJKqJN92mcYOFoqyB%2FKOqFiLR2eEz1K8cwjkOkdC99yWdwtFSS90J%2BieMAYL0Js1EM9N%2BCEImdeEpg1yNBxVWiGI0%2BFIx4kByTSpn%2F6oQkp4bMTsqsO8S60SZocPVtzIQLnTQHe%2Fy4YtJMLl%2Fg05EHKatfOmNZL7JlL1RbL6mAdrKrLxGPJYD6KnCSO7Qbtl7neUCs8%2B1%2Bq1MBlgE1XlFP7aiBgEhtMVqMe2d3YF9sgL7xYSInMmqRZVM41Enz0H7WXpqSAhxoz8iHeir7l48bz%2BJBHrHo3qeRIZBnG3QcCMPIvTaq%2BBUUzPtRaeRw%2BSsY8XzAEnIly8%3D%22%7D%5D%7D",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.tradera.com/item/1001/725979990/volvo-xc60-classic-d4-awd",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.worten.pt/produtos/calcado-de-seguranca-sparco-impulse-milton-esd-s1ps-sr-fo-tamanho-43-mrkean-8033280556129",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.sears.com/ef-ecoflow-efd521-ef-ecoflow-delta-pro-3-portable-power-station-4000wh-lfp-battery-expandable-to/p-A126471370",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.g2a.com/gray-zone-warfare-pc-steam-account-global-i10000505385017",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.digitec.ch/en/s1/product/panzerglass-empower-bank-10000-mah-20-w-37-wh-powerbanks-59413180",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.goat.com/apparel/supreme-shadow-plaid-rayon-shirt-magenta-ss26s5-magenta",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.depop.com/products/whopapsretail-intimately-by-free-people-white-f330/?moduleOrigin=selling_trends&campaignTitle=free_people_skirt",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.spartoo.net/BIRKENSTOCK-Boston-Kids-x30405516.php",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.theiconic.com.au/rich-raglan-fleece-crew-2713385.html?adId=6683%7Cd2ba630e-88d2-4087-ab47-1ec5685ed9ba-1775687869%7C0",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://souq.co/product/morucha-rfid-blocking-genuine-leather-wallet-for-men-slim-bifold-bull-leather-wallet-with-coin-pocket-id-window-8-card-slots-premium-blackbrown-luxury-gift-box-model-m75-6POe6E",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.grailed.com/listings/94678382-versace-grail-versace-classic-v2-cufflinks-glossy-plisse-shirt?g_aidx=Listing_collectible_production&g_aqid=9722c05c775603dac57447af61ed66f0",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.zattini.com.br/p/camisa-polo-levis-casual-masculina-D74-587E-008",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.zalora.com.hk/p/under-armour-project-rock-8-shoes-7273147",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://cdon.se/produkt/apple-iphone-16e-5g-128gb-svart-08650bc7fd1a5e52/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://kaspi.kz/shop/p/aisi-gr-1-chernyi-147897402/?c=750000000",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.1stdibs.com/jewelry/necklaces/drop-necklaces/122-carat-natural-royal-blue-sapphire-diamond-necklace-made-platinum/id-j_24842262/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://aukro.cz/crane-vesta-vel-s-7115519348",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://us.vestiairecollective.com/women-clothing/jackets/hermes/beige-cotton-hermes-jacket-65815655.shtml",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.wehkamp.nl/jack-jones-junior-hoodie-lichtblauw-17479983/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.morele.net/kawa-ziarnista-lavazza-qualita-oro-1-kg-869943/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.eprice.com.ua/product/24432/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.notonthehighstreet.com/joybycorrinesmith/product/family-birthstone-link-bracelet",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.onbuy.com/pl/p/sony-xperia-10-vii-5g-dual-sim-8-gb-128-gb-xq-fe72-turkusowy~p158299958/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.konga.com/product/samsung-65-neo-qled-8k-smart-tv-6452123",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.galerieslafayette.com/p/doudoune+kiliagi+a+capuche-le+temps+des+cerises/50688820/320",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.delcampe.net/en_GB/collectables/coins-banknotes/banknotes/djibouti/billet-territoire-francais-des-afars-et-issas-denomination-500-francs-usage-15387-a-1-laura-22106-2505911228.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.shpock.com/en-gb/i/ZCBHVYrfql1iPYuq/2-x-zierkissen-20",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.rueducommerce.fr/p/r24060018398.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.etsy.com/listing/1905134263/consistent-trading-returns-with-mt4?ls=s&ga_order=most_relevant&ga_search_type=all&ga_view_type=gallery&ga_search_query=tradesy&ref=sr_gallery-1-2&sr_prefetch=0&pf_from=market&dd=1&content_source=ece66615-25f4-4dc0-8967-63e71b4f1c5c%253ALTef4c21ee6e6c91df19e4393290d759090fea7630&organic_search_click=1&logging_key=ece66615-25f4-4dc0-8967-63e71b4f1c5c%3ALTef4c21ee6e6c91df19e4393290d759090fea7630",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.bonanza.com/listings/Nike-Lunarsolo-Gs-Kids-Shoes-Size-6Y-AA4403-404/1031704829?featured=true&search_term_id=70729744",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.miinto.com/p-la-days-t-shirt-866860d3-5e85-4793-bf25-610299a1d4d8",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.ecrater.com/p/40942076/austin-nola-2021-topps-heritage-656-san",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://fyndiq.se/produkt/20w-snabbladdare-for-iphone11-12-13-14-med-2-m-kabel-1c24de4b27434357/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://jane.com/store/johnny-threads/annualstrawberryfestival",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.gamestop.com/video-games/xbox-series-x%7Cs/products/crimson-desert---xbox-series-x/443001.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.shopclues.com/1-piece-plastic-rice-bowl-food-strainer-thick-drain-basket-with-handle-for-rice-vegetable-and-fruit-153676838.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.okazii.ro/vidaxl-copertin-retractabil-manual-crem-4-3-m-3420250-a262669828",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.coolshop.co.uk/product/sonic-origins-plus-day-one-edition/23F8VD/?raptor_module=GetUserRecommendations",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.storenvy.com/products/36762048-retro-thick-canvas-leather-cover-crossbody-bag-satchel-bags-tote-messenger-b",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.rubylane.com/item/1341942-SC1030/Antique-19th-C-Folk-Art-Silk?t=b6ddeab0",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://sidelineswap.com/gear/lacrosse/lacrosse-helmets/11940095-cascade-xrs-pro-helmet-new",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.zvab.com/servlet/BookDetailsPL?bi=31088816021&cm_sp=collections-_-dXt0Onr9kvOKUyggDzEQm_item_1_2-_-bdp",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.limeroad.com/blue-denim-tarama-p21998820?imgIdx=1&src_id=merge_feed_story__2&reference_story_id=69ce2cda72154ffec6d8d6e4",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://bidorbuy.co.ke/listing/spacious-two-bedrooms-house-at-nanyuki-town-for-rent",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.alibris.com/The-Seven-Husbands-of-Evelyn-Hugo-Taylor-Jenkins-Reid/book/37074077",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.mumzworld.com/en/neobreez-octa-360-degree-rotating-seat-stroller-black-44483883-f8-nbr122bk?source=Category+Page",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.natureetdecouvertes.com/bien-etre/massage/materiel-accessoires/renpho-masseur-de-pieds-renpho-shiatsu-foot-massager-fm058r-93384690",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "http://modaoperandi.com/women/p/christopher-esber/jo-flip-flop-5/721308",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.temu.com/ua-ru/kuiper/un9.html?subj=default-un-v2&_bg_fs=1&_p_jump_id=1100&_x_vst_scene=adg&goods_id=601099595424021&sku_id=17592515113823&adg_ctx=a-7486d2fc~c-dde9cefe~f-30ae0237&_x_ads_sub_channel=shopping&_p_rfs=1&_x_ns_prz_type=-1&_x_ns_sku_id=17592515113823&_x_ns_gid=601099595424021&mrk_rec=1&_x_ads_channel=google&_x_gmc_account=5343777111&_x_login_type=Google&_x_ns_gg_lnk_type=adr&_x_ads_account=8661564203&_x_ads_set=22886053880&_x_ads_id=182463914143&_x_ads_creative_id=769046477948&_x_ns_source=g&_x_ns_gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKfUf5HGYJWMTIDZy27AvSWN8hKinn1nWn7eaUKbM5uGN4DYpAqa5pgaAlpHEALw_wcB&_x_ns_placement=&_x_ns_match_type=&_x_ns_ad_position=&_x_ns_product_id=5343777111-ru-17592515113823&_x_ns_target=&_x_ns_devicemodel=&_x_ns_wbraid=CkAKCAjwnN3OBhBTEjAAkAejLi0r1dOCX_kYgRfV2e2ev9q0pQ-UgH3haM8bJBL-Hol4OViuO9TIsg3JmQkaAr5i&_x_ns_gbraid=0AAAAAo4mICH7jk6yLDZLIDQkTxdvepEeD&_x_ns_targetid=pla-2387322851245&gad_source=1&gad_campaignid=22886053880&gbraid=0AAAAAo4mICH7jk6yLDZLIDQkTxdvepEeD&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKfUf5HGYJWMTIDZy27AvSWN8hKinn1nWn7eaUKbM5uGN4DYpAqa5pgaAlpHEALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://prom.ua/ua/p2841731603-hudi-frieren-waifu.html?utm_source=google_pmax&utm_medium=cpc&utm_content=pmax&utm_campaign=Pmax_cpa_muzhskie_tolstovki&gad_source=1&gad_campaignid=20408928155&gbraid=0AAAAADBxJSWpMFCbTUwd6WFCagND4LFZH&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKfb_dzJvdgC7m8LnwqQr1H110yKYapxds66rTzSltQhFhNwsTK4uwwaAnG-EALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.olx.ua/d/uk/obyavlenie/radiomikrofony-komplekt-2sht-IDZ2CM3.html?search_reason=search%7Cpromoted",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://rozetka.com.ua/ua/asus-90nr0lb2-m00970/p568837453/?gad_source=1&gad_campaignid=23516836960&gbraid=0AAAAABpmbmuCWPuac9GpjWE6ZuSNNv-FL&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKcYboCmQsr2zcaVhiEewFNAbju0Y7UMkHCEvqj58Iyj61sIbVbYxasaAnG2EALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://maudau.com.ua/ru/product/viski-chivas-brothers-royal-salute-v-korobtsi-40-07-l-4056?gad_source=1&gad_campaignid=21143810111&gbraid=0AAAAABiTv2oHNd3B4BJuaoOMyNJstNoS6&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKcRZZZWn_hXD8mpiKFMxSr1mBMR9Senbfy0zJWlC_rN9vNmheH-xBMaArH8EALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://bi.ua/ukr/product/nabor-syurpriz-lol-surprise-loves-hello-kitty-hello-kitty-i-druzya-523840.html?sc_content=34180_r2565v3090",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://book-ye.com.ua/hudozhnja-literatura/proza/suchasna-zarubizhna-proza/ne-moja-istorija/?sc_content=37193_r2950v3562",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://ksd.ua/product/khroniky-buresvitla-komplekt-z-5-knyh?utm_source=google&utm_medium=cpc&utm_campaign=Ukr-Perform_Max-All-%D0%9A%D0%A1%D0%94&utm_content=gid__x_c_9198696_&utm_term=__&gad_source=1&gad_campaignid=23362505971&gbraid=0AAAAADq3rgtABTAC92Wox6ZJLO9gQDWIM&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKddcULSuA8gTS0ExzhGkhFq8ogI0IQv-Zmxtf0AD4z14bHz3zG38RAaAlZBEALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://vivat.com.ua/product/finalna-propozytsiia/?gad_source=1&gad_campaignid=22779391199&gbraid=0AAAAADGtG7FZk7dDW2ctEzq1UO0k_8m7F&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKej5HuoHtNY1zfIq_y4-O-0qAZvc7oQ6FWMTihXL7E3M4BUXomBG9MaAhhBEALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://epicentrk.ua/ua/shop/mplc-plaska-dla-vodi-sportivna-z-trubockou-1-6-l-hp-14-35-1eff757a-efac-6ae6-89a7-ffe08ddb7939.html?tak=NGJlMWZjMmFiY2JjMjhiOGE0ODVjNzQ5MTI5MGEyNTQtNS1NUDI0NzI0MjAyLTAuNTEtMzYxNjItMTk1OTI1ZjUtMjBkZi00OTc3LTg0ZTgtNGE1YjM3OWY2NWM3LS0t",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://bujobox.com.ua/nabir-stikeriv-have-a-good-day-detektyv-u-spravi-15-sht/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://avrora.ua/gel-dlya-prannya-wash-and-free-universal-4100-g/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://symbol.ua/uk/store/bezevoe-plate-s-drapirovkoj-magda-butrym-dress11323526-bezevyj",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.foxtrot.com.ua/ru/shop/skovorodki-bravo-chef-lappetit-236-5414.html",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://katysoho.com.ua/product/kros-bodi-sumka-605-blakytnyj/?utm_source=google&utm_medium=cpc&utm_campaign=pmax_under1900&utm_content=&utm_term=&gad_source=1&gad_campaignid=23596277402&gbraid=0AAAAA-fV0axuW4YX9RbAo76eNOcnNeo1E&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKdLUqkShndoXI42mdUIyafld3cDCCsuhKkknL4UP2l8a9bwxJ7gBEwaAqo_EALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://kashalot.gift/ua/multitul-po-gri-stalker-podarunok-dlja-gejmera-ta-fanata/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://www.yakaboo.ua/ua/vid-mak-komplekt-iz-8-knig-2257277.html?gad_source=1&gad_campaignid=22698815994&gbraid=0AAAAADoya-YauA1xe62oF82MvH_jZwLFh&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKfL148YDk7PcTn5wvY6XvmPUi0RG6N1VafHHssDZ530uYGRP197DQoaAtt5EALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://geekach.com.ua/spapliuzhenyi-hraal.-padinnia-avalonu-tainted-grail-the-fall-of-avalon/?gad_source=1&gad_campaignid=17178695679&gbraid=0AAAAACxBQ3HtzMQ8D5q5tecBok19tYMqt&gclid=Cj0KCQjwv-LOBhCdARIsAM5hdKeEisfLIyjmjFJ7tYULNk-3GkDFjN_IqhLDsxPzWPHUz9m2UdsIRqgaApYVEALw_wcB",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://hobymonster.com.ua/nastilna-hra-unmatched-bytva-lehend-chastyna-2/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://leleka.camp/uk/pixy-hammock-orange-xl/",
    expected: { title: null, price: null, image: null, description: null },
  },
  {
    url: "https://octopus.in.ua/boardgames/catan-dopovnennya-dlya-5-6-gravcv",
    expected: { title: null, price: null, image: null, description: null },
  },
];

export const TEST_CASES: TestCase[] = RAW_TEST_CASES.map((tc) => ({
  ...tc,
  expected: ACCEPTANCE_CRITERIA.get(tc.url) ?? tc.expected,
}));
