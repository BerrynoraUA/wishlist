# Scraper results audit — 2026-06-30

Source export: `scraper-test-2026-06-30T08-13-52.json` (133 results).

This is a conservative first-pass classification. `criteria_or_parser_review` requires live evidence before changing code or expected data.

## Summary

| Category                  | Count |
| ------------------------- | ----: |
| criteria_or_parser_review |    65 |
| correct_result            |    27 |
| block_fetch_failure       |    24 |
| parser_bug                |    12 |
| outdated_acceptance       |     4 |
| obsolete_url              |     1 |

## Results

|   # | Domain                      | Export status | Classification            | Reason                                                                  |
| --: | --------------------------- | ------------- | ------------------------- | ----------------------------------------------------------------------- |
|   1 | www.amazon.com              | success       | parser_bug                | Missing product-scoped price                                            |
|   2 | www.ebay.com                | partial       | outdated_acceptance       | Regular and discount prices were compared as one field                  |
|   3 | www.aliexpress.com          | partial       | parser_bug                | Placeholder title and unrelated query-derived price                     |
|   4 | www.etsy.com                | success       | correct_result            | No reported mismatch                                                    |
|   5 | ua-tao.com                  | success       | parser_bug                | Malformed double-scheme image URL                                       |
|   6 | www.wildberries.ru          | partial       | parser_bug                | Missing current price and currency                                      |
|   7 | www.trendyol.com            | partial       | outdated_acceptance       | Expected locale, title and AED price are stale                          |
|   8 | www.target.com              | partial       | parser_bug                | Price belongs to unrelated embedded product state                       |
|   9 | www.flipkart.com            | failed        | parser_bug                | Implausible price extracted from unrelated page content                 |
|  10 | allegro.pl                  | failed        | block_fetch_failure       | No data extracted                                                       |
|  11 | www.zalando.sk              | partial       | outdated_acceptance       | Expected title and CDN image are stale                                  |
|  12 | www.tokopedia.com           | success       | correct_result            | No reported mismatch                                                    |
|  13 | www.lazada.co.th            | failed        | block_fetch_failure       | No data extracted                                                       |
|  14 | www.wayfair.com             | partial       | outdated_acceptance       | Title suffix policy and missing exact price criterion                   |
|  15 | www.mercari.com             | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  16 | www.hepsiburada.com         | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  17 | www.americanas.com.br       | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  18 | www.vinted.com              | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  19 | www.bol.com                 | success       | correct_result            | No reported mismatch                                                    |
|  20 | www.kaufland.it             | success       | correct_result            | No reported mismatch                                                    |
|  21 | www.asos.com                | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  22 | www.myntra.com              | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  23 | falabella.com.ua            | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  24 | www.otto.de                 | failed        | block_fetch_failure       | No data extracted                                                       |
|  25 | www.discogs.com             | failed        | parser_bug                | Missing required fields: price                                          |
|  26 | poshmark.com                | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  27 | www.decathlon.co.uk         | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  28 | zozo.jp                     | failed        | block_fetch_failure       | No data extracted                                                       |
|  29 | www.marktplaats.nl          | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  30 | www.emag.ro                 | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  31 | patriciawolf.bandcamp.com   | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  32 | www.dafiti.com.co           | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  33 | www.overstock.com           | failed        | block_fetch_failure       | No data extracted                                                       |
|  34 | farfetch.com                | failed        | block_fetch_failure       | Block/maintenance page parsed as product: register & sign in - farfetch |
|  35 | www.laredoute.ru            | failed        | parser_bug                | Missing required fields: image, price                                   |
|  36 | extra.in.ua                 | failed        | block_fetch_failure       | fetch failed                                                            |
|  37 | shophouzz.com               | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  38 | www.barnesandnoble.com      | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  39 | www.manomano.fr             | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  40 | www.cdiscount.com           | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  41 | www.meesho.com              | failed        | block_fetch_failure       | No data extracted                                                       |
|  42 | www.n11.com                 | success       | correct_result            | No reported mismatch                                                    |
|  43 | www.netshoes.com.br         | failed        | block_fetch_failure       | No data extracted                                                       |
|  44 | www.fnac.com                | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  45 | stockx.com                  | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  46 | www.qoo10.jp                | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  47 | www.newegg.com              | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  48 | reverb.com                  | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  49 | www.trademe.co.nz           | failed        | parser_bug                | Missing required fields: image, price                                   |
|  50 | www.bestbuy.ca              | failed        | block_fetch_failure       | No data extracted                                                       |
|  51 | www.noon.com                | failed        | block_fetch_failure       | No data extracted                                                       |
|  52 | www.gunbroker.com           | success       | correct_result            | No reported mismatch                                                    |
|  53 | www.lamoda.ru               | failed        | block_fetch_failure       | No data extracted                                                       |
|  54 | www.fruugo.co.uk            | failed        | parser_bug                | Missing required fields: price                                          |
|  55 | tiki.in.ua                  | success       | correct_result            | No reported mismatch                                                    |
|  56 | www.darty.com               | failed        | block_fetch_failure       | No data extracted                                                       |
|  57 | www.abebooks.com            | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  58 | www.galaxus.ch              | partial       | block_fetch_failure       | Block/maintenance page parsed as product: are you a robot?              |
|  59 | shoptime.com.ua             | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  60 | www.takealot.com            | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  61 | shopgoodwill.com            | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  62 | www.dba.dk                  | success       | correct_result            | No reported mismatch                                                    |
|  63 | www.conforama.fr            | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  64 | www.joom.com                | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  65 | www.tradera.com             | success       | correct_result            | No reported mismatch                                                    |
|  66 | www.worten.pt               | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  67 | www.sears.com               | failed        | block_fetch_failure       | No data extracted                                                       |
|  68 | www.g2a.com                 | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  69 | www.digitec.ch              | partial       | block_fetch_failure       | Block/maintenance page parsed as product: are you a robot?              |
|  70 | www.goat.com                | failed        | parser_bug                | Missing required fields: price                                          |
|  71 | www.depop.com               | success       | correct_result            | No reported mismatch                                                    |
|  72 | www.spartoo.net             | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  73 | www.theiconic.com.au        | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  74 | souq.co                     | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  75 | www.grailed.com             | success       | correct_result            | No reported mismatch                                                    |
|  76 | www.zattini.com.br          | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  77 | www.zalora.com.hk           | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  78 | cdon.se                     | success       | correct_result            | No reported mismatch                                                    |
|  79 | kaspi.kz                    | success       | correct_result            | No reported mismatch                                                    |
|  80 | www.1stdibs.com             | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  81 | aukro.cz                    | success       | correct_result            | No reported mismatch                                                    |
|  82 | us.vestiairecollective.com  | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  83 | www.wehkamp.nl              | success       | correct_result            | No reported mismatch                                                    |
|  84 | www.morele.net              | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  85 | www.eprice.com.ua           | partial       | parser_bug                | Missing required fields: price                                          |
|  86 | www.notonthehighstreet.com  | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  87 | www.onbuy.com               | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  88 | www.konga.com               | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  89 | www.galerieslafayette.com   | failed        | criteria_or_parser_review | Reported status: failed                                                 |
|  90 | www.delcampe.net            | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  91 | www.shpock.com              | failed        | obsolete_url              | Non-product page title: the page you are looking for cannot be found.   |
|  92 | www.rueducommerce.fr        | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  93 | www.etsy.com                | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  94 | www.bonanza.com             | failed        | block_fetch_failure       | No data extracted                                                       |
|  95 | www.miinto.com              | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  96 | www.ecrater.com             | partial       | criteria_or_parser_review | Reported status: partial                                                |
|  97 | fyndiq.se                   | success       | correct_result            | No reported mismatch                                                    |
|  98 | jane.com                    | failed        | block_fetch_failure       | fetch failed                                                            |
|  99 | www.gamestop.com            | failed        | block_fetch_failure       | No data extracted                                                       |
| 100 | www.shopclues.com           | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 101 | www.okazii.ro               | failed        | block_fetch_failure       | No data extracted                                                       |
| 102 | www.coolshop.co.uk          | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 103 | www.storenvy.com            | failed        | block_fetch_failure       | No data extracted                                                       |
| 104 | www.rubylane.com            | failed        | block_fetch_failure       | No data extracted                                                       |
| 105 | sidelineswap.com            | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 106 | www.zvab.com                | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 107 | www.limeroad.com            | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 108 | bidorbuy.co.ke              | success       | correct_result            | No reported mismatch                                                    |
| 109 | www.alibris.com             | failed        | block_fetch_failure       | No data extracted                                                       |
| 110 | www.mumzworld.com           | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 111 | www.natureetdecouvertes.com | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 112 | modaoperandi.com            | failed        | criteria_or_parser_review | Reported status: failed                                                 |
| 113 | www.temu.com                | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 114 | prom.ua                     | success       | correct_result            | No reported mismatch                                                    |
| 115 | www.olx.ua                  | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 116 | rozetka.com.ua              | success       | correct_result            | No reported mismatch                                                    |
| 117 | maudau.com.ua               | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 118 | bi.ua                       | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 119 | book-ye.com.ua              | success       | correct_result            | No reported mismatch                                                    |
| 120 | ksd.ua                      | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 121 | vivat.com.ua                | success       | correct_result            | No reported mismatch                                                    |
| 122 | epicentrk.ua                | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 123 | bujobox.com.ua              | success       | correct_result            | No reported mismatch                                                    |
| 124 | avrora.ua                   | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 125 | symbol.ua                   | failed        | criteria_or_parser_review | Reported status: failed                                                 |
| 126 | www.foxtrot.com.ua          | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 127 | katysoho.com.ua             | failed        | block_fetch_failure       | The operation was aborted due to timeout                                |
| 128 | kashalot.gift               | success       | correct_result            | No reported mismatch                                                    |
| 129 | www.yakaboo.ua              | success       | correct_result            | No reported mismatch                                                    |
| 130 | geekach.com.ua              | success       | correct_result            | No reported mismatch                                                    |
| 131 | hobymonster.com.ua          | partial       | criteria_or_parser_review | Reported status: partial                                                |
| 132 | leleka.camp                 | success       | correct_result            | No reported mismatch                                                    |
| 133 | octopus.in.ua               | success       | correct_result            | No reported mismatch                                                    |
