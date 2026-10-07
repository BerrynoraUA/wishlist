import { z } from "zod";

export const id = z.string().uuid();
/** Every record a bulk change targets, so the user reviews and confirms them together. */
export const ids = z
  .array(id)
  .min(1)
  .max(50)
  .refine((values) => new Set(values).size === values.length, "List each record once");
export const text = z.string().trim().min(1).max(200);
export const description = z.string().max(5000).nullable().optional();
export const httpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Use an HTTPS URL without credentials");
export const imageUrl = httpsUrl.nullable().optional();
export const date = z.string().date();
export const currency = z.string().regex(/^[A-Z]{3}$/);
const amount = z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, 'Use a decimal string such as "19.99"');
export const money = amount.nullable().optional();
/** Who can see a wishlist; stored as `visibility_type` 0-3 in this order. */
export const VISIBILITIES = ["public", "friends", "private", "selected_friends"] as const;
export const visibility = z.enum(VISIBILITIES);
export const priority = z.enum(["low", "medium", "high", "starred"]);
export const page = {
  offset: z.number().int().min(0).max(10000).default(0),
  limit: z
    .number()
    .int()
    .min(1)
    .default(20)
    .transform((value) => Math.min(value, 50))
    .describe(
      "Page size, default 20. Requests above 50 are capped at 50. When a result has has_more: true, request the next page with offset + limit.",
    ),
};
export const search = { ...page, search: z.string().max(100).optional() };
export const priceRange = { price_min: amount.optional(), price_max: amount.optional() };
export const itemFields = {
  name: text,
  description,
  price: money,
  priority: priority
    .nullable()
    .optional()
    .describe("At most three wishes per wishlist may be starred."),
  image_url: imageUrl,
  url: httpsUrl.nullable().optional(),
  currency: currency.nullable().optional(),
  discount_price: money,
  has_discount: z.boolean().optional(),
  discount_end_date: date.nullable().optional(),
  additional_links: z
    .array(z.object({ url: httpsUrl, title: text.optional() }).strict())
    .max(10)
    .optional(),
  color_index: z.number().int().min(0).max(11).nullable().optional(),
};
export const wishlistFields = {
  title: text,
  description,
  image_url: imageUrl,
  event_date: date.nullable().optional(),
  accent_type: z.number().int().min(0).max(4).optional(),
};
