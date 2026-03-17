# Wishly Chrome Extension

Save any product from the web to your Wishly wishlists with one click.

## How it works

1. Browse any online store (Amazon, eBay, Etsy, Walmart, AliExpress, etc.)
2. Click the Wishly heart icon in the toolbar
3. The extension auto-extracts product name, price, and image
4. Select a wishlist and click **Add to Wishlist**

## Setup

### 1. Generate icons

```bash
cd apps/extension
npm i sharp
node generate-icons.js
```

Or manually export `icons/icon.svg` at 16×16, 32×32, 48×48, and 128×128 into
`icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`.

### 2. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select this `extension` folder

### 3. Configure

Open `config.js` and set your Supabase project credentials:

```js
const WISHLY_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_ANON_KEY",
};
```

These are the same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
environment variables used by the frontend. They're public keys and safe to ship.

### 4. Sign in

Click the extension icon — sign in with **Google** or **email + password**.
Same account you use on the Wishly web app.

Credentials are stored locally in `chrome.storage.local` and never sent anywhere
except your own Supabase project.

### Product extraction strategy

The content script tries four methods in order of reliability:

1. **JSON-LD** — `<script type="application/ld+json">` with `@type: Product`
2. **Domain-specific selectors** — Hand-tuned CSS selectors for Amazon, eBay, Walmart, AliExpress, Etsy
3. **Open Graph / Twitter meta tags** — `og:title`, `og:image`, `product:price:amount`
4. **Generic heuristics** — Largest heading, largest image, first price-like string

Fields are merged across strategies: if JSON-LD finds the title but not the
price, domain selectors fill in the gap.

## Future improvements

- **OAuth / magic-link login** — skip Supabase URL / anon key entry by opening the web app login flow
- **Quick-add badge** — floating heart button injected on product pages (content script overlay)
- **Create new wishlist** — in-popup wishlist creation instead of requiring the web app
- **Price tracking** — periodically re-scrape saved items and notify on price drops
- **Browser context menu** — right-click any image → "Add to Wishly"
- **Firefox / Safari ports** — manifest adjustments for cross-browser support
