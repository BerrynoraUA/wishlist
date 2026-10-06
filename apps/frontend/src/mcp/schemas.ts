import { z } from "zod";

export const id = z.string().uuid();
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
export const money = z
  .string()
  .regex(/^\d{1,9}(\.\d{1,2})?$/)
  .nullable()
  .optional();
export const page = {
  offset: z.number().int().min(0).max(10000).default(0),
  limit: z.number().int().min(1).max(50).default(20),
};
export const search = { ...page, search: z.string().max(100).optional() };
export const itemFields = {
  name: text,
  description,
  price: money,
  priority_id: id.nullable().optional(),
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
