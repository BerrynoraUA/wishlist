# Wishlane Ads Setup Roadmap

## Purpose

This roadmap describes what needs to be set up before Wishlane can advertise reliably. It is written as an execution checklist for paid acquisition across web, mobile app installs, retargeting, and seasonal campaigns.

The goal is not just to launch ads. The goal is to launch ads with enough tracking, creative, landing pages, and reporting to know whether spend is working.

## Assumptions

- Wishlane has web and mobile surfaces, but the product positioning should stay unified.
- Initial acquisition should focus on TikTok organic, TikTok paid, Meta paid, and retargeting.
- LinkedIn should be set up as an organic credibility channel now, but LinkedIn paid should wait until there is a workplace Secret Santa or B2B gift-exchange campaign.
- Google Search and Apple Search Ads should be used for high-intent capture after landing pages, store listings, and conversion tracking are ready.
- The app should advertise the free product first, then use Pro upgrade campaigns for warmer users.
- The most important conversion is not a raw click. The important conversions are account creation, wishlist creation, item creation, wishlist sharing, gift reservation, Secret Santa event creation, extension install, app install, and Pro upgrade.
- Do not scale budget until tracking and attribution are working.

## Current Platform Setup Notes

Use these current platform requirements as setup context:

- Meta requires an active ad account to run and manage paid campaigns, and app/web event tracking should be configured through Meta app events or related measurement tools.
- Google Ads conversion setup starts by choosing conversion surfaces, adding a data source, creating conversion actions, and confirming measurement.
- Google app campaign measurement commonly uses Google Analytics for Firebase for Android/iOS app conversions.
- TikTok supports App Promotion for app installs and app retargeting, and uses Pixel, Events Manager, App Events SDK, or MMP/event integrations for measurement.
- TikTok campaigns should run from an official Wishlane TikTok profile. TikTok has announced a transition away from Custom Identity for new campaigns, so the product account matters for paid ads as well as organic content.
- LinkedIn has a low official minimum daily budget, but it is usually a higher-cost channel and should be reserved for workplace Secret Santa, HR, office manager, or company gift-exchange angles.
- Apple Search Ads should be considered for App Store intent capture once the mobile app listing and conversion measurement are ready.

Reference docs:

- Meta Marketing API getting started: https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started
- Meta App Events API: https://developers.facebook.com/documentation/ads-commerce/marketing-api/app-event-api
- Google Ads conversion measurement: https://support.google.com/google-ads/answer/1722022
- Google Ads web conversions: https://support.google.com/google-ads/answer/16560108
- Google Ads app/Firebase conversion tracking: https://support.google.com/google-ads/answer/12077475
- TikTok App Promotion objective: https://ads.tiktok.com/help/article/what-is-app-promotion-objective
- TikTok App Events SDK: https://ads.tiktok.com/help/article/about-the-tiktok-app-events-sdk
- TikTok Pixel setup: https://ads.tiktok.com/help/article/get-started-pixel
- TikTok Custom Identity transition: https://ads.tiktok.com/business/en-US/blog/custom-identity-transition
- LinkedIn budget minimums: https://business.linkedin.com/advertise/ads/best-practices/maximize-your-budget
- Apple Search Ads: https://searchads.apple.com/

## Channel Priority

### 1. TikTok organic and paid: primary channel

TikTok should be the first channel to build seriously because Wishlane is visual, emotional, seasonal, and demo-friendly. The product can be explained through short videos showing real gift-planning problems:

- Someone does not know what to buy.
- A user shares a wishlist instead of sending scattered links.
- Two people avoid buying the same gift because one item is reserved.
- A Secret Santa organizer replaces spreadsheets with an event flow.
- A shopper saves a product through the Chrome extension.

Setup priorities:

- Create the official Wishlane TikTok account.
- Switch to a TikTok Business account if needed for ads and analytics.
- Connect the official profile to TikTok Ads Manager.
- Configure TikTok Pixel for web landing pages.
- Configure TikTok app events or an MMP/event integration before app-install scaling.
- Publish organic content before or alongside paid campaigns so the profile does not look empty.
- Use Spark Ads once organic videos show signal.

Organic posting target:

- 1-3 short videos per day for the first 30 days.
- Reuse the best TikTok concepts as Reels and Shorts.
- Test hooks aggressively; the first 2 seconds matter more than polished production.

Paid role:

- Test creative-market fit.
- Drive wishlist activation.
- Drive app installs after app events are working.
- Retarget video viewers, landing page visitors, and non-activated signups.

### 2. Meta paid and social presence: secondary channel

Meta should be the second priority because Facebook and Instagram can reach families, parents, friend groups, holiday shoppers, and older gift buyers better than TikTok alone.

Setup priorities:

- Create Facebook Page.
- Create Instagram account.
- Create Meta Business Manager.
- Connect Facebook Page and Instagram account.
- Create ad account and configure billing.
- Verify domain.
- Configure Pixel/Dataset.
- Configure key conversion events.
- Build retargeting audiences.

Paid role:

- Retarget TikTok and website traffic where possible.
- Run family gift-planning campaigns.
- Run holiday and Secret Santa campaigns.
- Test Reels, Stories, Feed, and carousel formats.
- Retarget shared wishlist viewers who did not sign up.

Organic role:

- Repurpose TikTok content to Instagram Reels.
- Post product updates, seasonal reminders, feature demos, and user education.
- Keep Facebook Page credible for ads; it does not need the same posting volume as TikTok.

### 3. LinkedIn organic now, paid later

LinkedIn should exist, but it should not be a core paid consumer acquisition channel at the start.

Setup priorities:

- Create LinkedIn Company Page.
- Add clear product description and website link.
- Post launch updates, roadmap updates, founder/product notes, and Secret Santa workplace content.
- Use the page for credibility when partners, press, or potential B2B users search for Wishlane.

Use LinkedIn paid only for:

- Workplace Secret Santa.
- HR teams.
- Office managers.
- Employee engagement campaigns.
- Company holiday gift exchanges.

Do not spend on LinkedIn paid for broad consumer wishlist acquisition until a B2B landing page and workplace-specific offer exist.

### 4. Google Search and Apple Search Ads: high-intent capture

Use these after tracking and landing pages are ready. They are better for capturing existing intent than creating demand from scratch.

Google Search should target:

- wishlist app
- gift wishlist app
- share wishlist
- Secret Santa generator
- gift exchange app
- Chrome wishlist extension

Apple Search Ads should target:

- wishlist
- gift list
- gift ideas
- Secret Santa
- Christmas list
- birthday wishlist

### 5. Retargeting: always-on after traffic exists

Retargeting should start once there is enough traffic to form useful audiences. It should focus on activation, not just signup.

Priority retargeting audiences:

- TikTok video viewers.
- Landing page visitors.
- Signup starters.
- Users who signed up but did not create a wishlist.
- Users who created a wishlist but did not add an item.
- Users who added an item but did not share.
- Shared wishlist viewers who did not sign up.
- Subscription page viewers.

## Phase 1: Define The Advertising Foundation

### 1. Define the primary business goal

Pick one primary paid-growth goal for the first 30 days.

Recommended first goal:

- Acquire users who create and share at least one wishlist.

Why:

- A user who only signs up may not understand the product yet.
- A user who creates and shares a wishlist creates the social loop that can bring in gift buyers.
- Shared wishlists can lead to reservations, friend requests, and more accounts.

Secondary goals:

- Mobile app installs.
- Chrome extension installs.
- Secret Santa event creation during seasonal windows.
- Pro upgrades for active users.

### 2. Define the funnel

Use this as the core paid funnel:

1. Ad impression.
2. Landing page or app store page view.
3. Signup.
4. First wishlist created.
5. First item added.
6. Wishlist shared.
7. Friend views shared wishlist.
8. Friend reserves an item or signs up.
9. Repeat usage or Pro upgrade.

The advertising setup should measure as much of this funnel as possible.

### 3. Define success metrics

Track these metrics before spending meaningfully:

- Cost per signup.
- Cost per first wishlist created.
- Cost per first item added.
- Cost per shared wishlist.
- Cost per reservation.
- Cost per app install.
- Cost per Secret Santa event created.
- Cost per Pro checkout started.
- Cost per Pro subscription.
- Activation rate from signup to first wishlist.
- Activation rate from first wishlist to first shared wishlist.
- Share-to-reservation conversion rate.
- Paid user retention after 1 day, 7 days, and 30 days where available.

Recommended first performance target:

- Optimize toward "first wishlist created" until there is enough volume to optimize toward "wishlist shared" or "reservation."

## Phase 2: Analytics And Attribution

### 1. Create a tracking plan

Create one canonical event list shared by web, mobile, backend, and ad platforms.

Required events:

- `sign_up_completed`
- `login_completed`
- `wishlist_created`
- `wishlist_item_created`
- `wishlist_shared`
- `shared_wishlist_viewed`
- `item_reserved`
- `item_marked_purchased`
- `friend_request_sent`
- `friend_request_accepted`
- `secret_santa_event_created`
- `secret_santa_event_launched`
- `secret_santa_invite_accepted`
- `chrome_extension_installed`
- `product_saved_from_extension`
- `subscription_page_viewed`
- `pro_checkout_started`
- `pro_subscription_started`

Recommended event properties:

- `platform`: web, ios, android, extension.
- `source`: direct, paid_meta, paid_google, paid_tiktok, apple_search_ads, organic_social, referral.
- `campaign_id`.
- `ad_id`.
- `landing_page`.
- `wishlist_visibility`.
- `item_count`.
- `currency`.
- `is_secret_santa`.
- `plan`: free or pro.

Avoid sending sensitive personal data or private wishlist contents to ad platforms.

### 2. Add UTM standards

All paid ads should use UTMs.

Required UTM fields:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term` where relevant

Recommended naming:

- `utm_source=tiktok|meta|google|apple_search_ads|linkedin|instagram|facebook`
- `utm_medium=paid_social|organic_social|paid_search|app_store_ads|retargeting`
- `utm_campaign=2026_q3_wishlist_activation_us`
- `utm_content=stop_guessing_video_01`
- `utm_term=gift_wishlist_app` for search campaigns

### 3. Set up web analytics

Required:

- Product analytics for the full app funnel.
- Web conversion tracking for landing pages and signup.
- Server-side or backend-confirmed events for high-value actions where possible.
- Consent and privacy handling appropriate to the markets where ads run.

Recommended:

- Keep ad-platform pixels focused on marketing attribution.
- Keep product analytics as the source of truth for activation and retention.
- Deduplicate browser and server events if the same conversion is sent from both.

### 4. Set up mobile analytics

Required before serious app-install spend:

- iOS and Android install attribution.
- App-open and signup tracking.
- In-app activation events such as wishlist created and wishlist shared.
- Subscription events if Pro is advertised.

Options:

- Use Firebase/Google Analytics for app conversion tracking, especially for Google App campaigns.
- Use a Mobile Measurement Partner if running meaningful spend across Meta, TikTok, Google, and Apple Search Ads.
- Use platform SDKs or conversion APIs where the app stack already supports them.

### 5. Set up ad-platform events

TikTok:

- Create official Wishlane TikTok account.
- Switch to TikTok Business account if appropriate.
- Create TikTok Ads Manager account and billing.
- Connect the official TikTok profile to ads.
- Set up Pixel through Events Manager for web campaigns.
- Set up App Events SDK or MMP/event integration for app campaigns.
- Configure standard or custom events.
- Build website, app, and video-engagement audiences.
- Prepare Spark Ads workflow for boosting organic winners.

Meta:

- Create or verify Meta Business Manager.
- Create or verify ad account and billing.
- Create Facebook Page.
- Create Instagram account.
- Connect Facebook Page and Instagram account to Business Manager.
- Create Pixel or Dataset for web events.
- Configure app events for mobile if promoting the app.
- Verify domain for web campaigns.
- Configure prioritized conversion events where required.
- Build custom audiences from site visitors and key events.

LinkedIn:

- Create LinkedIn Company Page.
- Add website, product description, logo, banner, and core positioning.
- Use organic posting only at first.
- Prepare paid account only when there is a workplace Secret Santa or B2B landing page.
- Do not launch broad consumer LinkedIn paid campaigns in the first phase.

Google:

- Create or verify Google Ads account and billing.
- Configure conversion actions.
- Link Google Analytics/Firebase where needed.
- Configure web conversions.
- Configure app conversions for Android/iOS campaigns.
- Set up remarketing audiences.

Apple Search Ads:

- Create Apple Search Ads account.
- Confirm App Store listing quality.
- Define keyword sets.
- Set up campaign groups by market or objective.
- Use app install and downstream activation reporting where available.

## Phase 3: Landing Pages And Store Assets

### 1. Build dedicated landing pages

Do not send every ad to the generic home page. Build landing pages by campaign intent.

Recommended pages:

- `/gift-wishlist-app`: general wishlist acquisition.
- `/share-wishlist`: sharing and reservation angle.
- `/secret-santa`: seasonal Secret Santa campaigns.
- `/chrome-extension`: browser extension install campaigns.
- `/families`: family and friend-group coordination.
- `/pro`: upgrade and retargeting campaigns.

Each landing page should have:

- One clear headline.
- One primary CTA.
- Product screenshots or demo visuals.
- Explanation of the core use case.
- Trust and privacy copy.
- Short feature proof points.
- FAQ addressing privacy, cost, and how sharing works.
- Tracking for CTA clicks and signup starts.

### 2. Improve app store listings

Required for mobile ads:

- Clear app name and subtitle.
- Keyword-focused app description.
- Screenshots showing wishlist creation, item details, sharing, reservations, Discover, and Secret Santa.
- Privacy description that matches actual data handling.
- Ratings and review strategy.

App Store screenshot themes:

- Create a wishlist.
- Add gift ideas with links and prices.
- Share with friends and family.
- Reserve gifts to avoid duplicates.
- Run Secret Santa.

### 3. Improve Chrome Web Store listing

Required for extension ads:

- Use clear "save products to wishlist" positioning.
- Show screenshots of product extraction, wishlist selector, success state, login, and saved item in the main app.
- Explain supported stores and fallback support.
- Explain privacy clearly: no browsing history collection, no third-party tracking, uses the user's Wishlane account.

## Phase 4: Audience Strategy

### 1. Cold audiences

Start with simple audience hypotheses.

Meta/TikTok cold audiences:

- Gift shopping.
- Online shopping.
- Holidays and seasonal gifting.
- Wedding planning.
- Baby shower planning.
- Home decor and moving.
- Family organization.
- Apps and productivity.
- Secret Santa and workplace gifting during seasonal windows.

Google Search intent:

- wishlist app
- gift wishlist app
- share wishlist
- birthday wishlist
- Christmas wishlist
- Secret Santa generator
- gift exchange app
- gift registry alternative
- Chrome wishlist extension

Apple Search Ads intent:

- wishlist
- gift list
- gift ideas
- Secret Santa
- Christmas list
- birthday wishlist
- registry

### 2. Warm audiences

Build retargeting audiences from:

- Landing page visitors.
- Signup starters who did not complete signup.
- Signed-up users who did not create a wishlist.
- Users who created a wishlist but did not add an item.
- Users who added an item but did not share.
- Shared wishlist viewers who did not sign up.
- Users who viewed subscription but did not start checkout.
- Users who started checkout but did not subscribe.

### 3. Lookalike or similar audiences

Build only after enough event volume exists.

Seed audiences:

- Users who created and shared a wishlist.
- Users whose shared list generated a reservation.
- Secret Santa event creators.
- Pro subscribers.
- Extension users who saved products.

Do not build lookalikes from low-quality events like all page visitors unless there is no better data.

## Phase 5: Creative Strategy

### 1. Build creative pillars

Use these pillars for initial creative testing:

- Stop guessing what to buy.
- No duplicate gifts.
- One wishlist for every occasion.
- Share the right list with the right people.
- Secret Santa without spreadsheets.
- Save products while shopping.
- Gift planning without group chat chaos.

### 2. Produce baseline creative assets

Minimum creative set before launch:

- 20 short vertical videos for TikTok, Reels, and Shorts.
- 5 static image ads.
- 5 carousel concepts.
- 3 app/demo screen recordings.
- 3 Secret Santa seasonal creatives.
- 3 Chrome extension creatives.
- 10 headline variations.
- 10 primary text variations.
- 5 CTA variations.

Creative should show the product. Avoid vague lifestyle-only ads.

TikTok-first content rules:

- Lead with a real pain point in the first 1-2 seconds.
- Show the product quickly.
- Make videos feel native, not like polished software ads.
- Test multiple hooks for the same product demo.
- Turn comments and user objections into new videos.
- Repost strong concepts to Instagram Reels and YouTube Shorts.

### 3. Suggested first ad concepts

Concept 1: Stop guessing

- Problem: "I never know what to buy."
- Visual: Friend opens a shared wishlist with prices and reserve buttons.
- CTA: Create your wishlist.

Concept 2: No duplicate gifts

- Problem: Two people bought the same present.
- Visual: Item status changes from available to reserved.
- CTA: Share a wishlist.

Concept 3: Save while shopping

- Problem: User finds an item online and forgets it later.
- Visual: Chrome extension saves item to Wishlane.
- CTA: Add to Wishlane.

Concept 4: Secret Santa

- Problem: Organizer juggling names, budget, and messages.
- Visual: Create event, invite friends, launch exchange, see receiver.
- CTA: Start Secret Santa.

Concept 5: Family gift planning

- Problem: Family asks what everyone wants.
- Visual: Group-based sharing and Discover.
- CTA: Start a family wishlist.

## Phase 6: Campaign Structure

### 1. Launch campaigns

Start with a small number of focused campaigns.

Campaign A: General wishlist activation

- Objective: signup or wishlist created.
- Channels: TikTok paid first, Meta second, Google Search after search landing page is ready.
- Landing page: `/gift-wishlist-app`.
- Creative pillars: stop guessing, one wishlist for every occasion.

Campaign B: Sharing and reservation

- Objective: wishlist shared or shared wishlist viewed.
- Channels: TikTok, Meta, retargeting.
- Landing page: `/share-wishlist`.
- Creative pillars: no duplicate gifts, group coordination.

Campaign C: Secret Santa

- Objective: Secret Santa event created.
- Channels: TikTok, Meta, Google Search, Apple Search Ads, LinkedIn organic.
- Landing page: `/secret-santa`.
- Creative pillars: no spreadsheets, easy gift exchange.
- Timing: seasonal priority before holidays.

Campaign D: Chrome extension

- Objective: extension install or product saved from extension.
- Channels: TikTok organic demos, TikTok paid, Google Search, retargeting, Chrome Web Store-related traffic where available.
- Landing page: `/chrome-extension`.
- Creative pillars: save while shopping.

Campaign E: Pro retargeting

- Objective: Pro checkout started or subscription started.
- Channels: retargeting and lifecycle email.
- Landing page: `/pro`.
- Audience: active free users near limits or users who viewed subscription.

Campaign F: Workplace Secret Santa

- Objective: Secret Santa event created or workplace lead/signup.
- Channels: LinkedIn organic first, LinkedIn paid later, Google Search, Meta retargeting.
- Landing page: `/secret-santa` initially, then a dedicated workplace page if the angle shows demand.
- Creative pillars: office Secret Santa without spreadsheets, easy holiday gift exchange, team gift planning.
- Timing: seasonal priority before workplace holiday planning.

### 2. Budget approach

Start small until tracking is proven.

Suggested first 2-week test:

- 50% TikTok paid for general wishlist activation and creative testing.
- 25% Meta paid for family, sharing, and reservation angles.
- 10% retargeting across TikTok and Meta once audiences exist.
- 10% Secret Santa if seasonal, otherwise Chrome extension or family positioning.
- 5% experiment reserve for Google Search or Apple Search Ads.
- 0% LinkedIn paid until a workplace Secret Santa campaign is ready.

Do not scale a campaign until:

- Events are firing correctly.
- Conversion reporting matches product analytics closely enough.
- The landing page converts at an acceptable rate.
- At least one creative angle shows signal.

### 3. Campaign naming convention

Use names that expose date, market, channel, objective, audience, and creative angle.

Example:

`2026_q3_us_meta_signup_cold_stop-guessing_video01`

Recommended format:

`{year}_{quarter}_{market}_{channel}_{objective}_{audience}_{angle}_{creative}`

## Phase 7: Launch Readiness Checklist

Do not launch paid spend until these are complete:

- Official TikTok account created.
- TikTok Ads Manager connected to the official profile.
- TikTok organic posting plan prepared.
- Facebook Page created.
- Instagram account created.
- Meta Business Manager created.
- LinkedIn Company Page created.
- Ad accounts created.
- Billing configured.
- Domain verified where required.
- App/store listings ready for mobile campaigns.
- Landing pages published.
- UTMs standardized.
- Web analytics installed.
- App analytics installed.
- Ad-platform pixels/events configured.
- Conversion events tested.
- Privacy policy updated for advertising and analytics.
- Cookie/consent behavior reviewed.
- Creative assets approved.
- Campaign naming convention agreed.
- Reporting dashboard created.
- Daily budget caps set.
- Owner assigned for daily monitoring.

## Phase 8: First 30-Day Execution Plan

### Week 1: Instrumentation and assets

Tasks:

- Finalize event tracking plan.
- Implement or verify analytics events.
- Configure TikTok account, TikTok Ads Manager, Meta Business Manager, Google Ads, Apple Search Ads, and LinkedIn Company Page.
- Create initial landing pages.
- Create first TikTok-first creative batch.
- Repurpose selected videos for Instagram Reels and Meta ads.
- Set up reporting dashboard.

Exit criteria:

- Test conversions appear in product analytics and ad platforms.
- Landing pages load quickly and track CTA clicks.
- App install and signup attribution is verified where applicable.

### Week 2: Soft launch

Tasks:

- Launch low-budget TikTok campaigns first.
- Launch Meta campaigns after the first TikTok creative batch is live.
- Start posting organically on TikTok and Instagram.
- Post LinkedIn Company Page introduction and product positioning.
- Monitor event quality daily.
- Watch for broken UTMs, bad links, tracking mismatch, and disapproved ads.
- Pause obviously broken creatives.
- Collect early conversion data.

Exit criteria:

- Each channel records clicks and landing page events.
- At least one campaign records signup or wishlist-created events.
- No major privacy, billing, or attribution issues.

### Week 3: Creative and audience testing

Tasks:

- Test more hooks against early winners.
- Turn the best organic TikTok posts into paid tests.
- Repurpose winning TikTok videos into Meta Reels placements.
- Split audiences by intent where useful.
- Compare landing page conversion by angle.
- Add retargeting for non-activated users.

Exit criteria:

- Identify 2-3 promising creative angles.
- Identify one channel with acceptable acquisition quality.
- Confirm whether "wishlist created" or "wishlist shared" has enough volume for optimization.

### Week 4: Optimization and scale decision

Tasks:

- Shift budget toward best channel and angle.
- Cut weak audiences and creatives.
- Launch new variants based on winners.
- Build retargeting campaigns for activation and Pro.
- Decide whether LinkedIn paid is justified for workplace Secret Santa.
- Decide whether to scale, hold, or rework landing pages.

Exit criteria:

- Clear cost per signup.
- Clear cost per wishlist created.
- Clear activation rate by campaign.
- Written recommendation for the next 30 days.

## Phase 9: Reporting Dashboard

Create one dashboard that shows:

- Spend by channel.
- Clicks by channel.
- Organic posts published by channel.
- Organic video views.
- Organic profile visits.
- Organic-to-site clicks.
- CPC.
- Landing page conversion rate.
- Signups.
- Cost per signup.
- Wishlists created.
- Cost per wishlist created.
- Items created.
- Wishlists shared.
- Shared wishlist views.
- Reservations.
- Secret Santa events created.
- App installs.
- Chrome extension installs.
- Pro checkouts.
- Pro subscriptions.
- Revenue.
- Retention by acquisition source where possible.

Add a daily notes section:

- What changed today.
- Which campaigns were paused.
- Which creatives were added.
- Any tracking issues.
- Any platform disapprovals.

## Phase 10: Privacy, Compliance, And Risk

Required:

- Review privacy policy for ad pixels, analytics, app events, and retargeting.
- Avoid sending private wishlist content, gift notes, names of private items, or sensitive user data to ad platforms.
- Respect platform policies for targeting and custom audiences.
- Use consent handling where legally required.
- Keep claims accurate, especially around price tracking, sale alerts, advanced sharing, and privacy.

Risk areas:

- Over-optimizing for cheap signups that never create wishlists.
- Running app install campaigns before app events are measurable.
- Advertising Pro-only features to Free campaigns without clear qualification.
- Sending users to generic pages that do not match the ad promise.
- Scaling before event quality is verified.
- Treating LinkedIn like a broad consumer channel before a workplace offer exists.
- Running TikTok paid from an empty or untrusted-looking profile.
- Making TikTok creative too polished and not native enough for the platform.

## Recommended Launch Order

1. Create official TikTok, Instagram, Facebook Page, and LinkedIn Company Page.
2. Set up tracking plan and UTMs.
3. Configure product analytics events.
4. Configure TikTok Ads Manager, Meta Business Manager, Google Ads, Apple Search Ads, billing, pixels, and app events.
5. Build landing pages.
6. Prepare app store and Chrome extension listings.
7. Produce TikTok-first creative batch 1.
8. Start TikTok organic posting and repurpose to Instagram Reels.
9. Launch low-budget TikTok wishlist activation campaigns.
10. Launch Meta paid and retargeting after the first creative batch is live.
11. Launch retargeting for non-activated signups.
12. Launch seasonal Secret Santa campaigns when timing fits.
13. Test Google Search and Apple Search Ads for high-intent demand.
14. Test LinkedIn paid only for workplace Secret Santa after a workplace-specific page exists.
15. Launch Pro campaigns only after enough active Free users exist.

## AI Prompting Notes

When using this roadmap with another AI, ask it to work in this order:

1. Convert the roadmap into a task board with owners, priority, and dependencies.
2. Create a tracking spec for the required events.
3. Draft landing page copy for each campaign page.
4. Generate creative briefs for each ad concept.
5. Generate campaign naming and UTM templates.
6. Generate a 30-day launch calendar.
7. Generate a reporting dashboard schema.
8. Generate a TikTok organic content calendar.
9. Generate a Meta retargeting structure.
10. Generate a LinkedIn organic page plan for workplace Secret Santa credibility.

The AI should not generate final ad campaigns until the measurement plan and landing pages are defined.
