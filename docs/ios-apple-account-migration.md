# iOS Apple account setup

The iOS app is **Wishlane**, owned by Valery Inchin's Apple Developer team. In
October 2026 iOS moved to a separate "wishlane tester" app on Roman's team
(`N2R2872DTQ`, app `6825701808`, bundle ID `com.berrynora.wishlanetester`). That move has
been reversed, and every submission profile targets the original app again.

| Setting               | Value                                    |
| --------------------- | ---------------------------------------- |
| Apple Developer team  | `7BBN562VZY`                             |
| App Store Connect app | `6792105704`                             |
| iOS bundle ID         | `com.berrynora.wishlane`                 |
| Share extension       | `com.berrynora.wishlane.share-extension` |
| App Group             | `group.com.berrynora.wishlane`           |
| Expo project          | `@berrynora/wishlane`                    |
| Android package       | `com.berrynora.wishlane`                 |

## App variants

`APP_VARIANT` (set per profile in `eas.json`) gives each build its own name and
URL scheme. Missing means production.

| Variant     | EAS profiles        | Name             | Scheme             | iOS bundle ID                |
| ----------- | ------------------- | ---------------- | ------------------ | ---------------------------- |
| development | `development`       | Wishlane Dev     | `wishlane-dev`     | `com.berrynora.wishlane.dev` |
| staging     | `staging`           | Wishlane Staging | `wishlane-staging` | `com.berrynora.wishlane`     |
| production  | `beta`,`production` | Wishlane         | `wishlane`         | `com.berrynora.wishlane`     |

Staging and production share one bundle ID and therefore one App Store Connect
app, so installing either replaces the other. The development client installs
alongside them; its share extension and App Group follow its bundle ID
(`.dev.share-extension`, `group.com.berrynora.wishlane.dev`). Android uses
`com.berrynora.wishlane` for every variant because the Firebase project only
registers that package. Local `pnpm dev`, `ios`, and `android` run the
development variant, so OAuth returns to `wishlane-dev://`.

Signing profiles, the Apple push key, and the submission API key are stored on
EAS per bundle ID, so they must belong to team `7BBN562VZY`. GitHub uses the
existing `EXPO_TOKEN`; Apple private keys are not needed in the repository or
GitHub workflows. The `.dev` bundle ID was only ever registered on Roman's team,
so the first development build on this team registers it and its devices.

The staging and production TestFlight workflows accept `platform: ios` to build
and submit iOS independently. Production build deduplication filters by the
application identifier as well as the version, so builds of the tester app
cannot suppress a build of this one.

## Authentication and billing

Apple Sign In client IDs in Supabase must include `com.berrynora.wishlane` (and
`com.berrynora.wishlane.dev` for development builds on staging). The tester IDs
can stay in the list; they do no harm and keep tester-app sessions working.

RevenueCat's iOS app is configured for `6792105704` (see
[the subscription setup](mobile-subscriptions-setup.md)). Set
`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` in the EAS environments to re-enable iOS
purchases; the app skips RevenueCat when the key is absent.

Testers who installed "wishlane tester" switch back to the Wishlane TestFlight
listing and sign in again. Apple identities are per team, so an Apple-only
account created in the tester app does not carry over automatically.
