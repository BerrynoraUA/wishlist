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
    expires_at:
      data.expires_at ||
      Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
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
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  if (!res.ok) throw new Error("Token refresh failed");

  const data = await res.json();
  return await saveSession(data);
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

      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, password }),
        },
      );

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
      console.log("[Wishly] OAuth redirect URL:", redirectUrl);
      console.log(
        "[Wishly] Add this URL to Supabase → Authentication → URL Configuration → Redirect URLs",
      );

      const authUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
      authUrl.searchParams.set("provider", "google");
      authUrl.searchParams.set("redirect_to", redirectUrl);
      authUrl.searchParams.set("scopes", "email profile");

      console.log("[Wishly] Opening auth URL:", authUrl.toString());

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
        console.warn("[Wishly] Server scrape failed:", res.status);
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
        wishlist_id, name, description, price, image_url, url,
        discount_price, has_discount, discount_end_date,
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

    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}
