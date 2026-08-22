# Wishlane — Release TODO

Ordered, actionable list of what is left to actually ship **Wishlane** (`com.berrynora.wishlane`)
to the App Store and Google Play. State verified against the repo on **2026-08-14**.

Background, credentials, form answers and command reference live in
[`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md) — this file is the "what do I do next" list and
links back to its sections (§) rather than repeating them.

**Status today:** an iOS staging build reached TestFlight and an Android AAB was built (2026-08-02).
Nothing is submitted for review. The blockers below are what stands between here and a live release.

---

## Phase 1 — Code that must ship before review

- [ ] **Report content + block user** (§3, Apple Guideline 1.2). Public wishlists, Discover and
      usernames are user-generated content. Only `components/bug-reports/` exists — there is no
      report-content or block-user action anywhere in `components/`. Highest rejection risk.
  - [ ] "Report" action on a wishlist and on an item (Discover + friend views)
  - [ ] "Block user" alongside _Remove Friend_
  - [ ] Backend tables/RLS for reports and blocks; blocked users filtered out of Discover/friends
- [ ] **Account-deletion web page** (§2 #3, §8). Google Play requires a publicly reachable URL.
      `apps/frontend/src/app` has no `delete-account` route. Add `https://wishlane.net/delete-account`
      and deploy it.
- [ ] **Audit paywall copy against shipped features** (§3). If price-drop / sale-alert tracking is
      not in 1.0, remove the "Sale alerts & tracking" bullet from the paywall and from the listing
      copy in `store/listings/*.json` — advertising an absent feature is a 2.3.1 rejection.
- [x] Paywall links to Terms of Use and Privacy Policy — present in
      `components/subscription/subscription.tsx:354-361`.
- [ ] **Reconcile version numbers.** `app.json` `expo.version` is `0.1.0`, `apps/native/package.json`
      is `0.0.0`, and Play already has `1.0.0` (version code 11) on the internal track. Decide the
      marketing version for launch, set it in `app.json` (source of truth — §10), and match
      `package.json` by hand. Play rejects a version code lower than one already uploaded.
- [ ] `pnpm ref` and `pnpm check-types` pass; `pnpm --filter native test` green.

## Phase 2 — Store products and money

- [ ] **Create the subscriptions in App Store Connect** (§5): Subscription Group "Wishlane Premium"
      with `wishlane_premium_monthly` (1 month) and `wishlane_premium_yearly` (1 year), prices,
      localized name + description per product, one 1024×1024 review screenshot each.
- [ ] **Create the same two in Play Console** → Monetize → Subscriptions, one base plan each,
      activate. Needs a published build on at least the internal track first.
- [ ] **Attach both to the RevenueCat `default` offering** as `$rc_monthly` / `$rc_annual`, pointing
      at the `pro_access` entitlement (pinned in `providers/subscription-provider.tsx`).
- [ ] **Verify a real purchase** in TestFlight and on the Play internal track — paywall renders
      products, purchase unlocks `pro_access`, restore works.
- [ ] **Reconcile `PRICES` in `store/listings.js`** (currently `$3.99` / `$24.99`) against the real
      store prices, then re-run `store:metadata` and `store:apple:push` (§5).
- [ ] Attach the IAPs to the 1.0 version for its first review — IAPs submitted after a build need a
      separate review pass.

## Phase 4 — Console forms (manual, both stores)

**App Store Connect**

- [ ] App Privacy declarations — table of answers in §9 (collect: Yes, track: No, so no ATT prompt)
- [ ] License Agreement / EULA — Apple standard or `https://wishlane.net/terms-of-service` (§9)
- [ ] Confirm the demo account in `.env.store.local` still signs in and is seeded (§2 #1): 2–3
      wishlists with items, one accepted friend with a public list, one Secret Santa group with a
      completed draw. Empty reviewer screens are a common rejection.

**Google Play**

- [ ] Data safety form — answers in §7
- [ ] App access → "Demo account" instruction set, same credentials (§8)
- [ ] Content rating (IARC) — answers in §8, expect Teen / PEGI 12
- [ ] Target audience **13+**, appeals to children: No (§8)
- [ ] Ads: No · Government/Financial/Health/News: No (§8)
- [ ] Data deletion URL — from Phase 1
- [ ] Main store listing paste — `fastlane/metadata/android/en-US/` for the default, 40 translations
      under _Manage translations_, or automate with `fastlane supply` (§6)

## Phase 5 — Metadata push

- [ ] `pnpm --filter native store:metadata` then `store:metadata:check` (must pass — CI guard for
      stale files and character limits, §11)
- [ ] `npm run store:apple:push` (needs `.env.store.local` filled; present locally as of 2026-08-02)
      — watch for Apple's substring restricted-word check, which has already bitten the nl/sv/da/nb
      copy on `beta` inside `betaling`/`betalning` (§11)
- [ ] Note: `releaseNotes` / What's New is deliberately absent — Apple rejects it on a version's
      first submission. Add it per locale for 1.1 from `changelogIntro`/`changelogBullets` (§11)

## Phase 6 — Build and submit

Commands and flags are in §13. All credentials are already on EAS (§12). Push the production tag;
the GitHub workflow builds both platforms and always auto-submits them. Smoke-test the processed
TestFlight/Play builds before promoting the iOS build to App Review or releasing Android publicly.

- [ ] Push a `native-v<app.json version>` tag, or run `pnpm --filter native workflow:production`
- [ ] Confirm both EAS submissions finish: iOS in TestFlight and Android on the production track
- [ ] Smoke-test both binaries: sign-in (email + Apple), create wishlist, paste-link autofill,
      share intent, push notification, purchase, restore, account deletion, deep links (`wishlane://`)

**Play production is gated** (§2 #6). This is a personal developer account, so Google requires a
closed test with **12+ testers for 14 continuous days** before production access can be applied for.
`eas.json` points `submit.production.android.track` at `production`, which Play will refuse until
that clears.

- [ ] Add testers to the internal track — currently **empty**, so a successful submit reaches nobody
      (Play Console → Testing → Internal testing → Testers)
- [ ] Run the 14-day closed test with 12+ testers; apply for production access
- [ ] Meanwhile ship through the `staging` profile (`internal` track) or `beta` profile

## Phase 7 — Release

- [ ] iOS: submit for review; `release.automaticRelease` is `false`, so after approval the build is
      held for a manual release, with `phasedRelease` on for a 7-day staged rollout (§10)
- [ ] Android: promote internal → closed → production once access is granted; start at a staged
      rollout percentage
- [ ] Watch PostHog and Sentry-equivalent error surfaces for the first 48 h
- [ ] Verify OTA updates land on the `production` channel (`runtimeVersion` is `fingerprint`, so a
      native change requires a new binary, not an update)

---

## Retained EAS Workflow caveat

The old workflows remain available for manual production validation, with automatic triggers
disabled. The last `development-build.yml` update run failed on
`Unable to resolve module @formatjs/intl-pluralrules/locale-data/zh-Hant`; the same export succeeded
locally and during Android builds. Re-test that path after the Expo compatibility update before
using the retained development workflow as a fallback. Details are in §13.
