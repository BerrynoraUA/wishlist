// Staging-only demo data. Run with node scripts/seed-staging-showcase.mjs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { generateSecretSantaAssignment } from "../packages/backend/lib/secret-santa-assignment.ts";

const env = Object.fromEntries(
  readFileSync(".env.vercel-preview.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
const stagingUrl = "https://usqolbxpvnhiwdispocs.supabase.co";
if (env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") !== stagingUrl) {
  throw new Error("This script only seeds the verified staging project.");
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(stagingUrl, env.SUPABASE_SERVICE_ROLE_KEY, options);
const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const marker = "wishlane-staging-showcase-v1";
const workDir = "apps/native/artifacts/staging-showcase";
mkdirSync(workDir, { recursive: true });
function checked(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
async function upload(name, bytes) {
  const path = `showcase/${marker}/${name}.jpg`;
  const image = await sharp(bytes)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize(1200, 1200, {
      fit: name.startsWith("product-") ? "contain" : "inside",
      background: "#ffffff",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88 })
    .toBuffer();
  checked(
    await db.storage.from("items").upload(path, image, { contentType: "image/jpeg", upsert: true }),
  );
  return db.storage.from("items").getPublicUrl(path).data.publicUrl;
}

const sources = [
  [
    "kettle",
    "https://fellowproducts.com/products/stagg-ekg-electric-pour-over-kettle",
    "Fellow Stagg EKG Kettle",
    "A precision pour-over kettle for slow weekend coffee. I love the clean countertop design.",
  ],
  [
    "mug",
    "https://fellowproducts.com/products/carter-move-mug",
    "Fellow Carter Move Mug",
    "A travel mug for coffee on the go. A thoughtful little upgrade for my morning commute.",
  ],
  [
    "canister",
    "https://fellowproducts.com/products/atmos-vacuum-canister",
    "Fellow Atmos Vacuum Canister",
    "A beautiful vacuum canister to keep my coffee beans fresh and my kitchen tidy.",
  ],
  [
    "grinder",
    "https://fellowproducts.com/products/ode-brew-grinder-gen-2",
    "Fellow Ode Gen 2 Grinder",
    "A dedicated brew grinder for my home coffee corner. This is my big wish for better pour-over mornings.",
  ],
  [
    "bag",
    "https://baggu.com/products/mini-nylon-shoulder-bag-black-key-leash",
    "BAGGU Mini Nylon Shoulder Bag",
    "The black mini shoulder bag for everyday essentials. Easy to style for a coffee date or a night out.",
  ],
  [
    "flowers",
    "https://www.lego.com/en-us/product/wildflower-bouquet-10313",
    "LEGO Wildflower Bouquet",
    "Flowers that never wilt. I would love a quiet afternoon building this colourful bouquet for my desk.",
  ],
  [
    "roses",
    "https://www.lego.com/en-us/product/bouquet-of-roses-10328",
    "LEGO Bouquet of Roses",
    "A buildable bouquet of red roses for a cosy creative evening. A lovely keepsake for the bookshelf.",
  ],
  [
    "camera",
    "https://www.lego.com/en-us/product/retro-camera-31147",
    "LEGO Retro Camera",
    "A playful retro camera build for my shelf. A small gift with plenty of personality.",
  ],
  [
    "speaker",
    "https://www.jbl.com/FLIP-7.html",
    "JBL Flip 7 Speaker",
    "A portable speaker for park picnics and weekend adventures. Music makes every little trip better.",
  ],
  [
    "pouches",
    "https://baggu.com/products/go-pouch-set-sandy-liang",
    "BAGGU Go Pouch Set",
    "Pretty zip pouches to organise cables, cosmetics and travel essentials. A little order for my everyday bag.",
  ],
  [
    "tote",
    "https://checkout.baggu.com/products/standard-baggu-set-of-3-check-mix",
    "BAGGU Reusable Bag Set",
    "Reusable shopping bags in cheerful check prints. Perfect for the farmers market and weekend errands.",
  ],
  [
    "bottle",
    "https://owalalife.com/products/freesip?selectionType=local&Color=Round+we+Ghost&Material=Stainless+Steel&Size=32oz",
    "Owala FreeSip 32oz",
    "An everyday water bottle for walks, gym sessions and days out. The playful ghost print makes this one my favourite.",
  ],
  [
    "tumbler",
    "https://kinto-usa.com/products/20941",
    "KINTO Travel Tumbler 500ml",
    "A simple insulated tumbler for coffee or tea on long walks. I love its understated shape.",
  ],
];

// Official listing images and prices verified on 2026-10-10; these shops block
// direct HTML downloads. Keep product-page links as the source of truth.
const verifiedListings = {
  bottle: [
    "https://cdn.shopify.com/s/files/1/0439/2537/3087/files/32oz_Free_Sip_halloween_2026_Ghosts_sc.png?width=1200",
    "39.99",
  ],
  flowers: [
    "https://www.lego.com/cdn/cs/set/assets/bltc4a6c2103a34f22e/10313_alt2.png?width=1500&format=jpg",
    "59.99",
  ],
  roses: [
    "https://www.lego.com/cdn/cs/set/assets/blt08f4d88d801a4cf8/10328.png?width=1500&format=jpg",
    "59.99",
  ],
  camera: [
    "https://www.lego.com/cdn/cs/set/assets/blt5b4148cad80e42ea/31147.png?width=1500&format=jpg",
    "19.99",
  ],
  speaker: [
    "https://www.jbl.com/dw/image/v2/BFND_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw582e6b32/LS_JBL_FLIP_7_HERO_TURQUOISE_066_x2.png?sh=1000&sw=1000",
    "149.95",
  ],
};

if (process.argv.includes("--catalog")) {
  const catalog = [];
  for (const [key, url, name, description] of sources) {
    try {
      const listing = verifiedListings[key];
      const html = listing ? "" : (await download(url)).toString();
      const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
      const meta = (property) => {
        const tag = tags.find(
          (value) => value.includes(`"${property}"`) || value.includes(`'${property}'`),
        );
        return tag?.match(/content=["']([^"']*)["']/i)?.[1]?.replaceAll("&amp;", "&");
      };
      let image = listing?.[0] ?? meta("og:image");
      let price = listing?.[1] ?? meta("product:price:amount") ?? meta("og:price:amount") ?? null;
      let currency = listing
        ? "USD"
        : (meta("product:price:currency") ?? meta("og:price:currency") ?? null);
      let sourceUrl = url;
      let variantName = null;
      if (/fellowproducts|checkout\.baggu|kinto-usa/.test(url) || key === "pouches") {
        const jsonUrl =
          key === "pouches"
            ? "https://checkout.baggu.com/products/go-pouch-set-sandy-liang.js"
            : `${url}.js`;
        const product = JSON.parse((await download(jsonUrl)).toString());
        const variant = product.variants.find((value) => value.available) ?? product.variants[0];
        image = variant.featured_image?.src ?? product.featured_image;
        price = (variant.price / 100).toFixed(2);
        currency = "USD";
        sourceUrl = `${url}?variant=${variant.id}`;
        variantName = variant.title;
      }
      if (key === "bag") {
        price = "48.00";
        currency = "USD";
      }
      if (!image) throw new Error("No product image found");
      image = new URL(image, url).href;
      const bytes = await download(image);
      const dimensions = await sharp(bytes).metadata();
      writeFileSync(`${workDir}/${key}.jpg`, bytes);
      catalog.push({
        key,
        url: sourceUrl,
        name,
        description,
        price,
        currency,
        variant: variantName,
        source_image: image,
      });
      console.log(key, price, currency, `${dimensions.width}x${dimensions.height}`);
    } catch (error) {
      console.log(key, error.message);
    }
  }
  writeFileSync(`${workDir}/catalog.json`, JSON.stringify(catalog, null, 2));
  process.exit(0);
}

function id(key) {
  const hex = createHash("sha256").update(`${marker}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const people = [
  ["John Doe", "Coffee, music and little weekend adventures.", "#dbeafe", "#1d4ed8"],
  [
    "Jane Doe",
    "Creative afternoons, beautiful everyday things and time with friends.",
    "#fce7f3",
    "#be185d",
  ],
  [
    "James Smith",
    "Home coffee enthusiast and collector of playful desk objects.",
    "#fef3c7",
    "#92400e",
  ],
  [
    "Emily Johnson",
    "Flowers, thoughtful design and a well-packed weekend bag.",
    "#ede9fe",
    "#6d28d9",
  ],
  [
    "Michael Brown",
    "Always ready for a walk, a good playlist and a new adventure.",
    "#dcfce7",
    "#166534",
  ],
  [
    "Sarah Wilson",
    "Slow mornings, farmers markets and cosy evenings at home.",
    "#ffedd5",
    "#9a3412",
  ],
];
const users = [];
const existingUsers = [];
for (let page = 1; ; page++) {
  const batch = checked(await db.auth.admin.listUsers({ page, perPage: 1000 })).users;
  existingUsers.push(...batch);
  if (batch.length < 1000) break;
}
// Preflight every existing account before making changes. Never reset someone
// else's password to obtain a demo login.
for (const [name] of people) {
  const email = `${name.replaceAll(" ", ".")}@gmail.com`;
  const existing = existingUsers.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const client = createClient(stagingUrl, publicKey, options);
    checked(await client.auth.signInWithPassword({ email, password: email }));
    checked(await client.auth.signOut({ scope: "local" }));
  }
}
if (process.argv.includes("--preflight")) {
  console.log("Staging credentials and existing demo logins verified.");
  process.exit(0);
}
if (process.argv.includes("--verify")) {
  for (const [index, [name]] of people.entries()) {
    const email = `${name.replaceAll(" ", ".")}@gmail.com`;
    const client = createClient(stagingUrl, publicKey, options);
    const user = checked(await client.auth.signInWithPassword({ email, password: email })).user;
    const wishlists = checked(
      await client
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .like("external_id", `${marker}:%`),
    );
    const items = checked(
      await client
        .from("item")
        .select("id,image_url,url,description")
        .in(
          "wishlist_id",
          wishlists.map((list) => list.id),
        ),
    );
    const expectedLists = index < 2 ? 3 : 2;
    if (
      wishlists.length !== expectedLists ||
      items.length !== expectedLists * 4 ||
      items.some((item) => !item.image_url || !item.url || !item.description)
    )
      throw new Error(`Incomplete demo data for ${name}`);
    checked(await client.auth.signOut({ scope: "local" }));
    console.log(
      `Verified ${name}: login, ${wishlists.length} wishlists and ${items.length} complete wishes through RLS.`,
    );
  }
  process.exit(0);
}
const catalog = JSON.parse(readFileSync(`${workDir}/catalog.json`, "utf8"));
if (catalog.length !== sources.length)
  throw new Error("Finish verifying all product sources before seeding.");
const products = {};
for (const product of catalog) {
  products[product.key] = {
    ...product,
    image_url: await upload(
      `product-${product.key}-square`,
      readFileSync(`${workDir}/${product.key}.jpg`),
    ),
  };
}
for (const [index, [name, bio, background, foreground]] of people.entries()) {
  const email = `${name.replaceAll(" ", ".")}@gmail.com`;
  let user = existingUsers.find((value) => value.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = checked(
      await db.auth.admin.createUser({
        email,
        password: email,
        email_confirm: true,
        user_metadata: {
          display_name: name,
          full_name: name,
          nickname: name.toLowerCase().replaceAll(" ", "."),
        },
        app_metadata: { showcase: marker },
      }),
    ).user;
  }
  checked(
    await db.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: name, display_name: name },
    }),
  );
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("");
  const avatar = Buffer.from(
    `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" rx="200" fill="${background}"/><text x="200" y="215" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="140" font-weight="bold" fill="${foreground}">${initials}</text></svg>`,
  );
  const avatarUrl = await upload(`avatar-${index}`, avatar);
  checked(
    await db
      .from("profiles")
      .update({
        display_name: name,
        nickname: name.toLowerCase().replaceAll(" ", "."),
        bio,
        avatar_url: avatarUrl,
        userGuideStep: 15,
      })
      .eq("id", user.id),
  );
  checked(
    await db
      .from("user_settings")
      .update({ email_digest: false, preferred_locale: "en", display_currency: "USD" })
      .eq("user_id", user.id),
  );
  users.push({ id: user.id, name, email });
  if (index < 2) {
    // Staging demo entitlement only; no billing provider or payment is involved.
    checked(
      await db
        .from("user_subscriptions")
        .update({ plan: "pro", is_active: true, expires_at: "2027-10-10T00:00:00Z" })
        .eq("user_id", user.id),
    );
  }
  console.log(`Profile ready: ${name}`);
}

for (let first = 0; first < users.length; first++) {
  for (let second = first + 1; second < users.length; second++) {
    const a = users[first].id;
    const b = users[second].id;
    const existing = checked(
      await db
        .from("friends")
        .select("id")
        .or(`and(user_f.eq.${a},user_s.eq.${b}),and(user_f.eq.${b},user_s.eq.${a})`),
    );
    if (!existing.length) checked(await db.from("friends").insert({ user_f: a, user_s: b }));
  }
}
const covers = {};
for (const [key, photo] of Object.entries({
  birthday: "photo-1513151233558-d860c5398176",
  coffee: "photo-1442512595331-e89e73853f31",
  travel: "photo-1476514525535-07fb3b4ae5f1",
  home: "photo-1484154218962-a197022b5858",
  christmas: "photo-1512389142860-9c449e58a543",
})) {
  covers[key] = await upload(
    `cover-${key}`,
    await download(`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1600&q=90`),
  );
}
// Owner, title, personal introduction, cover, accent, event date, products.
const lists = [
  [
    0,
    "Birthday Wishes",
    "A few things I would love for my birthday. The best gift is celebrating together!",
    "birthday",
    1,
    "2026-11-07",
    ["speaker", "camera", "kettle", "bottle"],
  ],
  [
    0,
    "My Coffee Corner",
    "Building a little ritual for slow mornings and great coffee at home.",
    "coffee",
    2,
    null,
    ["grinder", "kettle", "canister", "mug"],
  ],
  [
    0,
    "Weekend Adventures",
    "Useful companions for road trips, park picnics and getting outside.",
    "travel",
    3,
    null,
    ["speaker", "bottle", "tumbler", "tote"],
  ],
  [
    1,
    "Birthday Wishes",
    "Thoughtful little treats and one or two bigger dreams. Any colour is lovely unless I noted a favourite.",
    "birthday",
    0,
    "2026-11-14",
    ["bag", "flowers", "pouches", "tumbler"],
  ],
  [
    1,
    "Cosy Home",
    "Beautiful things for a quiet Sunday, a fresh coffee and a home that feels like me.",
    "home",
    4,
    null,
    ["roses", "kettle", "canister", "flowers"],
  ],
  [
    1,
    "Everyday Favourites",
    "Small upgrades for my everyday routine, from market mornings to weekends away.",
    "travel",
    2,
    null,
    ["bag", "pouches", "tote", "bottle"],
  ],
  [
    2,
    "Birthday & Big Ideas",
    "Coffee gear and creative builds I have had my eye on.",
    "birthday",
    1,
    "2026-10-24",
    ["grinder", "camera", "speaker", "kettle"],
  ],
  [
    2,
    "Little Holiday Wishes",
    "Easy gift ideas for our festive exchange. Something small and thoughtful is perfect.",
    "christmas",
    3,
    "2026-12-18",
    ["mug", "camera", "tumbler", "tote"],
  ],
  [
    3,
    "Creative Afternoon",
    "An afternoon making something beautiful, followed by coffee with friends.",
    "home",
    4,
    "2026-11-01",
    ["flowers", "roses", "camera", "mug"],
  ],
  [
    3,
    "Out & About",
    "My favourite practical things for a busy day and a weekend getaway.",
    "travel",
    0,
    null,
    ["bag", "pouches", "bottle", "tote"],
  ],
  [
    4,
    "Weekend Kit",
    "Music, fresh air and an ice-cold drink. Everything for the next little adventure.",
    "travel",
    1,
    "2026-10-31",
    ["speaker", "bottle", "tumbler", "camera"],
  ],
  [
    4,
    "Coffee at Home",
    "A better morning brew and a tidy kitchen counter.",
    "coffee",
    2,
    null,
    ["kettle", "grinder", "canister", "mug"],
  ],
  [
    5,
    "Birthday Little Luxuries",
    "Flowers, coffee and the everyday things that make me smile.",
    "birthday",
    0,
    "2026-11-21",
    ["flowers", "bag", "tumbler", "pouches"],
  ],
  [
    5,
    "Slow Sunday",
    "For the farmers market, a long walk and an unhurried coffee at home.",
    "home",
    3,
    null,
    ["tote", "mug", "roses", "canister"],
  ],
];
for (const [
  index,
  [owner, title, description, cover, accent, eventDate, keys],
] of lists.entries()) {
  const wishlistId = id(`wishlist-${index}`);
  checked(
    await db.from("wishlist").upsert({
      id: wishlistId,
      user_id: users[owner].id,
      title,
      description,
      image_url: covers[cover],
      visibility_type: index % 3 === 1 ? 0 : 1,
      accent_type: accent,
      event_date: eventDate,
      is_pinned: title.startsWith("Birthday"),
      external_id: `${marker}:${index}`,
    }),
  );
  checked(
    await db.from("item").upsert(
      keys.map((key, itemIndex) => {
        const product = products[key];
        const variant =
          product.variant && product.variant !== "Default Title"
            ? ` My pick: ${product.variant}.`
            : "";
        return {
          id: id(`item-${index}-${itemIndex}`),
          wishlist_id: wishlistId,
          name: product.name,
          description: product.description + variant,
          price: product.price,
          currency: product.currency,
          url: product.url,
          image_url: product.image_url,
          priority_id:
            itemIndex === 0
              ? "11111111-0000-0000-0000-000000000011"
              : "11111111-0000-0000-0000-000000000002",
          external_id: `${marker}:${index}:${itemIndex}`,
          color_index: accent,
        };
      }),
    ),
  );
}
for (let owner = 0; owner < 2; owner++) {
  const groupId = id(`group-${owner}`);
  checked(
    await db.from("friend_groups").upsert({
      id: groupId,
      user_id: users[owner].id,
      name: "Our Gift Circle",
      description: "Birthday surprises, weekend plans and our annual Secret Santa.",
      color: owner === 0 ? "blue" : "pink",
      icon: "users",
    }),
  );
  checked(
    await db.from("friend_group_members").upsert(
      users
        .filter((_, index) => index !== owner)
        .map((user) => ({
          id: id(`member-${owner}-${user.id}`),
          group_id: groupId,
          user_id: user.id,
        })),
    ),
  );
}
for (const [index, [owner, name, date, budget, started]] of [
  [0, "Christmas with Friends", "2026-12-20", 75, true],
  [1, "Cosy Christmas Exchange", "2026-12-18", 50, false],
  [0, "New Year Little Surprises", "2027-01-02", 30, false],
].entries()) {
  const eventId = id(`santa-${index}`);
  const existing = checked(await db.from("secret_santa").select("id").eq("id", eventId));
  const eventImage = covers[index === 2 ? "birthday" : index === 1 ? "home" : "christmas"];
  if (existing.length) {
    checked(await db.from("secret_santa").update({ image_url: eventImage }).eq("id", eventId));
    continue;
  }
  checked(
    await db.from("secret_santa").insert({
      id: eventId,
      owner_id: users[owner].id,
      name,
      event_date: date,
      budget,
      currency: "USD",
      image_url: eventImage,
    }),
  );
  const members = index === 2 ? users.slice(0, 4) : users;
  checked(
    await db
      .from("secret_santa_participants")
      .insert(members.map((user) => ({ event_id: eventId, user_id: user.id }))),
  );
  if (started) {
    const client = createClient(stagingUrl, publicKey, options);
    checked(
      await client.auth.signInWithPassword({
        email: users[owner].email,
        password: users[owner].email,
      }),
    );
    const assignments = generateSecretSantaAssignment(
      members.map((user) => user.id),
      new Map(),
    );
    if (!assignments) throw new Error("Could not generate the demo draw");
    checked(
      await client.rpc("launch_secret_santa", {
        p_event_id: eventId,
        p_assignments: [...assignments].map(([user_id, receiver_id]) => ({ user_id, receiver_id })),
      }),
    );
    checked(await client.auth.signOut({ scope: "local" }));
  }
  if (index === 2)
    checked(
      await db.from("secret_santa_invites").insert(
        users.slice(4).map((user) => ({
          event_id: eventId,
          sender_id: users[owner].id,
          receiver_id: user.id,
          status: 0,
        })),
      ),
    );
}
// Seed reservations on friends' lists to fill both main profiles' gifting tabs.
for (const [owner, listIndex, itemIndex, status] of [
  [0, 8, 0, 1],
  [0, 12, 1, 2],
  [1, 6, 3, 1],
  [1, 10, 2, 2],
]) {
  checked(
    await db
      .from("item")
      .update({ status, reserved_by: users[owner].id })
      .eq("id", id(`item-${listIndex}-${itemIndex}`)),
  );
}
writeFileSync(
  `${workDir}/summary.json`,
  JSON.stringify(
    {
      users,
      wishlistIds: lists.map((_, index) => id(`wishlist-${index}`)),
      eventIds: [0, 1, 2].map((index) => id(`santa-${index}`)),
    },
    null,
    2,
  ),
);
console.log(
  "Created 6 demo profiles, 14 wishlists, 56 wishes, 15 friendships, 2 groups and 3 Secret Santa events.",
);
