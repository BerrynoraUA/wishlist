/**
 * Content script — scrapes the signed-in user's wishlists from WishPicks.
 *
 * WishPicks serves its API from the same origin as the site and authenticates
 * with the session cookie, so these requests are the ones their own frontend
 * makes. Lists come from a plain GET; wishes are a cursor-paginated POST query.
 */

(() => {
  const API = "https://wishpicks.com/client-api/v1";
  const PAGE_SIZE = 50;

  /* ------------------------------------------------------------------ */
  /*  Request plumbing                                                   */
  /* ------------------------------------------------------------------ */

  async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        ...options.headers,
      },
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Not signed in to WishPicks — log in on wishpicks.com and try again.");
    }
    if (!res.ok) throw new Error(`WishPicks API returned ${res.status}`);

    const body = await res.json();
    if (!body.success) throw new Error(body.error?.message || "WishPicks API error");

    return body.data;
  }

  /** Their images carry a set of rendered presets rather than a plain URL. */
  function imageUrl(images) {
    const presets = images?.[0]?.presets;
    return presets?.original?.url || presets?.default?.url || null;
  }

  /* ------------------------------------------------------------------ */
  /*  Scrape                                                             */
  /* ------------------------------------------------------------------ */

  async function fetchWishes(wishlistId) {
    const wishes = [];
    let cursor = "";

    for (;;) {
      const data = await request(
        `/wish/query${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
        {
          method: "POST",
          body: JSON.stringify({ wishlistId, limit: PAGE_SIZE, sorting: "recentFirst" }),
        },
      );

      const items = data.items || [];
      wishes.push(...items);

      cursor = data.cursor;
      if (!cursor || items.length === 0 || wishes.length >= (data.total ?? wishes.length)) break;
    }

    return wishes;
  }

  async function scrapeWishlists() {
    const { items: lists } = await request("/wishlist");
    const wishlists = [];

    for (const list of lists) {
      // Lists shared with the user are readable but aren't theirs to copy.
      if (list.access !== "owner") continue;

      const wishes = list.wishesCount > 0 ? await fetchWishes(list.id) : [];

      wishlists.push({
        id: list.id,
        title: list.name || "Untitled wishlist",
        description: list.description || null,
        image_url: imageUrl(list.images),
        event_date: null,
        is_public: list.settings?.privacy?.view !== "private",
        items: wishes.map((wish) => ({
          id: wish.id,
          name: wish.name || "Untitled item",
          description: wish.description || wish.notes || null,
          price: wish.price?.amount == null ? null : String(wish.price.amount),
          currency: wish.price?.currency || null,
          image_url: imageUrl(wish.images),
          url: wish.url || null,
        })),
      });
    }

    return wishlists;
  }

  /* ------------------------------------------------------------------ */
  /*  Message listener                                                   */
  /* ------------------------------------------------------------------ */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== "WISHPICKS_SCRAPE") return;

    scrapeWishlists()
      .then((wishlists) => sendResponse({ wishlists }))
      .catch((err) => sendResponse({ error: err.message }));

    return true; // keep channel open for async response
  });
})();
