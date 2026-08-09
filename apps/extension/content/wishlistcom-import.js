/**
 * Content script — scrapes the signed-in user's wishlists from wishlist.com.
 *
 * Unlike the other importers this one parses HTML: wishlist.com is server
 * rendered and exposes no JSON API. Pages are fetched with the user's session
 * and read with DOMParser.
 *
 * Three levels are involved:
 *   /mywishlists?uid=…   → the lists  (cards: div.waterfall-item#wlid<id>)
 *   /mywishes/<listId>   → the wishes (cards: div.waterfall-item[data-sortable-wid])
 *   /mywish/<wishId>     → price and store link, which the cards omit
 *
 * Being markup-driven this is the most fragile importer we have, so parsing a
 * list as empty when its card claims wishes is treated as an error rather than
 * silently importing nothing.
 */

(() => {
  const ORIGIN = "https://www.wishlist.com";
  const PER_PAGE = 40;
  const PLACEHOLDER = "photoplaceholder.png";

  /* ------------------------------------------------------------------ */
  /*  Fetching & parsing helpers                                         */
  /* ------------------------------------------------------------------ */

  async function fetchDocument(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`wishlist.com returned ${res.status}`);
    return new DOMParser().parseFromString(await res.text(), "text/html");
  }

  /** Their infinite scroll returns { total, html } — parse the fragment the same way. */
  async function fetchFragment(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`wishlist.com returned ${res.status}`);
    const data = await res.json();
    return data.html ? new DOMParser().parseFromString(data.html, "text/html") : null;
  }

  const text = (el, selector) => el.querySelector(selector)?.textContent.trim() || null;

  function imageFrom(el, selector) {
    const src = el.querySelector(selector)?.getAttribute("src");
    return src && !src.includes(PLACEHOLDER) ? src : null;
  }

  /** Collect cards across every page of an infinite-scroll feed. */
  async function collectCards(doc, ajaxUrl, selector) {
    const cards = [...doc.querySelectorAll(selector)];

    for (let page = 2; ; page++) {
      const next = await fetchFragment(`${ajaxUrl}&page=${page}`);
      const more = next ? [...next.querySelectorAll(selector)] : [];
      if (more.length === 0) break;
      cards.push(...more);
    }

    return cards;
  }

  /* ------------------------------------------------------------------ */
  /*  Wishes                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Cards carry name, image and price; gift notes and the store link only exist
   * on the wish's own page.
   *
   * The link is looked for inside `.wish-item-text` and nowhere wider: the page
   * also renders a "similar items" widget full of merchant links, and picking one
   * of those up would silently file a recommendation as the user's own item.
   */
  async function fetchWishDetails(wishId) {
    const doc = await fetchDocument(`${ORIGIN}/mywish/${wishId}`);
    const details = doc.querySelector(".wish-item-text");
    if (!details) return {};

    const link = [...details.querySelectorAll("a[href]")].find((a) => {
      try {
        return !new URL(a.href).hostname.endsWith("wishlist.com");
      } catch {
        return false;
      }
    });

    return {
      description: text(details, ".wish-gift-notes-text"),
      url: link?.href || null,
      image_url: imageFrom(doc, "#user_wish_overview_div .guest-wish-image img"),
    };
  }

  async function fetchWishes(listId) {
    const doc = await fetchDocument(`${ORIGIN}/mywishes/${listId}`);
    const cards = await collectCards(
      doc,
      `${ORIGIN}/getMyWishesWaterfallJsonAjax?wlid=${listId}&per_page=${PER_PAGE}&wldmode=grid`,
      "div.waterfall-item[data-sortable-wid]",
    );

    const wishes = [];
    for (const card of cards) {
      const id = card.dataset.sortableWid;
      const details = await fetchWishDetails(id);

      wishes.push({
        id,
        name: text(card, ".waterfall-item-desc") || "Untitled item",
        description: details.description || null,
        price: text(card, ".wish-price-text"),
        currency: null,
        image_url: imageFrom(card, "img.waterfall-item-img") || details.image_url || null,
        url: details.url,
      });
    }

    return wishes;
  }

  /* ------------------------------------------------------------------ */
  /*  Wishlists                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * The profile id drives the wishlists feed. Pages expose it either as a tagged
   * element or in their own `?pid=` links — the nav carries both a `?uid=` and a
   * `?pid=` variant of "My WishLists", and only the latter identifies the profile.
   */
  function profileIdFrom(doc) {
    const tagged = doc.querySelector('[data-id-type="p"][data-id]')?.dataset.id;
    if (tagged) return tagged;

    for (const link of doc.querySelectorAll('a[href*="pid="]')) {
      const pid = new URL(link.href, ORIGIN).searchParams.get("pid");
      if (pid) return pid;
    }

    // Wish pages carry it only inside data-action URLs on modal triggers.
    return doc.documentElement.innerHTML.match(/[?&]pid=([A-Za-z0-9]+)/)?.[1] || null;
  }

  async function scrapeWishlists() {
    let profileId = profileIdFrom(document);
    let doc;

    if (profileId) {
      doc = await fetchDocument(`${ORIGIN}/mywishlists?pid=${profileId}&all=1`);
    } else {
      const navLink = document.querySelector('a[href*="/mywishlists?"]')?.href;
      if (!navLink) {
        throw new Error("Open your wishlist.com account page, then try importing again.");
      }
      doc = await fetchDocument(navLink);
      profileId = profileIdFrom(doc);
    }

    if (!profileId) {
      throw new Error("Could not read your wishlist.com profile — are you signed in?");
    }

    const cards = await collectCards(
      doc,
      `${ORIGIN}/getMyWishlistsWaterfallJsonAjax?pid=${profileId}&per_page=${PER_PAGE}&wldmode=grid`,
      'div.waterfall-item[id^="wlid"]',
    );

    const wishlists = [];
    for (const card of cards) {
      const id = card.id.replace(/^wlid/, "");
      const items = await fetchWishes(id);

      // Markup-driven parsing fails silently; the card's own count catches that.
      const claimed = parseInt(text(card, ".wish-block-t2") || "0", 10);
      if (claimed > 0 && items.length === 0) {
        throw new Error(`Could not read the wishes of "${text(card, ".waterfall-item-desc")}".`);
      }

      wishlists.push({
        id,
        title: text(card, ".waterfall-item-desc") || "Untitled wishlist",
        description: null,
        image_url: imageFrom(card, "img.waterfall-item-img"),
        event_date: null,
        is_public: !card.querySelector(".fa-lock"),
        items,
      });
    }

    return wishlists;
  }

  /* ------------------------------------------------------------------ */
  /*  Message listener                                                   */
  /* ------------------------------------------------------------------ */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== "WISHLISTCOM_SCRAPE") return;

    scrapeWishlists()
      .then((wishlists) => sendResponse({ wishlists }))
      .catch((err) => sendResponse({ error: err.message }));

    return true; // keep channel open for async response
  });
})();
