/**
 * Background service worker.
 *
 * Responsibilities:
 *   - Email + password login via Supabase Auth
 *   - Google OAuth via chrome.identity.launchWebAuthFlow
 *   - Token storage & automatic refresh
 *   - Wishlist fetching & item creation via Supabase REST
 */

importScripts("../config.js");

const SUPABASE_URL = WISHLY_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = WISHLY_CONFIG.SUPABASE_ANON_KEY;
const SITE_URL = WISHLY_CONFIG.SITE_URL;
const SESSION_KEY = "wishly_session";

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

async function getStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result[key] ?? null));
  });
}

async function setStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/* ------------------------------------------------------------------ */
/*  Session management                                                 */
/* ------------------------------------------------------------------ */

async function getSession() {
  const session = await getStorage(SESSION_KEY);
  if (!session) return null;

  // Check if token is expired (with 60s buffer)
  if (session.expires_at && Date.now() / 1000 > session.expires_at - 60) {
    try {
      return await refreshSession(session.refresh_token);
    } catch {
      await clearSession();
      return null;
    }
  }

  return session;
}

async function saveSession(data) {
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user,
  };
  await setStorage(SESSION_KEY, session);
  return session;
}

async function clearSession() {
  await new Promise((resolve) => {
    chrome.storage.local.remove([SESSION_KEY], resolve);
  });
}

async function refreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error("Token refresh failed");

  const data = await res.json();
  return await saveSession(data);
}

/* ------------------------------------------------------------------ */
/*  Wishlist import                                                    */
/* ------------------------------------------------------------------ */

const IMPORT_SOURCES = {
  gowish: {
    label: "GoWish",
    urls: ["https://gowish.com/*", "https://www.gowish.com/*"],
    homepage: "https://gowish.com/",
    scrapeMessage: "GOWISH_SCRAPE",
  },
  rewish: {
    label: "ReWish",
    urls: ["https://rewish.io/*", "https://www.rewish.io/*"],
    homepage: "https://rewish.io/",
    scrapeMessage: "REWISH_SCRAPE",
  },
  wishpicks: {
    label: "WishPicks",
    urls: ["https://wishpicks.com/*", "https://www.wishpicks.com/*"],
    homepage: "https://wishpicks.com/",
    scrapeMessage: "WISHPICKS_SCRAPE",
  },
  wishlistcom: {
    label: "WishList.com",
    urls: ["https://wishlist.com/*", "https://www.wishlist.com/*"],
    homepage: "https://www.wishlist.com/",
    scrapeMessage: "WISHLISTCOM_SCRAPE",
  },
  mywishlistonline: {
    label: "My Wishlist",
    urls: ["https://mywishlist.online/*"],
    homepage: "https://mywishlist.online/home",
    scrapeMessage: "MYWISHLISTONLINE_SCRAPE",
  },
};

async function sbFetch(session, path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase request failed: ${body || res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Copy scraped wishlists into the signed-in user's account.
 *
 * Rows carry the source id in `external_id` (namespaced as `<source>:<id>`), and
 * the unique indexes on (user_id, external_id) / (wishlist_id, external_id) let
 * the insert skip what a previous run already brought over. Existing rows are
 * never overwritten, so a repeated import only tops lists up and leaves local
 * edits alone.
 */
async function importWishlists(session, source, scraped) {
  const existing = await sbFetch(
    session,
    `wishlist?user_id=eq.${session.user.id}&external_id=not.is.null&select=id,external_id`,
  );
  const idByExternalId = new Map(existing.map((wl) => [wl.external_id, wl.id]));

  let wishlistsCreated = 0;
  let itemsAdded = 0;
  let itemsSkipped = 0;

  for (const [index, list] of scraped.entries()) {
    const externalId = `${source}:${list.id}`;
    let wishlistId = idByExternalId.get(externalId);

    if (!wishlistId) {
      const [created] = await sbFetch(session, "wishlist", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: session.user.id,
          external_id: externalId,
          title: list.title,
          description: list.description,
          image_url: list.image_url,
          event_date: list.event_date,
          visibility_type: list.is_public ? 2 : 0,
          accent_type: index % 5,
        }),
      });
      wishlistId = created.id;
      wishlistsCreated++;
    }

    const rows = list.items.map((item) => ({
      wishlist_id: wishlistId,
      external_id: `${source}:${item.id}`,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: item.currency,
      image_url: item.image_url,
      url: item.url,
      status: 0,
    }));

    // Chunked so a large list doesn't hit request size limits.
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const inserted = await sbFetch(session, "item?on_conflict=wishlist_id,external_id", {
        method: "POST",
        headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
        body: JSON.stringify(chunk),
      });
      itemsAdded += inserted.length;
      itemsSkipped += chunk.length - inserted.length;
    }
  }

  return { success: true, wishlistsCreated, itemsAdded, itemsSkipped };
}

/* ------------------------------------------------------------------ */
/*  Message handler                                                    */
/* ------------------------------------------------------------------ */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  return true; // keep channel open for async response
});

async function handleMessage(msg) {
  switch (msg.type) {
    /* ────────── Auth ────────── */

    case "LOGIN_EMAIL": {
      const { email, password } = msg.payload;

      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error_description || body.msg || "Login failed");
      }

      const data = await res.json();
      const session = await saveSession(data);
      return { success: true, user: session.user };
    }

    case "LOGIN_GOOGLE": {
      // Build Supabase OAuth URL for Google
      const redirectUrl = chrome.identity.getRedirectURL("callback");
      console.log("[Wishlane] OAuth redirect URL:", redirectUrl);
      console.log(
        "[Wishlane] Add this URL to Supabase → Authentication → URL Configuration → Redirect URLs",
      );

      const authUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
      authUrl.searchParams.set("provider", "google");
      authUrl.searchParams.set("redirect_to", redirectUrl);
      authUrl.searchParams.set("scopes", "email profile");

      console.log("[Wishlane] Opening auth URL:", authUrl.toString());

      // Open Google sign-in in a browser popup
      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: authUrl.toString(), interactive: true },
          (callbackUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(callbackUrl);
            }
          },
        );
      });

      // Supabase redirects back with either a code (PKCE) or access_token in hash
      const callbackParsed = new URL(responseUrl);

      // Check hash fragment first (implicit flow)
      const hashParams = new URLSearchParams(callbackParsed.hash.substring(1));
      let accessToken = hashParams.get("access_token");
      let refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        // We got tokens directly from the hash — save them
        const expiresIn = parseInt(hashParams.get("expires_in") || "3600", 10);
        // Fetch the user info
        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: SUPABASE_ANON_KEY,
          },
        });
        const user = userRes.ok ? await userRes.json() : null;

        const session = await saveSession({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
          user,
        });
        return { success: true, user: session.user };
      }

      // Check for authorization code (PKCE flow)
      const code = callbackParsed.searchParams.get("code");
      if (code) {
        // Exchange code for session
        const tokenRes = await fetch(
          `${SUPABASE_URL}/auth/v1/token?grant_type=authorization_code`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ code }),
          },
        );

        if (!tokenRes.ok) throw new Error("Failed to exchange auth code");

        const tokenData = await tokenRes.json();
        const session = await saveSession(tokenData);
        return { success: true, user: session.user };
      }

      throw new Error("No credentials received from Google sign-in");
    }

    case "LOGOUT": {
      const session = await getStorage(SESSION_KEY);
      if (session?.access_token) {
        // Best-effort server-side logout
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
        }).catch(() => {});
      }
      await clearSession();
      return { success: true };
    }

    case "GET_SESSION": {
      const session = await getSession();
      return { session };
    }

    case "GET_REDIRECT_URL": {
      return { redirectUrl: chrome.identity.getRedirectURL("callback") };
    }

    /* ────────── Wishlists ────────── */

    case "GET_WISHLISTS": {
      const session = await getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `${SUPABASE_URL}/rest/v1/wishlist?user_id=eq.${session.user.id}&select=id,title,description,accent_type,image_url&order=created_at.desc`;

      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load wishlists");
      return { wishlists: await res.json() };
    }

    /* ────────── Scrape URL via server ────────── */

    case "SCRAPE_URL": {
      const { url } = msg.payload;
      if (!url) throw new Error("No URL provided");

      const scrapeEndpoint = `${SITE_URL}/api/server/scrape-product?url=${encodeURIComponent(url)}`;

      const res = await fetch(scrapeEndpoint);

      if (!res.ok) {
        console.warn("[Wishlane] Server scrape failed:", res.status);
        return { product: null };
      }

      const product = await res.json();
      return { product };
    }

    /* ────────── Add Item ────────── */

    case "ADD_ITEM": {
      const session = await getSession();
      if (!session) throw new Error("Not authenticated");

      const {
        wishlist_id,
        name,
        description,
        price,
        image_url,
        url,
        discount_price,
        has_discount,
        discount_end_date,
      } = msg.payload;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          wishlist_id,
          name: name || "Untitled Item",
          description: description || null,
          price: price || null,
          image_url: image_url || null,
          url: url || null,
          status: 0,
          priority: null,
          discount_price: discount_price || null,
          has_discount: has_discount || false,
          discount_end_date: discount_end_date || null,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Failed to add item: ${body}`);
      }

      return { success: true, item: (await res.json())[0] };
    }

    /* ────────── Import wishlists from another service ────────── */

    case "GET_IMPORT_SOURCES": {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const sources = Object.entries(IMPORT_SOURCES).map(([id, config]) => ({
        id,
        label: config.label,
        // Lets the popup lead with the service the user is already looking at.
        isCurrentSite: config.urls.some((pattern) => {
          // Match pattern → regex; a trailing `/*` also covers the bare origin.
          const expr = pattern.replace(/[.]/g, "\\.").replace(/\/\*$/, "(/.*)?");
          return new RegExp(`^${expr}$`).test(tab?.url || "");
        }),
      }));

      return { sources };
    }

    case "IMPORT_SOURCE": {
      const session = await getSession();
      if (!session) throw new Error("Not authenticated");

      const { source } = msg.payload;
      const config = IMPORT_SOURCES[source];
      if (!config) throw new Error(`Unknown import source: ${source}`);

      const [tab] = await chrome.tabs.query({ url: config.urls });

      if (!tab?.id) {
        await chrome.tabs.create({ url: config.homepage });
        return { needsSourceTab: true, label: config.label };
      }

      const scraped = await chrome.tabs
        .sendMessage(tab.id, { type: config.scrapeMessage })
        .catch(() => {
          throw new Error(`Reload the ${config.label} tab, then try importing again.`);
        });
      if (scraped?.error) throw new Error(scraped.error);

      return await importWishlists(session, source, scraped.wishlists || []);
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}
