/**
 * Content script — scrapes the signed-in user's wishlists from ReWish.
 *
 * ReWish is a REST API on the same origin as the site, so the requests below
 * mirror what their own frontend does: a bearer token read from the
 * `rewishAuthToken` cookie plus the two headers their gateway requires.
 *
 * Their model maps onto ours directly: a "re-wish" is a wishlist and a "wish"
 * is an item (`position` on both is just sort order, not a nested variant).
 */

(() => {
  const API = "https://rewish.io/api";
  const DEFAULT_LIST_TITLE = "Мій вішліст"; // ReWish leaves the default list's title null
  const ACTIVE = 1; // wish status: 1 active, 2 deleted, 3 draft
  const CURRENCIES = { 1: "UAH", 2: "USD", 3: "EUR", 4: "GBP", 5: "PLN", 6: "CHF" };

  /* ------------------------------------------------------------------ */
  /*  Request plumbing                                                   */
  /* ------------------------------------------------------------------ */

  function authToken() {
    const match = document.cookie.match(/(?:^|;\s*)rewishAuthToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  let userId = null;

  async function get(path) {
    const token = authToken();
    if (!token) throw new Error("Not signed in to ReWish — log in on rewish.io and try again.");

    const res = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Systemcode": "ReWish-Web",
        "X-Flow-Id": `${userId || crypto.randomUUID()}_${crypto.randomUUID()}`,
        accept: "application/json",
      },
    });

    if (res.status === 401) {
      throw new Error("ReWish session expired — reload rewish.io and try again.");
    }
    if (!res.ok) throw new Error(`ReWish API returned ${res.status}`);

    const body = await res.json();
    if (!body.is_success) throw new Error(body.errors?.[0]?.message || "ReWish API error");

    return body.value;
  }

  /* ------------------------------------------------------------------ */
  /*  Scrape                                                             */
  /* ------------------------------------------------------------------ */

  async function scrapeWishlists() {
    const user = await get("/user");
    userId = user.id;

    const lists = await get(`/re-wish/${user.id}`);
    const wishlists = [];

    for (const list of lists) {
      const wishes = list.wishes_count > 0 ? await get(`/wish/${list.id}`) : [];

      wishlists.push({
        id: String(list.id),
        title: list.title || DEFAULT_LIST_TITLE,
        description: null,
        image_url: null,
        event_date: null,
        is_public: !list.is_private,
        items: wishes
          .filter((wish) => wish.status === ACTIVE)
          .map((wish) => ({
            id: String(wish.id),
            name: wish.title || "Untitled item",
            description: wish.description || null,
            price: wish.price > 0 ? String(wish.price) : null,
            currency: CURRENCIES[wish.currency] || null,
            image_url: wish.avatar_path || null,
            url: wish.purchase_link || null,
          })),
      });
    }

    return wishlists;
  }

  /* ------------------------------------------------------------------ */
  /*  Message listener                                                   */
  /* ------------------------------------------------------------------ */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== "REWISH_SCRAPE") return;

    scrapeWishlists()
      .then((wishlists) => sendResponse({ wishlists }))
      .catch((err) => sendResponse({ error: err.message }));

    return true; // keep channel open for async response
  });
})();
