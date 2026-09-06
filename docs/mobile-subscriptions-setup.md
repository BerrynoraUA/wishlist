# Subscription setup — dashboard configuration guide

Step-by-step configuration for the four external services behind Wishlane Pro:

| Service                                                 | Role                                          |
| ------------------------------------------------------- | --------------------------------------------- |
| [App Store Connect](https://appstoreconnect.apple.com/) | Sells the iOS subscription                    |
| [Google Play Console](https://play.google.com/console/) | Sells the Android subscription                |
| [RevenueCat](https://app.revenuecat.com/)               | Unifies both stores, tells the app who is Pro |
| [Paddle](https://vendors.paddle.com/)                   | Sells the **web** subscription (see Part 4)   |

Do the parts in order — RevenueCat cannot be configured until Apple and Google have issued
their credentials.

**Constants used throughout**

| Thing                    | Value                                      |
| ------------------------ | ------------------------------------------ |
| iOS bundle ID            | `com.berrynora.wishlane`                   |
| Android package          | `com.berrynora.wishlane`                   |
| App Store Connect app ID | `6792105704`                               |
| Monthly price            | **$3.99**                                  |
| Yearly price             | **$24.99** (48% cheaper than 12 × monthly) |
| RevenueCat entitlement   | `pro_access` — must match exactly          |

> Deep links into Apple's and Google's consoles change often, so each step gives the
> in-dashboard navigation path in words alongside a stable entry-point link.

---

## Part 1 — Apple App Store Connect

**Console:** https://appstoreconnect.apple.com/ ·
**Docs:** [Manage subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/)

### 1.1 Sign the Paid Applications Agreement

Go to [Business](https://appstoreconnect.apple.com/agreements/) (formerly "Agreements, Tax,
and Banking") and sign the **Paid Applications Agreement**, then complete the bank account
and tax forms.

Nothing else in this part works until the status shows **Active**. Products created before
that stay invisible to the SDK.

### 1.2 Create the subscription group

1. App Store Connect → **My Apps** → Wishlane → **Monetization** → **Subscriptions**
   (older accounts: _Features → Subscriptions_).
2. Click **+** next to _Subscription Groups_.
3. **Reference Name**: `Wishlane Pro`. Internal only — never shown to users.
4. Click **Create**, then open the group and add a **Localization**:
   - **Display Name**: `Wishlane Pro` — this _is_ user-visible; it appears in the
     iOS Settings → Subscriptions screen.
   - Add one localization per App Store language you support; English is the minimum.

Both products must live in this one group. Apple treats a switch between two products in the
same group as an upgrade/downgrade of a single subscription. Products in _different_ groups
become two separate subscriptions the user pays for simultaneously.

### 1.3 Create the monthly subscription

Inside the group, click **+** to create a subscription.

1. **Reference Name**: `Wishlane Pro Monthly` (internal, ≤64 characters).
2. **Product ID**: `com.berrynora.wishlane.pro.monthly`

   > **Permanent.** A product ID can never be reused or renamed, even after deletion, for
   > any app on your account. Get it right the first time.

3. Click **Create**. You now land on the product's detail page — the remaining fields are
   all required before Apple will return it to the SDK.
4. **Subscription Duration**: `1 Month`.
5. **Subscription Prices** → **Add Subscription Price**:
   - Country: **United States**
   - Price: **$3.99**
   - Apple generates the equivalent price for all other regions. Click **Next**, review the
     worldwide table (adjust individual regions if you want round local numbers), then
     **Confirm**.
6. **Availability**: leave all countries/regions selected unless you deliberately want to
   restrict sales.
7. **App Store Localization** → **+**:
   - **Subscription Display Name**: `Monthly`
   - **Description**: e.g. `Unlimited lists, collaborators and Secret Santa exclusions.`
8. **Review Information**:
   - **Screenshot** — a capture of the app's paywall. Required.
   - **Review Notes** — how the reviewer reaches the paywall.

### 1.4 Create the yearly subscription

Repeat §1.3 in the **same group** with:

| Field          | Value                               |
| -------------- | ----------------------------------- |
| Reference Name | `Wishlane Pro Yearly`               |
| Product ID     | `com.berrynora.wishlane.pro.yearly` |
| Duration       | `1 Year`                            |
| Price          | **$24.99**                          |
| Display Name   | `Yearly`                            |

### 1.5 Set the subscription ranking

Open the group → **Subscription Ranking** (shown as levels). Drag so that:

| Level | Product |
| ----- | ------- |
| 1     | Yearly  |
| 2     | Monthly |

Ranking decides what happens when a subscriber switches plans. Moving to a **higher** level
(monthly → yearly) is an _upgrade_: it takes effect immediately with a prorated refund.
Moving **down** (yearly → monthly) takes effect at the next renewal. If both sat at the same
level, every switch would be deferred to renewal.

### 1.7 Submit for review

Each product shows a status badge. Confirm both read **Ready to Submit** — anything still in
_Missing Metadata_ is not returned by the SDK, which is the most common cause of an empty
paywall.

Your **first** subscription must be submitted together with an app version; later ones can be
submitted on their own from the Subscriptions page.

### 1.8 Create an In-App Purchase Key

**Users and Access** → **Integrations** → **In-App Purchase** → **+**.

Download the `.p8` file — you get exactly one chance — and note the **Key ID** and
**Issuer ID**.

> Collect for RevenueCat: `.p8` file, Key ID, Issuer ID.

### 1.9 Copy the App-Specific Shared Secret

Your app → **General** → **App Information** → **App-Specific Shared Secret** → generate or
reveal.

> Collect for RevenueCat: App-Specific Shared Secret.

### 1.10 Create a sandbox tester

**Users and Access** → **Sandbox** → **Test Accounts** → **+**. Use an email that has never
been an Apple ID.

On the device sign in under **Settings → Developer → Sandbox Apple Account** — _not_ in the
main App Store settings. Sandbox renewals are accelerated (1 month ≈ 5 min, 1 year ≈ 1 hour)
and auto-cancel after 6 renewals.

---

## Part 2 — Google Play Console

**Console:** https://play.google.com/console/ ·
**Docs:** [Create and manage subscriptions](https://support.google.com/googleplay/android-developer/answer/140504)

### 2.1 Publish a build to a testing track

Play returns **no product data at all** for an app that has never been published. Upload a
release to **Testing → Internal testing** and roll it out before continuing. The build must
contain the billing library — any recent Wishlane build does.

### 2.2 Create the subscription

1. Play Console → Wishlane → **Monetise with Play** → **Products** → **Subscriptions**.
2. **Create subscription**.
3. **Product ID**: `wishlane_pro`

   > **Permanent and unreusable**, like Apple's. Lowercase letters, digits, underscores and
   > periods only; must start with a letter or digit.

4. **Name**: `Wishlane Pro` (user-visible, ≤55 characters).
5. **Create**.

Then on the subscription's page fill in:

- **Benefits** — up to 4 entries, ≤40 characters each, e.g. `Unlimited wishlists`,
  `Collaborator access`, `Secret Santa exclusions`, `Custom colours & priorities`. These
  render in the Play purchase sheet.
- **Description** — a short summary of the subscription.

Note the shape difference from Apple: one Play _subscription_ holds many _base plans_, so
monthly and yearly are two base plans under `wishlane_pro`, not two products.

### 2.3 Add the monthly base plan

On the subscription page → **Base plans and offers** → **Add base plan**.

1. **Base plan ID**: `monthly` — permanent; lowercase letters, digits and hyphens.
2. **Type**: **Auto-renewing** (the alternative, _Prepaid_, does not renew and is not what we
   sell).
3. **Billing period**: **Monthly** (P1M).
4. **Grace period**: 7 days recommended. Keeps access during a failed payment while Google
   retries, instead of revoking immediately.
5. **Account hold**: leave enabled (30 days). Google pauses the subscription and gives the
   user a window to fix payment before final cancellation.
6. **Resubscribe**: allow, so a lapsed user can restart from the Play subscription screen.
7. **Set prices** → select **United States** → **$3.99** → let Play convert for the remaining
   regions → review the table → **Apply**.
8. Click **Activate**.

> A base plan left in **Draft** is invisible to the SDK even though the parent subscription
> exists. Activating it is a separate, easily forgotten click.

### 2.4 Add the yearly base plan

**Add base plan** again on the same subscription:

| Field          | Value         |
| -------------- | ------------- |
| Base plan ID   | `yearly`      |
| Type           | Auto-renewing |
| Billing period | Yearly (P1Y)  |
| Price (US)     | **$24.99**    |

Same grace period and account hold settings. **Activate** it.

### 2.8 Add license testers

Play Console → **Setup** → **License testing** → add the Google accounts you will test with.
Licence testers purchase for free and get compressed renewals (monthly ≈ 5 minutes).

---

## Part 3 — RevenueCat

**Dashboard:** https://app.revenuecat.com/ · **Docs:** https://www.revenuecat.com/docs/

### 3.2 Create the entitlement — the identifier is fixed

**Product catalog → Entitlements → + New**:

| Field       | Value                 |
| ----------- | --------------------- |
| Identifier  | `pro_access`          |
| Description | `Wishlane Pro access` |

`pro_access` is hard-coded in the app and on the server. Any other value silently leaves
every user on Free.

### 3.3 Import the products

**Product catalog → Products → + New**, once per store product — four in total.

**App Store products** — use the Apple product IDs verbatim:

- `com.berrynora.wishlane.pro.monthly`
- `com.berrynora.wishlane.pro.yearly`

**Play Store products** — Google's identifier is `subscriptionId:basePlanId`:

- `wishlane_pro:monthly`
- `wishlane_pro:yearly`

> Getting the Android format wrong is a common trip-up. It is **not** just `wishlane_pro` —
> each base plan is its own RevenueCat product, and the colon form is what the SDK reports
> back.

RevenueCat validates each ID against the store as you save it. A red "not found" here almost
always means the base plan is still in Draft (§2.3) or the product is in Missing Metadata
(§1.7).

### 3.4 Attach every product to the entitlement

Open **Entitlements → `pro_access` → Attach products** and add all four.

> This is the step most often missed. A product that is not attached will take the user's
> money, complete the purchase successfully, and still leave them on Free — with no error
> anywhere.

### 3.5 Create the offering

**Product catalog → Offerings → + New**:

1. **Identifier**: `default`, **Description**: `Standard paywall`.
2. Save, then set it as **Current**. The app reads `offerings.current`, so an offering that
   is not current is never shown.
3. Inside the offering, **+ New package** twice, using RevenueCat's **standard identifiers**:

| Package | Identifier    | Attach                                                        | Paywall renders                               |
| ------- | ------------- | ------------------------------------------------------------- | --------------------------------------------- |
| Annual  | `$rc_annual`  | `com.berrynora.wishlane.pro.yearly` + `wishlane_pro:yearly`   | "Yearly", per-month price, **SAVE 48%** badge |
| Monthly | `$rc_monthly` | `com.berrynora.wishlane.pro.monthly` + `wishlane_pro:monthly` | "Monthly", "Billed monthly"                   |

Each package holds **one product per store** — attach the iOS and Android product to the same
package so the app shows one row on both platforms.

A custom package identifier still renders, but falls back to the raw store title and
description and loses the savings badge. Dashboard ordering is irrelevant — the app sorts
annual → monthly → lifetime itself.

### 3.6 Configure the webhook

**Project settings → Integrations → Webhooks → + New**:

| Field         | Value                                          |
| ------------- | ---------------------------------------------- |
| URL           | `https://wishlane.net/api/webhooks/revenuecat` |
| Authorization | `Bearer <REVENUECAT_WEBHOOK_AUTH_KEY>`         |

Generate `REVENUECAT_WEBHOOK_AUTH_KEY` yourself (any long random string) and put the same
value in the web app's environment (Part 5). Include the literal `Bearer ` prefix — the
endpoint compares the whole header string.

Use **Send test webhook** and confirm a `200`. Without a working webhook, renewals and
cancellations that happen while the app is closed never reach the database.

### 3.7 Copy the API keys

**Project settings → API keys**:

| Key                        | Where it goes                            |
| -------------------------- | ---------------------------------------- |
| Public SDK key, App Store  | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`     |
| Public SDK key, Play Store | `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` |
| **Secret** key (`sk_…`)    | `REVENUECAT_SECRET_API_KEY` (server)     |

The secret key is what the server uses to read subscriber status. A public key there fails
with an explicit configuration error.

---

## Part 4 — Paddle (web subscriptions)

**Dashboard:** https://vendors.paddle.com/ ·
**Sandbox:** https://sandbox-vendors.paddle.com/ ·
**Docs:** https://developer.paddle.com/

> **Status in this repo:** the environment variable names below already exist in
> `apps/frontend/.env` and `user_subscriptions` has `paddle_subscription_id` /
> `paddle_customer_id` columns, but **no code reads them yet** — there is no Paddle SDK
> dependency and no `/api/webhooks/paddle` route. Configuring the dashboard as below is valid
> and safe, but web billing will not function until that code exists. Mobile subscriptions
> are unaffected.

Use **Paddle Billing**, not the legacy Paddle Classic. Build everything in **sandbox** first;
sandbox and live are separate accounts with separate IDs and tokens.

### 4.1 Create and verify the account

Sign up, then complete **verification** under _Paddle → Account_. Paddle is the merchant of
record, so it reviews your business details and website before enabling live checkouts.
Expect a few business days — start it early.

### 4.2 Approve the website / payment link domain

**Checkout → Website approval**, and set the **default payment link** to
`https://wishlane.net/`.

Paddle refuses to open a checkout on an unapproved domain, which appears client-side as a
checkout that simply never renders.

### 4.3 Create the product

**Catalog → Products → New product**:

| Field        | Value                                                       |
| ------------ | ----------------------------------------------------------- |
| Name         | `Wishlane Pro`                                              |
| Tax category | **Standard digital goods** (or _SaaS_, per your accountant) |
| Description  | Short summary shown at checkout                             |
| Image        | Wishlane icon, optional but improves the checkout           |

The tax category drives Paddle's VAT/sales-tax handling — pick it deliberately, it is not
cosmetic.

### 4.4 Create the two prices

On the product page → **New price**, twice.

**Monthly**

| Field          | Value                    |
| -------------- | ------------------------ |
| Description    | `Wishlane Pro — Monthly` |
| Type           | Recurring                |
| Billing period | 1 month                  |
| Amount         | **$3.99 USD**            |

**Yearly**

| Field          | Value                   |
| -------------- | ----------------------- |
| Description    | `Wishlane Pro — Yearly` |
| Type           | Recurring               |
| Billing period | 1 year                  |
| Amount         | **$24.99 USD**          |

Optionally add other currencies, and a **trial period** on either price if you want the web
funnel to mirror a mobile free trial.

Copy each price ID (`pri_…`):

> Collect: `NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID`, `NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID`.

### 4.5 Create a client-side token

**Developer tools → Authentication → Client-side tokens → New**. Safe to expose in the
browser; it is the only Paddle credential the frontend needs.

> Collect: `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, plus `NEXT_PUBLIC_PADDLE_ENV` set to `sandbox`
> or `production`.

### 4.6 Create the webhook destination

**Developer tools → Notifications → New destination**:

| Field | Value                                      |
| ----- | ------------------------------------------ |
| URL   | `https://wishlane.net/api/webhooks/paddle` |
| Type  | Webhook                                    |

Subscribe at minimum to the events the shipped types cover
(`packages/backend/types/paddle.ts`):

- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `transaction.completed`

Copy the destination's **secret key** (`pdl_ntfset_…`):

> Collect: `PADDLE_WEBHOOK_SECRET`.

### 4.7 Plan for user mapping

Paddle has no equivalent of RevenueCat's app user ID, so the checkout must pass the Supabase
user ID as `custom_data.user_id` — exactly the shape `PaddleCustomData` in
`packages/backend/types/paddle.ts` expects. Without it the webhook cannot tell which account
to upgrade.

---

## Part 5 — Where the collected values go

### Native app — `apps/native/.env` **and** the EAS dashboard

```dotenv
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxx
EXPO_PUBLIC_WEB_URL=https://wishlane.net
```

`eas.json` assigns an `environment` per build profile, so these must **also** be added as EAS
environment variables at https://expo.dev/ → your project → **Environment variables**, for
each of `development`, `preview` and `production`. A store build with a missing key does not
crash — the paywall just reports "RevenueCat is not configured for this build."

`EXPO_PUBLIC_WEB_URL` must point at a web deployment using the **same Supabase project** as
the app, or every sync returns 401.

### Web app — `apps/frontend/.env` and the production host

```dotenv
REVENUECAT_SECRET_API_KEY=sk_xxx              # §3.7
REVENUECAT_WEBHOOK_AUTH_KEY=<random secret>   # §3.6 — must match RevenueCat exactly
SUPABASE_SERVICE_ROLE_KEY=<service role key>  # writes user_subscriptions
NEXT_PUBLIC_REVENUECAT_API_KEY=rcb_xxx        # RevenueCat Web Billing SDK

NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=<token>       # §4.5
NEXT_PUBLIC_PADDLE_ENV=sandbox|production     # §4.5
NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID=pri_xxx   # §4.4
NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID=pri_xxx    # §4.4
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx          # §4.6
```

The in-app prices come from the stores, but the web pricing page renders `PRICING` in
[`packages/backend/types/subscription.ts`](../packages/backend/types/subscription.ts)
($3.99 / $24.99). If you change a store price, change that constant too or the two will
disagree silently.

---

## Configuration checklist

**Apple**

- [ ] Paid Applications Agreement **Active**, banking and tax complete
- [ ] One subscription group with a localized display name
- [ ] Monthly product, 1 month, $3.99
- [ ] Yearly product, 1 year, $24.99 — **same group**
- [ ] Both localized, with review screenshot and notes → **Ready to Submit**
- [ ] Subscription ranking: yearly above monthly
- [ ] In-App Purchase Key `.p8` downloaded; Key ID and Issuer ID noted
- [ ] App-Specific Shared Secret copied
- [ ] Sandbox tester created

**Google**

- [ ] Build published to internal testing
- [ ] Subscription `wishlane_pro` created with benefits
- [ ] Base plan `monthly` P1M $3.99 — **Activated**
- [ ] Base plan `yearly` P1Y $24.99 — **Activated**
- [ ] Grace period and account hold configured
- [ ] License testers added

**RevenueCat**

- [ ] Entitlement identifier is exactly `pro_access`
- [ ] Four products imported — Android ones in `wishlane_pro:monthly` form
- [ ] All four **attached to the entitlement**
- [ ] Offering marked **Current**; packages `$rc_annual` and `$rc_monthly`, each holding both
      stores' products
- [ ] Webhook configured with the `Bearer ` prefix; test send returns 200
- [ ] Public and secret API keys copied

**Paddle**

- [ ] Account verified; website/payment-link domain approved
- [ ] Product created with a tax category
- [ ] Monthly $3.99 and yearly $24.99 prices; price IDs copied
- [ ] Client-side token created; environment set
- [ ] Notification destination created; secret key copied
- [ ] Aware that the app-side integration is not built yet

**Environment**

- [ ] Native keys in `.env` _and_ in all three EAS environments
- [ ] Web keys on the production deployment
- [ ] `EXPO_PUBLIC_WEB_URL` and the native app share a Supabase project
- [ ] `PRICING` constant matches the store prices
