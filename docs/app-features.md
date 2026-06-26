# Wishlane App Features

## Purpose

Wishlane is a wishlist and gift coordination app. Users create wishlists, add gift ideas, share lists with friends, reserve or mark gifts as purchased, organize friends into groups, discover gift ideas from connected friends, and run Secret Santa exchanges.

This document is platform-neutral. Treat the web and mobile apps as the same product experience unless a specific implementation requires otherwise. The Chrome extension is a companion capture tool that saves products from shopping sites into the same Wishlane account.

## Core Concepts

### User account

Each user signs in to a Wishlane account and has a profile used across wishlists, sharing, friends, notifications, and Secret Santa events. The account can include a display name, nickname, avatar, preferred currency, notification preferences, appearance preferences, and subscription state.

Authentication supports the main app account flow and is reused by the Chrome extension. Shared-link visitors may be prompted to sign in before actions that need identity, such as reserving an item or connecting a reservation to a person.

### Wishlist

A wishlist is a named collection of gift ideas owned by a user. A wishlist can include a title, description, image, event date, visual accent, visibility setting, and a list of items.

Wishlist visibility supports public lists, friends-only lists, selected-friends lists, and private lists. Selected-friends lists can grant access to individual friends or groups. Owners can manage access after creation by adding or revoking users and groups.

Wishlists can be created, edited, opened from the home grid, shared by link, filtered, sorted, and paginated. The home page shows the user's wishlists and supports searching and sorting by newest, oldest, name, and item count.

### Wishlist item

An item is a gift idea inside a wishlist. Items can include a name, description, price, discount price, discount end date, currency, store or URL, image, priority, color index, status, and additional links.

Item status represents gift coordination state: available, reserved, or purchased. Priority allows users to communicate importance. Prices and discounts are displayed so friends can compare gift options quickly.

Items can be created manually, edited, removed, filtered, sorted, paginated, and viewed in detail. Sorting supports newest, oldest, name, price, and priority ordering.

## Main Navigation Areas

### Home

Home is the user's main wishlist dashboard. It shows the user's wishlist grid, supports creating a new wishlist, and lets the user open a wishlist detail page.

Expected capabilities:

- Show all owned wishlists in a paginated grid.
- Create a wishlist with title, optional description, image, event date, visibility, and accent.
- Edit existing wishlist details.
- Search and sort wishlists.
- Show item counts and list metadata.
- Open a wishlist detail page by selecting a card.
- Handle friend-invite return states from links or query parameters.

### Wishlist details

The wishlist detail page is where owners manage items and sharing. It shows the selected wishlist, its metadata, and a paginated item grid.

Expected capabilities:

- Add an item to the wishlist.
- Edit item details, including image, URL, price, discount, priority, status, currency, and additional links.
- Filter items by status and priority.
- Sort items by date, name, price, or priority.
- Share the wishlist by generating a share token or share URL.
- Manage access for selected friends and groups when the owner controls the wishlist.
- Show reservation state so gift buyers know what is available, reserved, or purchased.

### Shared wishlist

The shared wishlist flow lets someone open a wishlist from a share link. This is the recipient or friend view rather than the owner's management view.

Expected capabilities:

- Open a shared wishlist by token.
- Show shared wishlist metadata and item grid.
- Let viewers reserve available items.
- Prompt sign-in when a reservation needs an authenticated identity.
- Return the user to the same shared wishlist after authentication.
- Show friend-request status after shared-link interactions, including whether the users are already connected, a request was sent, or another action is needed.

### Friends

Friends is the social graph and access-management area. It lets users find people, send and receive friend requests, view existing friends, and organize friends into groups.

Expected capabilities:

- Search for users by profile nickname.
- Send friend requests.
- View incoming friend requests.
- Accept or reject incoming requests.
- View outgoing sent requests.
- View existing friends with display name, nickname, avatar, wishlist count, and mutual friend count.
- Create and manage friend groups.
- Assign group name, description, color, icon, and members.
- Use groups as wishlist access targets.
- Open a friend's visible wishlists from the friends area.

### Discover

Discover is the browsing area for visible wishlists and gift ideas from friends. It helps users find gifts, see what is still available, and track items they reserved or purchased.

Expected capabilities:

- Show visible friend wishlist sections.
- Provide tabs for all wishlists, available items, reserved items, and purchased items.
- Search within Discover.
- Sort by owner, price, or priority where applicable.
- Open item detail from a Discover card.
- Show available, reserved, and purchased states.
- Show upcoming friend wishlist events.
- Provide calendar-style event discovery where supported.

### Secret Santa

Secret Santa supports group gift exchanges. A user can create an event, invite participants, launch assignments, and see their assigned receiver after the exchange starts.

Expected capabilities:

- Create a Secret Santa event with name, event date, budget, currency, optional image, and invited users.
- List Secret Santa events with search and pagination.
- Open event detail with hero information, participants, pending invites, and invite link.
- Edit event details before launch.
- Accept or decline invites from notifications or join links.
- Join an event from an invite link.
- Launch the exchange once there are enough accepted participants.
- Support assignment exclusions so specific participants are not assigned to each other.
- Lock or restrict setup actions after launch where needed.
- Show each participant their assigned receiver.
- Show visible wishlist item suggestions for the assigned receiver.

### Notifications

Notifications surface activity that needs user attention. They include Secret Santa invites, item reservation or purchased updates, and friend-related updates.

Expected capabilities:

- Show a notifications menu or panel.
- Mark individual notifications as read.
- Mark all notifications as read.
- Clear notifications.
- Navigate from a notification to the relevant page when possible.
- Accept or decline Secret Santa invites directly from notification actions.
- Display compact relative timestamps.

### Settings

Settings centralize profile, account, notification, appearance, and currency preferences.

Expected capabilities:

- Profile settings control public identity, such as display name, nickname, and avatar.
- Account settings handle account-level actions.
- Notification settings control which friendship, reservation, discount, and event updates notify the user.
- Appearance settings control theme and visual preferences.
- Currency settings control the default currency used when creating or viewing prices.

### Subscription

Subscription manages Free and Pro plan behavior. The app includes a subscription UI for supported environments and integrates with checkout, subscription management, and subscription sync.

Expected capabilities:

- Show Free and Pro pricing.
- Support monthly and yearly billing intervals.
- Let users upgrade to Pro through checkout.
- Let Pro users open subscription management.
- Let users sync or restore subscription status.
- Show feature comparison between Free and Pro.
- Redirect users to the subscription page when they hit a plan limit.

Free plan expectations:

- Up to 5 wishlists.
- Up to 20 items per wishlist.
- Smart link scraping.
- Friends and gift reservations.
- Real-time notifications.
- Discover and explore.
- Dark and light theme.

Pro plan expectations:

- Unlimited wishlists.
- Unlimited items per wishlist.
- Sale price alerts.
- Price tracking and history.
- Collaborative wishlists.
- Advanced sharing, including QR or PDF where implemented.
- Priority support.

### Ideas and feedback

Ideas is the feedback area where users submit and vote on product ideas.

Expected capabilities:

- Submit a feature idea with title and description.
- Limit title length to 120 characters.
- Limit description length to 1000 characters.
- Show feature idea status: pending, approved, in development, or done.
- Filter ideas by status.
- Show vote count and whether the current user has voted.
- Display submitter identity where available.

### Onboarding guide

The onboarding guide is an interactive, persistent walkthrough for signed-in users. It should point at real UI elements, explain one action at a time, and allow the user to move forward, back, skip, finish, or resume later.

Core guide sequence:

- Introduce the main navigation.
- Create the first wishlist.
- Open the new wishlist.
- Add the first item.
- Explain sharing.
- Explain access management.
- Open Friends.
- Add a friend.
- Explain Friends and Groups.
- Create a group.
- Explain Requests and Sent tabs.
- Open Discover.
- Explain Discover tabs.

Optional contextual guide flows:

- Shared wishlist links and reservation sign-in.
- Secret Santa creation, event detail, launching, receiver assignment, and joining.
- Settings profile, account, notifications, and appearance tabs.
- Subscription upgrade context.
- Ideas and feedback.

Guide requirements:

- Persist current step, skipped state, and completed state per signed-in user.
- Show progress such as "Step 6 of 15" or "Optional step 2 of 16".
- Use a compact progress bar.
- Keep navigation controls keyboard accessible.
- Announce progress to screen readers.
- Respect reduced-motion preferences.

## Product Capture Features

### Smart link scraping

Smart link scraping extracts product information from a URL so the user does not have to copy details manually.

Expected extracted fields:

- Product name.
- Price.
- Discount price where available.
- Discount end date where available.
- Product image.
- Product URL.
- Store or source.

The browser extension extraction strategy tries, in order:

- JSON-LD product structured data.
- Domain-specific selectors for major stores.
- Open Graph and Twitter meta tags.
- Generic page heuristics such as largest heading, largest image, and price-like text.

When different strategies find different fields, the app should merge the best available values into one item draft.

### Chrome extension

The Chrome extension lets users save products from online stores into Wishlane with one click.

Expected capabilities:

- Authenticate with the same Wishlane account.
- Browse any online store, then click the Wishlane toolbar icon.
- Auto-extract product name, price, image, URL, and discount information when available.
- Choose a target wishlist from the extension popup.
- Add the product to the selected wishlist.
- Sync saved items back to the main app immediately.
- Avoid collecting browsing history.
- Store credentials locally in Chrome storage and send them only to the configured Supabase project.

Optimized sites include Amazon, eBay, Etsy, Walmart, and AliExpress, with fallback support for other stores.

## Data and Backend Expectations

### Supabase-backed data

The app uses Supabase for authentication, database access, storage, and related backend behavior. Data should be scoped to the signed-in user and protected by row-level permissions.

Core data entities:

- Users and public profiles.
- Wishlists.
- Wishlist items.
- Item links.
- Friend requests.
- Friendships.
- Friend groups and group members.
- Wishlist access grants for users and groups.
- Share tokens.
- Notifications.
- Secret Santa events, participants, invites, exclusions, and assignments.
- Feature ideas and votes.
- Subscription/customer state.

### Images and files

Wishlists, items, profiles, and Secret Santa events can use images. Upload flows should support replacing images and removing existing images where the entity allows it.

### Pagination and loading states

The app uses paginated grids for major collections. Current page-size expectations include 8 wishlists on the home page, 12 items on wishlist detail pages, and 12 items on shared wishlist pages.

Major pages should show skeleton or empty states while data loads or when no records exist.

## Cross-Feature Rules

### Reservations

Reservations prevent duplicate gift buying. An available item can be reserved by a signed-in user. Reserved and purchased states should be visible in shared views, Discover, and notification flows.

### Access control

Wishlist visibility determines who can see a wishlist. Selected access can be granted to individual friends or friend groups. Owners retain management rights and can change access later.

### Search, filtering, and sorting

Search and filter controls should be available where collections can grow:

- Wishlists: search and sort by date, name, and item count.
- Items: filter by status and priority; sort by date, name, price, and priority.
- Discover: search and sort by owner, price, and priority.
- Friends: search users and friends.
- Secret Santa: search events.
- Ideas: filter by status.

### Internationalization and localization

User-facing text is expected to be localizable. Dates, prices, currencies, and notification times should format according to user and platform expectations.

### Accessibility

Interactive features should be keyboard accessible and screen-reader friendly. Important dynamic states, such as onboarding progress, notification state, and loading or empty states, should be understandable without relying only on visuals.

### Privacy and security

Private and selected-friends wishlists must not appear to unauthorized users. Shared links should use tokens rather than exposing direct owner permissions. Extension data should be limited to product extraction and account sync; it should not collect browsing history or use third-party tracking.

## AI Implementation Notes

When using this document to build or modify Wishlane, assume the desired product behavior is unified across web and mobile. Prefer implementing the same feature model, validation, permissions, and copy across both surfaces. Only diverge for platform-specific navigation, layout, or native capabilities.

Do not add speculative features beyond this list unless a task explicitly asks for them. When implementing a feature, preserve existing data contracts and route concepts where they already exist.
