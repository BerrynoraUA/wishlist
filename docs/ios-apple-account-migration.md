# iOS Apple account setup

The replacement TestFlight app is **wishlane tester**, owned by Roman's Apple
Developer team. It is a new app, rather than a transfer of the TestFlight-only
app on the previous account.

| Setting               | Value                                          |
| --------------------- | ---------------------------------------------- |
| Apple Developer team  | `N2R2872DTQ`                                   |
| App Store Connect app | `6825701808`                                   |
| iOS bundle ID         | `com.berrynora.wishlanetester`                 |
| Share extension       | `com.berrynora.wishlanetester.share-extension` |
| App Group             | `group.com.berrynora.wishlanetester`           |
| Expo project          | `@berrynora/wishlane` (unchanged)              |
| Android package       | `com.berrynora.wishlane` (unchanged)           |

## App variants

`APP_VARIANT` (set per profile in `eas.json`) gives each build its own name and
URL scheme. Missing means production.

| Variant     | EAS profiles        | Name             | Scheme             | iOS bundle ID                      |
| ----------- | ------------------- | ---------------- | ------------------ | ---------------------------------- |
| development | `development`       | Wishlane Dev     | `wishlane-dev`     | `com.berrynora.wishlanetester.dev` |
| staging     | `staging`           | Wishlane Staging | `wishlane-staging` | `com.berrynora.wishlanetester`     |
| production  | `beta`,`production` | wishlane tester  | `wishlane`         | `com.berrynora.wishlanetester`     |

Staging and production share one bundle ID and therefore one App Store Connect
app, so installing either replaces the other. The development client installs
alongside them; its share extension and App Group follow its bundle ID
(`.dev.share-extension`, `group.com.berrynora.wishlanetester.dev`). Android uses
`com.berrynora.wishlane` for every variant because the Firebase project only
registers that package. Local `pnpm dev`, `ios`, and `android` run the
development variant, so OAuth returns to `wishlane-dev://`.

Signing profiles, the Apple push key, and the submission API key are stored on
EAS. GitHub continues to use the existing `EXPO_TOKEN`; Apple private keys are
not needed in the repository or GitHub workflows. Development signing includes
the iPhone already registered on this Apple team; additional development
devices require registering the device and refreshing the ad hoc profiles.

The staging and production TestFlight workflows accept `platform: ios` to build
and submit iOS independently. All store submission profiles target the new
Apple app. Production build deduplication filters by the application identifier
as well as the version, so builds of the previous app cannot suppress a build
of the replacement app.

Use the GitHub workflow for the first build. The local Windows dependency tree
produced a different native fingerprint from EAS; the clean Linux workflow
passed the fingerprint comparison without changing the runtime-version policy.

## Authentication and billing

The staging Supabase project (`usqolbxpvnhiwdispocs`) accepts
`com.berrynora.wishlanetester` and `com.berrynora.wishlanetester.dev` alongside its
existing Apple client IDs, and allows the `wishlane-dev://google-auth` and
`wishlane-staging://google-auth` redirects. Development and staging builds both
use this project. Existing client IDs and the web Apple login configuration are
preserved.

The production EAS environment uses a different Supabase project,
`iwdgsvydfgtuqdoowbhj`. The available Supabase management credentials cannot
access it. Its Apple provider must also accept `com.berrynora.wishlanetester` before
Apple login can be considered ready for production-backed builds. Append the
new ID while preserving the existing client IDs and their order.

`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` is intentionally unset in local development
and the EAS environments. The app already skips RevenueCat configuration when
the key is absent. Purchasing and restoring purchases are unavailable until
the new Apple app's RevenueCat configuration is completed. Android's key is
unchanged. The existing subscription setup guide describes the previous Apple
app; configure products and credentials for the new app before enabling iOS
billing.

Testers install the replacement app through its own TestFlight listing and
sign in again. Existing Apple identities do not automatically migrate between
the two Apple teams; preserving an Apple-only tester's existing account needs
an explicit account-linking plan. Do not rewrite identities or delete accounts
as part of the app setup.
