-- Stable identity for wishlists and items copied in from an external service
-- (currently the GoWish importer in the browser extension). Values are namespaced
-- by provider, e.g. 'gowish:MwDqZ9SQVrQ25ZcV', so a repeated import can recognise
-- what it already brought over instead of creating duplicates.

alter table public.wishlist
  add column if not exists external_id text;

alter table public.item
  add column if not exists external_id text;

-- Non-partial so `insert ... on conflict` can infer these as arbiter indexes.
-- Rows created by hand keep external_id null, and nulls are distinct in a unique
-- index, so this constrains imported rows only.
create unique index if not exists wishlist_user_id_external_id_key
  on public.wishlist using btree (user_id, external_id);

create unique index if not exists item_wishlist_id_external_id_key
  on public.item using btree (wishlist_id, external_id);
