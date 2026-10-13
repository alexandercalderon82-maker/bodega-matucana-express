-- Ejecutar una vez en SQL Editor; no cambia productos, cuentas ni pedidos existentes.
begin;
create table if not exists public.matumarket_store_settings (
  id integer primary key check (id = 1),
  settings jsonb not null check (
    jsonb_typeof(settings) = 'object'
    and jsonb_typeof(settings->'deliveryFee') = 'number'
    and (settings->>'deliveryFee')::numeric between 0 and 100000
    and jsonb_typeof(settings->'paymentMethods') = 'array'
    and settings->'paymentMethods' <@ '["Yape","Plin","Efectivo"]'::jsonb
    and jsonb_typeof(settings->'deliveryZones') = 'string' and char_length(settings->>'deliveryZones') between 1 and 500
    and jsonb_typeof(settings->'deliveryTime') = 'string' and char_length(settings->>'deliveryTime') between 1 and 500
    and jsonb_typeof(settings->'deliveryHours') = 'string' and char_length(settings->>'deliveryHours') between 1 and 500
    and jsonb_typeof(settings->'paymentInstructions') = 'string' and char_length(settings->>'paymentInstructions') between 1 and 500
    and settings ?& array['deliveryFee','paymentMethods','deliveryZones','deliveryTime','deliveryHours','paymentInstructions']
  )
);
alter table public.matumarket_store_settings enable row level security;
revoke all on public.matumarket_store_settings from anon, authenticated;
grant select on public.matumarket_store_settings to anon, authenticated;
grant insert, update on public.matumarket_store_settings to authenticated;
drop policy if exists "matumarket settings public read" on public.matumarket_store_settings;
create policy "matumarket settings public read" on public.matumarket_store_settings for select to anon, authenticated using(true);
drop policy if exists "matumarket settings admin write" on public.matumarket_store_settings;
create policy "matumarket settings admin write" on public.matumarket_store_settings for all to authenticated using(public.matumarket_is_admin()) with check(public.matumarket_is_admin());
commit;
