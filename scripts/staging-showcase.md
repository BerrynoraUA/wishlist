# Staging showcase accounts

Website: https://staging.wishlane.net/login

Each account's password is its email **with the capitalisation shown below**.

| Role                | Name          | Email / password        |
| ------------------- | ------------- | ----------------------- |
| Main male profile   | John Doe      | John.Doe@gmail.com      |
| Main female profile | Jane Doe      | Jane.Doe@gmail.com      |
| Friend              | James Smith   | James.Smith@gmail.com   |
| Friend              | Emily Johnson | Emily.Johnson@gmail.com |
| Friend              | Michael Brown | Michael.Brown@gmail.com |
| Friend              | Sarah Wilson  | Sarah.Wilson@gmail.com  |

John and Jane each have three wishlists and staging Pro access until October 10, 2027. Their four friends each have two wishlists and Free access. Pro access is a staging database entitlement; no payment or billing subscription was created.

The demo contains 14 wishlists, 56 wishes, 15 friendships, two friend groups, two reservations and two purchased gifts. All six users are friends. Each main profile has an “Our Gift Circle” group.

Secret Santa examples:

- Christmas with Friends: December 20, 2026; $75 budget; six participants; draw completed.
- Cosy Christmas Exchange: December 18, 2026; $50 budget; six participants; awaiting a draw.
- New Year Little Surprises: January 2, 2027; $30 budget; four participants and two pending invitations.

Products were checked on October 10, 2026 using official listings from [Fellow](https://fellowproducts.com/products/stagg-ekg-electric-pour-over-kettle), [BAGGU](https://baggu.com/products/mini-nylon-shoulder-bag-black-key-leash), [LEGO](https://www.lego.com/en-us/product/wildflower-bouquet-10313), [JBL](https://www.jbl.com/FLIP-7.html), [Owala](https://owalalife.com/products/freesip) and [KINTO](https://kinto-usa.com/products/20941). Prices are snapshots for the linked variants and may change. Product images, wishlist covers and initial avatars are hosted in staging Storage.

John's previous “I WANT ALL OF IT” wishlist was deleted, and his password was reset as requested. The seeder does not retain that one-time reset/delete operation.

## Recreate or verify

Run from the repository root with the existing `.env.vercel-preview.local` staging credentials:

```powershell
node scripts/seed-staging-showcase.mjs --catalog
node scripts/seed-staging-showcase.mjs
node scripts/seed-staging-showcase.mjs --verify
```

The script rejects other Supabase project URLs. Existing accounts must already accept the passwords above; it never resets their passwords. Stable demo IDs prevent duplicate wishlists, wishes, groups and events. Rerunning refreshes demo details and the four seeded gift statuses; it preserves existing Secret Santa assignments. Downloads, the source catalog, account IDs and verification screenshots are saved under `apps/native/artifacts/staging-showcase/` (ignored by Git).

## Verification

All six passwords and each user's complete wishlist data were checked through authenticated reads. John and Jane's wishlists were inspected in the browser; all displayed images loaded. Friends, gift counts, the three event cards and the drawn recipient's budget-filtered gift ideas were also checked. Desktop and 390px mobile screenshots are in the artifact directory.

The staging website emitted React hydration warnings during page loads. At 390px, the document reports a 406px scroll width, although visible cards remain within the viewport. These website issues were observed during verification; this task changes demo data, not application UI code.

`pnpm ref` and `pnpm check-types` passed. The formatter's unrelated line-ending changes were reverted.
