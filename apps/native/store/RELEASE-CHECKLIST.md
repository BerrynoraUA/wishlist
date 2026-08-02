# Wishlane — Store Release Checklist

App: **Wishlane** · `com.berrynora.wishlane` · version from `expo.version` in `app.json`
Generated 2026-07-25. Source of truth for the listing copy is `store/listings/<locale>.json` — one
file per locale the app ships, covering both stores. See §11.

---

## 1. What is automated vs. manual

|                                            | App Store Connect                               | Google Play                                              |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------- |
| Listing text (name, description, keywords) | **Automated** — `eas metadata:push`, 31 locales | Manual paste (or `fastlane supply` — see §6), 41 locales |
| Categories, URLs, copyright                | **Automated**                                   | Manual                                                   |
| Age rating / content rating                | **Automated** (advisory block)                  | Manual (IARC questionnaire)                              |
| App Review / App Access demo login         | **Automated**                                   | Manual                                                   |
| Privacy declarations                       | Manual (App Privacy)                            | Manual (Data safety)                                     |
| Screenshots, icon, feature graphic         | Manual                                          | Manual                                                   |
| In-app purchases                           | Manual (or RevenueCat)                          | Manual (or RevenueCat)                                   |
| Binary upload                              | **Automated** — `eas submit`                    | **Automated** — `eas submit`                             |

EAS Metadata is Apple-only; there is no Google Play equivalent in EAS.

---

## 2. Blockers — must be resolved before submitting

1. **Demo account and review phone.** Register a permanent account (suggested:
   `appreview@wishlane.net`) via email/password sign-up. Seed it with 2–3 wishlists containing items,
   one accepted friend with a public wishlist, and one Secret Santa group with a completed draw.
   Reviewers see empty screens otherwise, which is a common rejection. Then:

   ```bash
   cp apps/native/.env.store.local.example apps/native/.env.store.local
   ```

   and fill in `APPLE_REVIEW_PHONE` (E.164, e.g. `+380…`), `APPLE_DEMO_USERNAME` and
   `APPLE_DEMO_PASSWORD`. `store.config.js` throws if any are missing, so `eas metadata:push`
   cannot accidentally upload placeholders. Re-use the same account for Play's _App access_ form.
   `.env.store.local` is gitignored — never commit the password.

2. **Account-deletion web page.** Google Play requires a _publicly reachable URL_ where users can
   request account deletion, even though in-app deletion already exists in
   `components/settings/account-settings.tsx`. Nothing currently serves this — add
   `https://wishlane.net/delete-account` to the Next.js app.
3. **In-app purchase products.** RevenueCat (`react-native-purchases`) is wired up, but the paywall
   renders _"Add products to the current RevenueCat offering to display them here"_ until the
   monthly and yearly subscriptions exist in **both** stores and are attached to a RevenueCat
   offering. Apple rejects paywalls that show nothing. See §5.
4. **Screenshots.** See §4. None exist in the repo today.
5. **No iOS build exists yet.** Only Android has been built (`production`, build 8). An iOS build
   must be uploaded before the listing can be submitted; metadata can be pushed beforehand.

---

## 3. Rejection risks worth reviewing

- **Guideline 1.2 — user-generated content.** Public wishlists, the Discover feed, and usernames
  are user-generated content visible to other users. Apple requires (a) a way to report objectionable
  content, (b) a way to block abusive users, and (c) published contact info. The app has _Remove
  Friend_ and a bug-report form, but no report-content or block-user action. This is the single
  most likely cause of rejection. Adding a "Report" action on wishlists/items and a "Block user"
  action alongside _Remove Friend_ would close it.
- **Guideline 3.1.2 — subscriptions.** The paywall must show subscription length and price, and
  link to Terms of Use and Privacy Policy from within the app, not just in the store description.
  Verify `components/subscription/subscription.tsx` renders both links.
- **Sale alerts.** The paywall advertises _"Sale alerts & tracking"_. If price-drop tracking is not
  actually shipping in 1.0, remove that bullet — advertising an absent feature is a 2.3.1 rejection.
- **Sign in with Apple.** Correctly configured (`usesAppleSignIn: true`) and required, since
  Google and Facebook sign-in are offered.

---

## 4. Graphic assets

Nothing here can be uploaded by CLI. The `app-store-screenshots` and `play-store-screenshots`
skills in this repo can generate these programmatically.

**App Store Connect**
| Asset | Spec | Required |
|---|---|---|
| 6.9" iPhone screenshots | 1290×2796 or 1320×2868 px | Yes, 3–10 |
| 13" iPad screenshots | 2064×2752 or 2048×2732 px | No — `ios.supportsTablet` is `false` |
| App icon | 1024×1024 px, no alpha, no rounding | Already in binary from `assets/images/icon.png` |
| App preview video | 15–30 s, same resolutions | Optional |

Apple scales the 6.9" set down to all smaller iPhones automatically.

**Google Play**
| Asset | Spec | Required |
|---|---|---|
| Phone screenshots | 16:9 or 9:16, 320–3840 px per side | Yes, 2–8 |
| Feature graphic | 1024×500 px, JPEG or 24-bit PNG | Yes |
| App icon | 512×512 px, 32-bit PNG | Yes |
| Tablet screenshots | 7" and 10" | Only if targeting tablets |
| Promo video | YouTube URL | Optional |

Suggested screenshot order (both stores): 1) a filled wishlist, 2) paste-a-link autofill, 3) friend's list with a reserved item, 4) Secret Santa draw, 5) Discover with event countdowns, 6) Premium paywall.

---

## 5. In-app purchases

Create in **both** stores, then attach to a RevenueCat offering:

- `wishlane_premium_monthly` — auto-renewing, 1 month
- `wishlane_premium_yearly` — auto-renewing, 1 year

App Store Connect: Subscriptions → create a Subscription Group (e.g. "Wishlane Premium") holding
both, set price tiers, add a localized display name and description per product, upload one
1024×1024 review screenshot, and attach the products to the 1.0 version for first review — IAPs
submitted after a build require a separate review pass.

Google Play: Monetize → Subscriptions → create both with a base plan each, set prices, and activate.
Play requires the app to have a published build on at least the internal track before subscriptions
can go live.

RevenueCat: add both products, put them in the `default` offering as `$rc_monthly` and
`$rc_annual`, and point the entitlement the app checks at them.

---

## 6. Google Play listing — paste-ready values

Store presence → Main store listing. Files are per language under
`fastlane/metadata/android/<playLocale>/`; `en-US` is the default listing, the other 40 are
translations you add under _Manage translations_ (or upload in one go with `supply`).

| Field             | Value                                       | Limit |
| ----------------- | ------------------------------------------- | ----- |
| App name          | `fastlane/metadata/android/en-US/title.txt` | 30    |
| Short description | `…/short_description.txt`                   | 80    |
| Full description  | `…/full_description.txt`                    | 4000  |
| Release notes     | `…/changelogs/default.txt`                  | 500   |

App category: **Lifestyle**. Tags: Wish list, Shopping, Social.
Contact email: `support@wishlane.net` · Website: `https://wishlane.net`
Privacy Policy: `https://wishlane.net/privacy-policy`

> To automate this later: create a service account in Google Cloud with the _Android Publisher_ role,
> grant it access in Play Console → Users and permissions, download the JSON key, then run
> `fastlane supply --json_key <key>.json --package_name com.berrynora.wishlane --skip_upload_apk --skip_upload_aab`
> from `apps/native/`. The `fastlane/metadata/android/` tree is already in the layout `supply` expects.
> The same key can go in `eas.json` under `submit.production.android.serviceAccountKeyPath`.

---

## 7. Google Play — Data safety form

Answers below reflect what the code actually does (Supabase auth + database, PostHog analytics with
`captureScreens: false` and no session replay, RevenueCat purchases, Expo push notifications,
`expo-image-picker` for profile photos).

- **Does your app collect or share any of the required user data types?** Yes
- **Is all of the user data collected by your app encrypted in transit?** Yes
- **Do you provide a way for users to request that their data is deleted?** Yes —
  in-app (Profile → Settings → Account) _and_ `https://wishlane.net/delete-account` (see blocker #3)

| Data type                    | Collected | Shared | Purpose                                           | Optional? |
| ---------------------------- | --------- | ------ | ------------------------------------------------- | --------- |
| Name                         | Yes       | No     | App functionality, Account management             | Optional  |
| Email address                | Yes       | No     | App functionality, Account management             | Required  |
| User IDs                     | Yes       | No     | App functionality, Analytics                      | Required  |
| Photos                       | Yes       | No     | App functionality (profile picture)               | Optional  |
| Purchase history             | Yes       | No     | App functionality (subscription entitlement)      | Required  |
| App interactions             | Yes       | No     | Analytics                                         | Required  |
| Other user-generated content | Yes       | No     | App functionality (wishlists, items, notes)       | Required  |
| Device or other IDs          | Yes       | No     | App functionality (push notifications), Analytics | Required  |

_Shared_ is "No" throughout: Supabase, PostHog and RevenueCat process data on your behalf as service
providers, which Google does not count as sharing. Do not tick any advertising or personalisation
purpose — the app serves no ads.

---

## 8. Google Play — remaining console forms

- **App access:** "All or some functionality is restricted." Add an instruction set named
  "Demo account", with the same demo email/password from blocker #1 and the sign-in steps.
- **Ads:** No, the app contains no ads.
- **Content rating (IARC questionnaire):** Category _Social Networking_. Violence: No.
  Sexuality: No. Language: No. Controlled substances: No. Gambling/simulated gambling: No.
  Users can interact/communicate: **Yes**. Shares user location: No.
  Allows purchase of digital goods: **Yes**. User-generated content shared: **Yes**.
  Expected outcome: Teen / PEGI 12.
- **Target audience and content:** Target ages **13+** (do not include under-13 — the app has
  social features and no parental controls, which would trigger Families Policy requirements).
  Appeals to children: No.
- **Government apps:** No. **Financial features:** None. **Health apps:** No.
- **News app:** No.
- **Data deletion:** URL from blocker #3.

---

## 9. App Store Connect — App Privacy

Not covered by `eas metadata:push`; fill under App Privacy in App Store Connect.

**Does your app collect data? Yes. Do you or your partners track users? No** — PostHog is
first-party analytics with no IDFA and no cross-app linkage, so no ATT prompt is required.

| Category     | Data                       | Purpose                      | Linked to user | Tracking |
| ------------ | -------------------------- | ---------------------------- | -------------- | -------- |
| Contact Info | Name, Email Address        | App Functionality            | Yes            | No       |
| User Content | Photos, Other User Content | App Functionality            | Yes            | No       |
| Identifiers  | User ID, Device ID         | App Functionality, Analytics | Yes            | No       |
| Purchases    | Purchase History           | App Functionality            | Yes            | No       |
| Usage Data   | Product Interaction        | Analytics                    | Yes            | No       |

Also set the **License Agreement (EULA)** — either keep Apple's standard EULA or paste
`https://wishlane.net/terms-of-service`. Required because the app sells subscriptions.

---

## 10. Commands

Run from `apps/native/`. An App Store Connect API key is already stored in EAS credentials, so
these are non-interactive.

```bash
# 1. Push the Apple listing (after filling the three REPLACE_ placeholders)
npx eas-cli metadata:push

# 2. Build
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production

# 3. Submit binaries
npx eas-cli submit --platform ios --profile production
npx eas-cli submit --platform android --profile production
```

`eas submit -p android` needs a Play service account key registered with EAS the first time; it
will prompt if one is missing. Android already has a finished production build (build 8) that can
be submitted without rebuilding.

`store.config.js` targets the same three-component marketing version as the native build.
`release.automaticRelease` is `false` — the build stays held after approval so you can release it
manually, with `phasedRelease` on for a 7-day staged rollout. Flip `automaticRelease` to `true` if
you would rather it go live the moment review passes.

Note that `eas metadata:pull` always writes `store.config.json`, regardless of `metadataPath`. If you
ever run it, treat the output as a scratch dump and port anything useful back into `store.config.js`
by hand — do not commit a `store.config.json` containing review credentials.

---

## 11. Localized listings

The app ships 41 locales (`gt.config.json`). Every one of them has a listing file at
`store/listings/<appLocale>.json` holding the store-agnostic copy: title, subtitle, short
description, promo text, keywords, the body sections, both billing paragraphs, the changelog, and
the two iOS permission strings.

```bash
pnpm --filter native store:metadata         # regenerate the derived files
pnpm --filter native store:metadata:check   # CI guard: fails if stale or over a limit
```

That script writes, and `store/listings.js` renders:

| Output                                          | Consumed by                                        |
| ----------------------------------------------- | -------------------------------------------------- |
| `fastlane/metadata/android/<playLocale>/…`      | Play Console / `fastlane supply` — all 41 locales  |
| `store/ios-locales/<iosLocale>.json`            | `expo.locales` in `app.json` → `InfoPlist.strings` |
| _(in memory)_ `apple.info` in `store.config.js` | `eas metadata:push` — the 31 App Store locales     |

Edit the listing JSON, never the generated files — the `--check` run will flag any drift.

**Locale coverage.** Google Play accepts all 41. App Store Connect offers a fixed list, so
**bg, sr, sl, lt, lv, et, bn, fil, fa and ur have no App Store localization** and fall back to
`en-US` there; their copy is still written and still used on Play and for the iOS permission
prompts. The three code mappings (App Store, Play, `.lproj`) live in `store/listings.js` — note
Play's Hebrew is the legacy `iw-IL`, and Portuguese is Brazilian throughout.

**Character limits** are enforced in code, not by eyeballing: `checkLimits` in `store/listings.js`
covers Play's 30/80/4000/500 and Apple's 30/30/170/100/4000. `store.config.js` throws before
uploading anything if a localization is over, since App Store Connect rejects the entire push.

Two Apple fields are deliberately absent. `releaseNotes` (What's New) is rejected on a version's
first submission — add it per locale from `changelogIntro`/`changelogBullets` when shipping 1.1.
Subtitle and keywords have no Google Play equivalent, so they are Apple-only in the listing files.
