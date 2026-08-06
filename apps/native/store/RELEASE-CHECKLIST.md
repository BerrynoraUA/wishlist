# Wishlane — Store Release Checklist

App: **Wishlane** · `com.berrynora.wishlane` · version from `expo.version` in `app.json`
Generated 2026-07-25, updated 2026-08-02. Source of truth for the listing copy is
`store/listings/<locale>.json` — one file per locale the app ships, covering both stores. See §11.
Store credentials and the API access they depend on are in §12; the EAS Workflows that tie it all
together are in §13.

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

EAS Metadata is Apple-only; there is no Google Play equivalent in EAS. Both binary-upload paths are
live as of 2026-08-02 — see §12 for the credentials behind them and §13 for the workflow that runs
build and submit together.

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

   The phone goes through a `phone()` guard in `store.config.js` that rejects spaces, dashes, a
   `00` prefix and a missing `+`. It cannot catch a number that is well-formed E.164 but too short
   for its country — App Store Connect applies per-country plan rules and rejects the whole upload
   with _"The phone number must be in a valid format"_. Ireland and Ukraine both want 12 digits
   after the `+`. If you want that caught locally, add `libphonenumber-js` and parse in `phone()`.

   The App Review contact name is `Roman Yatskovyna`, set in `store.config.js`.

2. **Account-deletion web page.** Google Play requires a _publicly reachable URL_ where users can
   request account deletion, even though in-app deletion already exists in
   `components/settings/account-settings.tsx`. Nothing currently serves this — add
   `https://wishlane.net/delete-account` to the Next.js app.
3. **In-app purchase products.** RevenueCat (`react-native-purchases`) is wired up, but the paywall
   renders _"Add products to the current RevenueCat offering to display them here"_ until the
   monthly and yearly subscriptions exist in **both** stores and are attached to a RevenueCat
   offering. Apple rejects paywalls that show nothing. See §5.
4. **Screenshots.** See §4. None exist in the repo today.
5. ~~**No iOS build exists yet.**~~ Resolved 2026-08-02 — a `staging` iOS build was produced and
   accepted by TestFlight through the workflow in §13, non-interactively. iOS credentials
   (distribution certificate, provisioning profile, App Store Connect API key) are all on EAS.
6. **Play production track is gated.** This is a personal developer account, so Google requires a
   closed test with 12+ testers running 14 continuous days before production access can be applied
   for. `eas.json` has `submit.production.android.track: "production"`, which Play will refuse
   until that is cleared. Use the `staging` profile (`internal` track) meanwhile.
7. **Internal testers.** The internal track has no tester list yet, so a successful submit still
   reaches nobody. Play Console → Testing → Internal testing → _Testers_.

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
`$rc_annual`, and point the entitlement the app checks at them (`pro_access`, pinned in
`providers/subscription-provider.tsx`).

**Prices appear in two unrelated places and nothing keeps them in sync.**

- _In the app_ — automatic. RevenueCat hands the SDK the localized, currency-correct price from
  StoreKit / Play Billing at runtime. Never hardcode anything here.
- _In the store listings_ — manual. Listings are static text uploaded before install, so no SDK
  runs. `PRICES` in `store/listings.js` holds `$3.99` monthly and `$24.99` yearly, substituted into
  the `{monthly}` / `{yearly}` placeholders in each listing's `subscriptionPrice` sentence.

RevenueCat is not a source of truth for price — its v2 API `Product` object has no price or
currency field at all. When you create the real products, reconcile `PRICES` against App Store
Connect and Play Console by hand, then re-run `store:metadata` and `store:apple:push`.

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
# 1. Push the Apple listing (needs .env.store.local filled in)
npm run store:apple:push          # eas metadata:push --profile production
npm run store:apple:pull          # snapshot ASC into store.config.json, for diffing only

# 2. Build
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production

# 3. Submit binaries
npx eas-cli submit --platform ios --profile production
npx eas-cli submit --platform android --profile production

# Build and submit in one step
npx eas-cli build --platform android --profile staging --auto-submit

# Re-submit an existing build without rebuilding (after fixing a submit-side problem)
npx eas-cli submit --platform android --profile staging --id <buildId>
```

`--profile production` is required for any `metadata` command: `metadataPath` is only declared on
`submit.production.ios`, deliberately, so the `staging` profile cannot overwrite the live listing.

`eas submit -p android` needs a Play service account key registered with EAS the first time; it
will prompt if one is missing. See §12 — the key alone is not enough, the Play Developer API also
has to be enabled in the same Cloud project.

`apple.version` in `store.config.js` is read from `expo.version` in `app.json` rather than written
out, so the metadata target moves with the marketing version automatically. `autoIncrement` only
bumps the build number / version code, so `app.json` really is the source for the marketing
version. Keep `apps/native/package.json` at the same value by hand — nothing enforces that.

The push targets a version that must exist in App Store Connect. A version created by an uploaded
build always exists; a freshly renamed one may not. If `metadata:push` cannot find the version,
either upload a build first or rename the version in App Store Connect to match.

`release.automaticRelease` is `false` — the build stays held after approval so you can release it
manually, with `phasedRelease` on for a 7-day staged rollout. Flip `automaticRelease` to `true` if
you would rather it go live the moment review passes.

`eas metadata:pull` always writes `store.config.json`, regardless of `metadataPath`. That file is
gitignored: it is a read-only snapshot of what App Store Connect currently holds, useful only for
diffing, never an input. It will also show schema errors in the editor (`Missing property
"privacyPolicyUrl"` and similar) that reflect gaps in App Store Connect, not in `store.config.js`.
Delete it when you are done comparing.

---

## 11. Localized listings

The app ships 41 locales (`gt.config.json`). Every one of them has a listing file at
`store/listings/<appLocale>.json` holding the store-agnostic copy: title, subtitle, short
description, promo text, keywords, the body sections, both billing paragraphs, the price sentence,
the changelog, and the two iOS permission strings.

`subscriptionPrice` is the one field with placeholders: `{monthly}` and `{yearly}` are filled from
`PRICES` in `store/listings.js` by `renderPrice`, and the result is appended to the subscription
section of both the Apple and Play descriptions. Changing a price is a two-line edit there, not 41
re-translated sentences.

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

**Apple's restricted-word check matches substrings, not words.** `eas metadata:push` rejected the
Dutch, Swedish, Danish and Norwegian descriptions because `betaling` / `betalning` — "the payment"
— contains `beta`, which Apple restricts as implying incomplete functionality. Those four now say
"the amount" (`bedrag`, `beloppet`, `beløbet`, `beløpet`) instead. Watch for the same collision in
any new copy or locale; the check is not language-aware, so a false positive is likely rather than
exceptional. `checkLimits` does not cover restricted words — that failure only surfaces at push
time.

---

## 12. Store credentials and API access

Set up 2026-08-02. All keys live on EAS servers (encrypted at rest), not in the repo. Keep local
copies outside the working tree — `C:/Users/roman/secrets/` on this machine. `credentials.json`
holds the Android upload keystore only; iOS uses EAS-hosted credentials throughout.

### Google Play

Four separate things, and **all four are required** — the first three are not enough on their own.

1. **App record + first manual upload.** The Play Developer API cannot create an app's first
   release. `com.berrynora.wishlane` was created in Play Console and version code 11 (`1.0.0`) was
   uploaded by hand to the internal track. Every subsequent release can go through `eas submit`.
2. **Service account.** `eas-submit@wishlane-493019.iam.gserviceaccount.com`, created in Google
   Cloud (**IAM & Admin → Service Accounts**), JSON key downloaded from its **Keys** tab. Play
   Console never issues the key — it only grants the account permission. Granted the
   `Firebase Messaging Admin` role in Cloud IAM so the same key also serves FCM V1 push.
3. **Play Console permissions.** Invited the service account email under
   **Users and permissions** (account level, not app level — reachable only after clicking
   _← All apps_) with, on Wishlane: view app information, manage testing tracks, release apps to
   testing tracks, release to production.
4. **Enable the Google Play Android Developer API.** This is the step that is easy to miss and
   produces a confusing failure — the submit gets all the way to `fastlane supply`, then dies with
   `PERMISSION_DENIED: Google Play Android Developer API has not been used in project
532727436378 before or it is disabled`. Enable at
   <https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com?project=wishlane-493019>
   and allow a few minutes to propagate.

Upload the key with `npx eas-cli credentials --platform android` → _Google Service Account_ →
_…for Play Store Submissions_, and again under _…for Push Notifications (FCM V1)_. Ignore the
_Push Notifications (Legacy)_ menu entry — Google decommissioned legacy FCM in June 2024.

The pull-down menu wants a path to the **service account JSON** (`"type": "service_account"`,
`private_key`, `client_email`), not `google-services.json`. EAS detects and rejects the latter. The
`api-0000000000000000000-111111-aaaaaabbbbbb.json` shown at the path prompt is placeholder hint
text, not a real default.

### Apple

| Credential                | How                                                                  |
| ------------------------- | -------------------------------------------------------------------- |
| Distribution certificate  | Generated by `eas credentials -p ios`                                |
| Provisioning profile      | Generated by `eas credentials -p ios`                                |
| APNs key                  | Generated by `eas credentials -p ios` (needed by expo-notifications) |
| App Store Connect API key | Created manually, uploaded to EAS                                    |

The App Store Connect API key is the analogue of the Google service account key: App Store Connect
→ **Users and Access → Integrations → Team Keys**, role **App Manager**, download the `.p8`
**once** (it cannot be re-downloaded), and keep the Issuer ID and Key ID with it. Only the Account
Holder can create Team Keys.

`ascAppId` is in `eas.json` as `"6792105704"` — a digits-only App Store Connect app ID, not the
Team ID (`7BBN562VZY`, 10 alphanumeric) and not the bundle ID. Find it under
**App Store Connect → your app → General → App Information → Apple ID**.

Unlike Android, iOS has no manual-first-upload restriction: the API can upload a version's first
build.

---

## 13. EAS Workflows

Definitions are in `apps/native/.eas/workflows/`, wrappers in `package.json` as `workflow:*`.
All have their `on:` triggers commented out, so every one is manual-only today.

| Workflow                | Jobs                                            | Script                         |
| ----------------------- | ----------------------------------------------- | ------------------------------ |
| `staging-deploy.yml`    | build + submit, both platforms, `staging`       | `npm run workflow:staging`     |
| `build.yml`             | build only, both platforms, profile as input    | `npm run workflow:build`       |
| `development-build.yml` | build both + publish an update to `development` | `npm run workflow:development` |
| `production-build.yml`  | —                                               | `npm run workflow:production`  |
| `release-build.yml`     | —                                               | `npm run workflow:release`     |

Cloud workflows are non-interactive: every credential has to exist on EAS beforehand, because
nothing can prompt for an Apple login mid-run. `staging-deploy.yml` also pins
`environment: preview` on all four jobs, so build-time variables must be present in the EAS
**preview** environment, not just in a local `.env`.

**First full run, 2026-08-02** (`019fc3a5-3a0c-782f-b5a3-636bd85efda0`):

| Job              | Result                                        |
| ---------------- | --------------------------------------------- |
| `build_ios`      | SUCCESS                                       |
| `submit_ios`     | SUCCESS — reached TestFlight                  |
| `build_android`  | SUCCESS                                       |
| `submit_android` | FAILURE — Play Developer API disabled, §12 #4 |

### Known issue

`development-build.yml`'s `publish_update` job (`type: update`) fails during `expo export` with:

```
Unable to resolve module @formatjs/intl-pluralrules/locale-data/zh-Hant
```

`metro.config.js` already aliases that specifier to `.../zh` (the package ships language-level
plural data only, and Chinese has one plural category regardless of script). The alias is intact —
`uniwind/metro` chains to it rather than replacing it, and the identical export command
(`expo export --source-maps --dump-assetmap --platform ios --platform android`) succeeds locally,
as does the `build_android` job in the staging workflow, which bundles through the same config.
So the fault is specific to the `type: update` job environment, not the resolver. Unconfirmed lead:
that job's log shows `npm warn deprecated` lines even though the workflow declares
`corepack: true` / `pnpm: 11.9.0`, which would mean a different dependency tree than the pnpm
workspace produces.
