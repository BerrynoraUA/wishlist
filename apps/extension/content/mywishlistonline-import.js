/**
 * Content script — scrapes the signed-in user's wishlists from mywishlist.online.
 *
 * The site is server rendered, but each wishlist page embeds its items as JSON in
 * a `wishlist_products` script variable, so only the list of wishlists has to be
 * read from markup — the items themselves come from structured data.
 */

(() => {
  const PRODUCTS_RE = /var\s+wishlist_products\s*=\s*(\{[\s\S]*?\});/;

  async function fetchDocument(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`mywishlist.online returned ${res.status}`);
    return new DOMParser().parseFromString(await res.text(), "text/html");
  }

  /** Their own wishlists are the `/w/<code>/<slug>` links in the sidebar nav. */
  function wishlistUrls(doc) {
    const urls = [...doc.querySelectorAll('#sidebar-main a[href*="/w/"]')].map((a) => a.href);
    return [...new Set(urls)];
  }

  function productsFrom(doc) {
    for (const script of doc.querySelectorAll("script")) {
      const match = script.textContent.match(PRODUCTS_RE);
      if (!match) continue;
      try {
        return Object.values(JSON.parse(match[1]));
      } catch {
        throw new Error("Could not read the items on mywishlist.online.");
      }
    }
    return [];
  }

  async function scrapeWishlist(url) {
    const doc = await fetchDocument(url);
    const heading = doc.querySelector("h1")?.textContent.trim();

    return {
      id: doc.querySelector(".wishlist[data-id]")?.dataset.id || new URL(url).pathname,
      title: heading || "Untitled wishlist",
      description: null,
      image_url: null,
      event_date: null,
      // The page carries no privacy flag, so imported lists take our app's default.
      is_public: true,
      items: productsFrom(doc).map((product) => ({
        id: String(product.id),
        name: product.title || "Untitled item",
        description: product.description || null,
        price: product.price || null,
        currency: product.currency || null,
        image_url: product.image?.url || null,
        url: product.redirect_url || null,
      })),
    };
  }

  async function scrapeWishlists() {
    const urls = wishlistUrls(document);
    if (urls.length === 0) {
      throw new Error("No wishlists found — log in on mywishlist.online and try again.");
    }

    const wishlists = [];
    for (const url of urls) {
      wishlists.push(await scrapeWishlist(url));
    }
    return wishlists;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== "MYWISHLISTONLINE_SCRAPE") return;

    scrapeWishlists()
      .then((wishlists) => sendResponse({ wishlists }))
      .catch((err) => sendResponse({ error: err.message }));

    return true; // keep channel open for async response
  });
})();
