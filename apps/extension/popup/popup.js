/**
 * Popup controller.
 *
 * Manages three screens:
 *   1. Login — email + password or Google sign-in
 *   2. Main  — preview product, pick a wishlist, add item
 *   3. Success — confirmation
 */

/* ------------------------------------------------------------------ */
/*  DOM references                                                     */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);

const loginScreen = $("login-screen");
const mainScreen = $("main-screen");
const successScreen = $("success-screen");

// Login
const loginForm = $("login-form");
const loginEmail = $("login-email");
const loginPassword = $("login-password");
const loginBtn = $("login-btn");
const loginError = $("login-error");
const googleBtn = $("google-btn");
const setupHint = $("setup-hint");

// Main
const productImage = $("product-image");
const productPlaceholder = $("product-image-placeholder");
const productTitle = $("product-title");
const productPrice = $("product-price");
const wishlistList = $("wishlist-list");
const itemNotes = $("item-notes");
const addBtn = $("add-btn");
const mainError = $("main-error");
const logoutBtn = $("logout-btn");

// Success
const successDetail = $("success-detail");
const successClose = $("success-close");

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let selectedWishlistId = null;
let productData = {
  title: null,
  description: null,
  price: null,
  image: null,
  url: null,
  discount_price: null,
  has_discount: false,
  discount_end_date: null,
};

const ACCENT_CLASSES = ["pink", "blue", "peach", "mint", "lavender"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function showScreen(screen) {
  [loginScreen, mainScreen, successScreen].forEach((s) =>
    s.classList.add("hidden"),
  );
  screen.classList.remove("hidden");
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideError(el) {
  el.classList.add("hidden");
}

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      resolve(response || {});
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Boot                                                               */
/* ------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", async () => {
  const { session } = await sendMessage({ type: "GET_SESSION" });

  if (session?.access_token) {
    await initMainScreen();
  } else {
    showScreen(loginScreen);
  }
});

/* ------------------------------------------------------------------ */
/*  Login — Email + Password                                           */
/* ------------------------------------------------------------------ */

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError(loginError);
  loginBtn.classList.add("loading");
  loginBtn.disabled = true;

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  const res = await sendMessage({
    type: "LOGIN_EMAIL",
    payload: { email, password },
  });

  loginBtn.classList.remove("loading");
  loginBtn.disabled = false;

  if (res.error) {
    showError(loginError, res.error);
    return;
  }

  await initMainScreen();
});

/* ------------------------------------------------------------------ */
/*  Login — Google                                                     */
/* ------------------------------------------------------------------ */

googleBtn.addEventListener("click", async () => {
  hideError(loginError);
  setupHint.classList.add("hidden");
  googleBtn.classList.add("loading");
  googleBtn.disabled = true;

  const res = await sendMessage({ type: "LOGIN_GOOGLE" });

  googleBtn.classList.remove("loading");
  googleBtn.disabled = false;

  if (res.error) {
    showError(loginError, res.error);

    // Show the redirect URL so the user can add it to Supabase
    const urlRes = await sendMessage({ type: "GET_REDIRECT_URL" });
    if (urlRes.redirectUrl) {
      setupHint.innerHTML =
        `<strong>Setup required</strong>` +
        `Add this URL to Supabase → Authentication → URL Configuration → Redirect URLs:<br><br>` +
        `<code>${urlRes.redirectUrl}</code>`;
      setupHint.classList.remove("hidden");
    }
    return;
  }

  await initMainScreen();
});

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

async function initMainScreen() {
  showScreen(mainScreen);

  let pageUrl = null;

  // 1. Get the active tab URL
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) {
      pageUrl = tab.url;
      productData.url = pageUrl;
    }
  } catch {
    // Can't access tab
  }

  // 2. Try server-side scraping first (much more reliable)
  if (pageUrl && /^https?:\/\//.test(pageUrl)) {
    try {
      showLoadingState();
      const scrapeRes = await sendMessage({
        type: "SCRAPE_URL",
        payload: { url: pageUrl },
      });

      if (scrapeRes?.product && !scrapeRes.product.error) {
        const p = scrapeRes.product;
        if (p.title) productData.title = p.title;
        if (p.description) productData.description = p.description;
        if (p.image) productData.image = p.image;
        if (p.price) productData.price = p.price;
        if (p.discount_price) productData.discount_price = p.discount_price;
        if (p.has_discount) productData.has_discount = p.has_discount;
        if (p.discount_end_date) productData.discount_end_date = p.discount_end_date;
      }
    } catch {
      // Server scrape failed — will fall back to content script
    }
  }

  // 3. Fall back to content script extraction if server didn't return enough data
  if (!productData.title || !productData.price) {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: "EXTRACT_PRODUCT",
        });

        if (response) {
          if (!productData.title && response.title) productData.title = response.title;
          if (!productData.description && response.description) productData.description = response.description;
          if (!productData.image && response.image) productData.image = response.image;
          if (!productData.price && response.price) productData.price = response.price;
          if (!productData.url && response.url) productData.url = response.url;
        }
      }
    } catch {
      // Content script might not be injected (e.g. chrome:// pages)
    }
  }

  // Populate product fields
  productTitle.value = productData.title || "";
  productPrice.value = productData.price || "";

  if (productData.image) {
    productImage.src = productData.image;
    productImage.style.display = "block";
    productPlaceholder.classList.add("hidden");
    productImage.onerror = () => {
      productImage.style.display = "none";
      productPlaceholder.classList.remove("hidden");
    };
  } else {
    productImage.style.display = "none";
    productPlaceholder.classList.remove("hidden");
  }

  // Load wishlists
  await loadWishlists();

  // Update add button state
  updateAddButton();
}

function showLoadingState() {
  productTitle.value = "Loading...";
  productPrice.value = "";
  productImage.style.display = "none";
  productPlaceholder.classList.remove("hidden");
}

async function loadWishlists() {
  wishlistList.innerHTML = '<div class="loading-shimmer"></div>';

  const res = await sendMessage({ type: "GET_WISHLISTS" });

  if (res.error) {
    wishlistList.innerHTML = `<div class="empty-wishlists">Failed to load wishlists</div>`;
    return;
  }

  const wishlists = res.wishlists || [];

  if (wishlists.length === 0) {
    wishlistList.innerHTML = `<div class="empty-wishlists">No wishlists yet. Create one in the app first.</div>`;
    return;
  }

  wishlistList.innerHTML = "";

  for (const wl of wishlists) {
    const accentClass = ACCENT_CLASSES[wl.accent_type] || "pink";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wishlist-option";
    btn.dataset.id = wl.id;
    btn.innerHTML = `
      <span class="wishlist-dot ${accentClass}"></span>
      <span class="wishlist-name">${escapeHtml(wl.title)}</span>
      <svg class="wishlist-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;

    btn.addEventListener("click", () => selectWishlist(wl.id));
    wishlistList.appendChild(btn);
  }
}

function selectWishlist(id) {
  selectedWishlistId = id;

  wishlistList.querySelectorAll(".wishlist-option").forEach((el) => {
    el.classList.toggle("selected", el.dataset.id === id);
  });

  updateAddButton();
}

function updateAddButton() {
  const hasTitle = productTitle.value.trim().length > 0;
  addBtn.disabled = !(selectedWishlistId && hasTitle);
}

// Live-validate as user edits title
productTitle.addEventListener("input", updateAddButton);

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Add item                                                           */
/* ------------------------------------------------------------------ */

addBtn.addEventListener("click", async () => {
  if (addBtn.disabled) return;
  hideError(mainError);
  addBtn.classList.add("loading");
  addBtn.disabled = true;

  const payload = {
    wishlist_id: selectedWishlistId,
    name: productTitle.value.trim(),
    description: itemNotes.value.trim() || productData.description || null,
    price: productPrice.value.trim() || null,
    image_url: productData.image || null,
    url: productData.url || null,
    discount_price: productData.discount_price || null,
    has_discount: productData.has_discount || false,
    discount_end_date: productData.discount_end_date || null,
  };

  const res = await sendMessage({ type: "ADD_ITEM", payload });

  addBtn.classList.remove("loading");
  addBtn.disabled = false;

  if (res.error) {
    showError(mainError, res.error);
    return;
  }

  // Show success
  const selectedOption = wishlistList.querySelector(
    `.wishlist-option.selected .wishlist-name`,
  );
  const wlName = selectedOption?.textContent || "your wishlist";
  successDetail.textContent = `"${payload.name}" saved to ${wlName}.`;
  showScreen(successScreen);
});

/* ------------------------------------------------------------------ */
/*  Logout                                                             */
/* ------------------------------------------------------------------ */

logoutBtn.addEventListener("click", async () => {
  await sendMessage({ type: "LOGOUT" });
  selectedWishlistId = null;
  showScreen(loginScreen);
});

/* ------------------------------------------------------------------ */
/*  Success                                                            */
/* ------------------------------------------------------------------ */

successClose.addEventListener("click", () => {
  window.close();
});
