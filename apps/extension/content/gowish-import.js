/**
 * Content script — scrapes the signed-in user's wishlists from GoWish.
 *
 * Runs on gowish.com so requests to api.gowish.com are same-site and carry the
 * user's session. GoWish exposes a single GraphQL endpoint; `getWishlistsPaginated`
 * returns wishlists together with their wishes, so one paginated query covers
 * the whole import.
 *
 * Auth transport isn't observable from a sanitized HAR, so we try cookies first
 * and fall back to a bearer token from web storage.
 */

(() => {
  const GRAPHQL_URL = "https://api.gowish.com/graphql";
  const WISHES_PAGE_SIZE = 100;
  const WISHLISTS_PAGE_SIZE = 25;

  const QUERY = `query getWishlistsPaginated($input: PaginationInput, $wishesInput: PaginationInput, $kinds: [WishlistKind!]) {
  wishlists(input: $input, kinds: $kinds) {
    nextCursor
    totalCount
    data {
      id
      title
      description
      coverPhoto
      eventDate
      accessLevel
      wishes(input: $wishesInput) {
        nextCursor
        totalCount
        data {
          id
          title
          description
          price
          currency
          photos
          url
          quantity
        }
      }
    }
  }
}`;

  /* ------------------------------------------------------------------ */
  /*  Auth                                                               */
  /* ------------------------------------------------------------------ */

  /** Look for a JWT-looking value in web storage (fallback when cookies don't authenticate). */
  function findBearerToken() {
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const raw = store.getItem(store.key(i));
        if (!raw) continue;
        const match = raw.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
        if (match) return match[0];
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  GraphQL                                                            */
  /* ------------------------------------------------------------------ */

  let bearerToken = null;

  async function query(variables) {
    const headers = { "Content-Type": "application/json", "x-client-id": "web" };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ operationName: "getWishlistsPaginated", variables, query: QUERY }),
    });

    if (!res.ok) throw new Error(`GoWish API returned ${res.status}`);

    const body = await res.json();
    const unauthenticated = body.errors?.some((e) => e.extensions?.code === "UNAUTHENTICATED");

    if (unauthenticated) {
      // Retry once with a bearer token if we haven't already.
      if (!bearerToken) {
        bearerToken = findBearerToken();
        if (bearerToken) return query(variables);
      }
      throw new Error("Not signed in to GoWish — log in on gowish.com and try again.");
    }

    if (body.errors?.length) throw new Error(body.errors[0].message || "GoWish API error");
    if (!body.data?.wishlists) throw new Error("Unexpected GoWish API response");

    return body.data.wishlists;
  }

  /* ------------------------------------------------------------------ */
  /*  Scrape                                                             */
  /* ------------------------------------------------------------------ */

  async function scrapeWishlists() {
    const wishlists = [];
    let cursor = 0;

    // 1. All wishlists, with their first page of wishes.
    for (;;) {
      const page = await query({
        kinds: ["My"],
        input: { cursor, limit: WISHLISTS_PAGE_SIZE },
        wishesInput: { cursor: 0, limit: WISHES_PAGE_SIZE },
      });

      for (const wl of page.data) {
        wishlists.push({
          id: wl.id,
          title: wl.title,
          description: wl.description,
          coverPhoto: wl.coverPhoto,
          eventDate: wl.eventDate,
          accessLevel: wl.accessLevel,
          totalWishes: wl.wishes.totalCount,
          wishes: wl.wishes.data,
        });
      }

      if (!page.nextCursor || wishlists.length >= page.totalCount) break;
      cursor = page.nextCursor;
    }

    // 2. Remaining pages of wishes for lists longer than one page.
    for (let wishCursor = WISHES_PAGE_SIZE; ; wishCursor += WISHES_PAGE_SIZE) {
      const incomplete = wishlists.filter((wl) => wl.wishes.length < wl.totalWishes);
      if (incomplete.length === 0) break;

      const byId = new Map(incomplete.map((wl) => [wl.id, wl]));
      let cursor = 0;

      for (;;) {
        const page = await query({
          kinds: ["My"],
          input: { cursor, limit: WISHLISTS_PAGE_SIZE },
          wishesInput: { cursor: wishCursor, limit: WISHES_PAGE_SIZE },
        });

        for (const wl of page.data) {
          byId.get(wl.id)?.wishes.push(...wl.wishes.data);
        }

        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }
    }

    return wishlists.map((wl) => ({
      id: wl.id,
      title: wl.title || "Untitled wishlist",
      description: wl.description || null,
      image_url: wl.coverPhoto || null,
      event_date: wl.eventDate ? wl.eventDate.slice(0, 10) : null,
      is_public: wl.accessLevel === "Public",
      items: wl.wishes.map((w) => ({
        id: w.id,
        name: w.title || "Untitled item",
        description: w.description || null,
        price: w.price == null ? null : String(w.price),
        currency: w.currency || null,
        image_url: Array.isArray(w.photos) ? w.photos[0] || null : null,
        url: w.url || null,
      })),
    }));
  }

  /* ------------------------------------------------------------------ */
  /*  Message listener                                                   */
  /* ------------------------------------------------------------------ */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== "GOWISH_SCRAPE") return;

    scrapeWishlists()
      .then((wishlists) => sendResponse({ wishlists }))
      .catch((err) => sendResponse({ error: err.message }));

    return true; // keep channel open for async response
  });
})();
