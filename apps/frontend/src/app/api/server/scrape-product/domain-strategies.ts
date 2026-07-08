export type DomainScrapeStrategy =
  | "next"
  | "scrapling_http"
  | "scrapling_browser"
  | "jina_reader"
  | "fallback";

const NEXT_DOMAINS = new Set([
  "aukro.cz",
  "avrora.ua",
  "bi.ua",
  "bujobox.com.ua",
  "cdon.se",
  "epicentrk.ua",
  "fyndiq.se",
  "geekach.com.ua",
  "hobymonster.com.ua",
  "kashalot.gift",
  "katysoho.com.ua",
  "leleka.camp",
  "maudau.com.ua",
  "rozetka.com.ua",
  "tiki.in.ua",
  "ua-tao.com",
  "vivat.com.ua",
  "www.abebooks.com",
  "www.americanas.com.br",
  "www.barnesandnoble.com",
  "www.bestbuy.ca",
  "www.cdiscount.com",
  "www.coolshop.co.uk",
  "www.dafiti.com.co",
  "www.dba.dk",
  "www.delcampe.net",
  "www.digitec.ch",
  "www.foxtrot.com.ua",
  "www.g2a.com",
  "www.galaxus.ch",
  "www.hepsiburada.com",
  "www.joom.com",
  "www.lazada.co.th",
  "www.marktplaats.nl",
  "www.meesho.com",
  "www.miinto.com",
  "www.morele.net",
  "www.mumzworld.com",
  "www.netshoes.com.br",
  "www.noon.com",
  "www.qoo10.jp",
  "www.rueducommerce.fr",
  "www.shopclues.com",
  "www.spartoo.net",
  "www.trendyol.com",
  "www.vinted.com",
  "www.wildberries.ru",
  "www.zalando.sk",
  "www.zalora.com.hk",
  "www.zattini.com.br",
  "www.zvab.com",
  "zozo.jp",
]);

const SCRAPLING_HTTP_DOMAINS = new Set([
  "falabella.com.ua",
  "farfetch.com",
  "jane.com",
  "kaspi.kz",
  "ksd.ua",
  "modaoperandi.com",
  "octopus.in.ua",
  "patriciawolf.bandcamp.com",
  "poshmark.com",
  "prom.ua",
  "reverb.com",
  "shopgoodwill.com",
  "shophouzz.com",
  "shoptime.com.ua",
  "sidelineswap.com",
  "souq.co",
  "stockx.com",
  "symbol.ua",
  "us.vestiairecollective.com",
  "www.alibris.com",
  "www.aliexpress.com",
  "www.asos.com",
  "www.conforama.fr",
  "www.decathlon.co.uk",
  "www.discogs.com",
  "www.ebay.com",
  "www.ecrater.com",
  "www.emag.ro",
  "www.eprice.com.ua",
  "www.flipkart.com",
  "www.fruugo.co.uk",
  "www.galerieslafayette.com",
  "www.gamestop.com",
  "www.goat.com",
  "www.laredoute.ru",
  "www.limeroad.com",
  "www.manomano.fr",
  "www.myntra.com",
  "www.n11.com",
  "www.olx.ua",
  "www.shpock.com",
  "www.target.com",
  "www.temu.com",
  "www.tokopedia.com",
  "www.trademe.co.nz",
  "www.tradera.com",
  "www.wayfair.com",
  "www.yakaboo.ua",
]);

const SCRAPLING_BROWSER_DOMAINS = new Set([
  "book-ye.com.ua",
  "extra.in.ua",
  "www.1stdibs.com",
  "www.amazon.com",
  "www.etsy.com",
  "www.grailed.com",
  "www.gunbroker.com",
  "www.kaufland.it",
  "www.lamoda.ru",
  "www.mercari.com",
  "www.notonthehighstreet.com",
  "www.onbuy.com",
  "www.storenvy.com",
  "www.takealot.com",
  "www.theiconic.com.au",
  "www.wehkamp.nl",
  "www.worten.pt",
]);

const JINA_DOMAINS = new Set([
  "allegro.pl",
  "bidorbuy.co.ke",
  "www.bol.com",
  "www.bonanza.com",
  "www.darty.com",
  "www.depop.com",
  "www.fnac.com",
  "www.konga.com",
  "www.natureetdecouvertes.com",
  "www.newegg.com",
  "www.okazii.ro",
  "www.otto.de",
  "www.overstock.com",
  "www.rubylane.com",
  "www.sears.com",
]);

export function getDomainScrapeStrategy(url: string): DomainScrapeStrategy {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return "fallback";
  }
  if (NEXT_DOMAINS.has(hostname)) return "next";
  if (SCRAPLING_HTTP_DOMAINS.has(hostname)) return "scrapling_http";
  if (SCRAPLING_BROWSER_DOMAINS.has(hostname)) return "scrapling_browser";
  if (JINA_DOMAINS.has(hostname)) return "jina_reader";
  return "fallback";
}
