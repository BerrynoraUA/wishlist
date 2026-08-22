# Wishlane Free vs Pro

Reference for what the Free plan allows and what Wishlane Pro unlocks, derived from the
code rather than from marketing copy. Every claim below links to the file that enforces it.

Plans are defined in [`packages/backend/types/subscription.ts`](../packages/backend/types/subscription.ts)
as `SubscriptionPlan.Free` and `SubscriptionPlan.Pro`.

## Pricing

| Interval | Price  | Notes                                |
| -------- | ------ | ------------------------------------ |
| Monthly  | $2.99  |                                      |
| Yearly   | $19.99 | 44% cheaper than 12 monthly payments |

Source: `PRICING` in [`packages/backend/types/subscription.ts`](../packages/backend/types/subscription.ts).
The savings percentage is computed, not hard-coded.

These figures drive the **web** pricing page
([`apps/frontend/src/app/pricing`](../apps/frontend/src/app/pricing)). The **mobile**
paywall renders whatever products the current RevenueCat offering returns
([`apps/native/components/subscription/subscription.tsx`](../apps/native/components/subscription/subscription.tsx)),
so in-app prices come from the App Store / Google Play and can differ by region. A
lifetime (one-time purchase) option is supported by the paywall UI if the offering
contains one.

## Quotas

| Limit               | Free | Pro       |
| ------------------- | ---- | --------- |
| Wishlists           | 5    | Unlimited |
| Items per wishlist  | 10   | Unlimited |
| Secret Santa events | 1    | Unlimited |

Source: `FREE_LIMITS` in [`packages/backend/types/subscription.ts`](../packages/backend/types/subscription.ts).

Quotas are checked when the user tries to create something. Hitting one opens the paywall
instead of the create form:

- Create menu — [`create-menu.tsx`](../apps/native/components/create/create-menu.tsx)
- Wishlist create sheet — [`wishlist-create-edit-sheet.tsx`](../apps/native/components/wishlists/sheets/wishlist-create-edit-sheet.tsx)
- Item create sheet — [`wishlist-item-create-edit-sheet.tsx`](../apps/native/components/wishlist-details/sheets/wishlist-item-create-edit-sheet.tsx)
- Secret Santa create sheet — [`secret-santa-create-edit-sheet.tsx`](../apps/native/components/secret-santa/sheets/secret-santa-create-edit-sheet.tsx)

## Feature matrix

| Feature                                 | Free              | Pro              |
| --------------------------------------- | ----------------- | ---------------- |
| Wishlist accent colour                  | Pink only         | All five accents |
| Default accent colour (settings)        | Pink only         | All five         |
| Default wishlist colour (settings)      | First swatch only | All five         |
| Item priorities                         | 3 of 10           | All 10           |
| Additional links on an item             | —                 | Yes              |
| Manage access / collaborative wishlists | —                 | Yes              |
| Secret Santa exclusions                 | —                 | Yes              |
| Events calendar export (`.ics`)         | —                 | Yes              |

### Accent and wishlist colours

Free accounts are pinned to `WishlistAccent.Pink`. Locked swatches render dimmed with a
padlock and open the paywall on tap.

- Per-wishlist accent: `AccentSelector` in [`wishlist-create-edit-sheet.tsx`](../apps/native/components/wishlists/sheets/wishlist-create-edit-sheet.tsx)
- Account defaults: [`appearance-settings.tsx`](../apps/native/components/settings/appearance-settings.tsx)

Creating a wishlist on a Free account force-resets the accent to Pink even if a different
value is somehow present in the form.

### Item priorities

Ten priorities ship in [`packages/backend/lib/priorities.ts`](../packages/backend/lib/priorities.ts),
flagged by `is_free`.

| Free                       | Pro                                                                         |
| -------------------------- | --------------------------------------------------------------------------- |
| 🟢 Low, 🟡 Medium, 🔴 High | 🔥 Urgent, ⚡ Critical, 💜 Epic, 👑 Legendary, 🌊 Mythic, Celestial, Divine |

On a Free account the whole Priority field in the item sheet is replaced by a
"Pro: Set item priority" button, and newly created items are saved with `priority_id: null`.
In settings, locked priorities are shown with a padlock
([`preferences-settings.tsx`](../apps/native/components/settings/preferences-settings.tsx)).

### Additional links

Pro only. The field is replaced by a "Pro: Add multiple links" button, and on create the
payload is forced to an empty array. The single primary product URL is available on Free.

### Manage access (collaborative wishlists)

Opening **Manage access** from a wishlist's detail screen shows a paywall sheet on Free
([`wishlist-grant-access-sheet.tsx`](../apps/native/components/wishlists/sheets/wishlist-grant-access-sheet.tsx)).
The action is also rendered with a lock in the wishlist header.

> **Inconsistency worth a product decision.** Picking _Selected friends_ or _Selected
> groups_ while creating or editing a wishlist is **not** gated — see
> [`use-wishlist-selected-access.ts`](../apps/native/components/wishlists/sheets/use-wishlist-selected-access.ts).
> So a Free user can grant access at creation time but cannot manage it afterwards.
> Either both should be gated or neither.

### Secret Santa exclusions

Pro only. Exclusions let the organiser control who a participant cannot draw. On Free the
launch sheet shows an upsell card instead of the exclusion editor, and the event is
launched with `exclusions: []`
([`secret-santa-launch-sheet.tsx`](../apps/native/components/secret-santa/sheets/secret-santa-launch-sheet.tsx)).

### Events calendar export

Exporting upcoming friends' events as an `.ics` file is Pro only. The export button
carries a padlock on Free and opens the paywall
([`events-calendar-sheet.tsx`](../apps/native/components/discover/events-calendar-sheet.tsx)).

## How gating works

All gating funnels through one hook,
[`use-pro-gate.ts`](../apps/native/hooks/use-pro-gate.ts):

```ts
const { isPro, isGated, isLoading, openPaywall } = useProGate();
```

- `isPro` comes from `useSubscriptionManager()`, which reads the RevenueCat `pro_access`
  entitlement and the server-side subscription status
  ([`subscription-provider.tsx`](../apps/native/providers/subscription-provider.tsx)).
- `isGated` is simply `!isPro`.
- `openPaywall()` navigates to the `/subscription` route.

Two conventions are used at call sites: replace the control with a `ProFeatureButton`, or
keep the control visible with a padlock and route the press to `openPaywall()`.

## Caveats

**Limits are enforced client-side only.** `FREE_LIMITS` appears nowhere in
[`supabase/migrations`](../supabase/migrations) or in the backend package beyond its type
definition. Nothing stops a crafted API call from exceeding 5 wishlists, 10 items, or
1 Secret Santa event, or from setting a Pro-only `priority_id`. If quotas need to be
guaranteed rather than merely presented, they belong in RLS policies or database triggers.

**`isPro` is unavailable for a moment on launch.** `useProGate` exposes `isLoading`;
call sites that ignore it briefly treat a Pro user as gated while the entitlement loads.
