# Wishlist Feature Inventory

Last updated: 2026-03-13

## Existing features (implemented)

### Web app (frontend)
- Authentication
  - Email/password login and registration
  - Google login
  - Logout
- Dashboard and home
  - Home page with wishlist grid
  - User stats row
  - Create wishlist modal
  - Invite-related modals (friend invite, friend request sent)
- Wishlist management
  - Create, edit, delete wishlist
  - View wishlist detail page
  - Share wishlist via generated token link
  - Pagination for wishlist items
  - Search support in wishlist APIs
- Item management
  - Create, edit, delete items
  - Item image upload/delete
  - Toggle reservation on items
  - Discount-related fields supported on items
- Friends and social
  - Friends list
  - Incoming/outgoing friend requests
  - Send, accept, reject, cancel friend requests
  - Remove friend
  - Friend profile wishlist view
  - Nickname-based user search
  - Friendship checks
- Discover
  - Friends' wishlists discovery view
  - Reserved-by-me view
  - Upcoming events block
  - Reserve/unreserve actions from discover
- Sharing flow
  - Share token generation and verification
  - Public/shared wishlist page (`/share?token=...`)
  - Auth prompt when reserve action requires login
  - Post-login flow to redirect/add friend request
- Notifications
  - Create sale-alert notifications for friends
  - Get notifications list
  - Mark one/all as read
  - Delete one/all notifications
  - Unread notifications count
- Settings and account
  - Profile read/update
  - Nickname availability check
  - Avatar upload/delete
  - User settings read/update
  - Change password
  - Auth provider lookup
  - Delete account
  - Settings tabs: profile, account, notifications, appearance
- Subscription/monetization
  - Subscription status fetch
  - Offerings/packages fetch
  - Purchase package
  - Restore purchases
  - Subscription page with pricing/features/FAQ UI

### Browser extension (Chrome)
- Popup-based workflow with 3 screens: login, add-item, success
- Extension auth
  - Email/password login
  - Google login (with redirect URL setup hint)
  - Logout
- Product extraction
  - Server-side scrape attempt by URL
  - Fallback to content-script extraction on active tab
  - Extraction sources include JSON-LD, domain selectors, OG/Twitter metadata, heuristics
- Wishlist add flow
  - Load user wishlists in popup
  - Select target wishlist
  - Add scraped product with notes
- Manifest v3 setup
  - Background service worker
  - Content script on all URLs
  - Permissions for active tab, storage, scripting, identity

## Possible features we want (proposed)

### High-priority candidates
- Extension: create new wishlist directly in popup (no web app context switch)
- Price tracking automation for saved items with drop alerts
- Better shared-link conversion flow (clear CTA from shared page to friend connection)
- Unified inbox UX for notifications with filtering (friend/activity/price alerts)
- Saved search and advanced filters for discover/wishlist items

### Extension roadmap ideas
- Quick-add floating badge on product pages
- Browser context-menu action: “Add to Wishlist”
- Cross-browser support (Firefox/Safari)
- Optional one-click auth handoff from web app to extension
- Bulk add support from listing/search result pages

### Social and collaboration ideas
- Wishlist collaboration roles (owner/editor/viewer)
- Comments/reactions on wishlist items
- Gift intent flow ("I bought this" without revealing to owner)
- Event-based collaborative lists (birthdays, weddings, holidays)

### Growth and retention ideas
- Reminder engine (upcoming events, stale wishlists, abandoned items)
- Digest emails/push notifications
- Public profile and discoverability controls
- Referral/reward mechanics for inviting friends

### Data and quality improvements
- Duplicate item detection and merge suggestions
- Better product normalization (currency, variants, merchant data)
- Import/export support (CSV/JSON)
- Basic analytics dashboard for engagement and conversion

## Notes
- “Existing features” are based on current code structure, frontend routes, and exported API/extension capabilities.
- “Possible features” are candidate roadmap items and should be prioritized into Now/Next/Later during planning.