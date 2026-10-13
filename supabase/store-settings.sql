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
alter table public.matumarket_store_settings drop constraint if exists matumarket_center_delivery_fee;
alter table public.matumarket_store_settings add constraint matumarket_center_delivery_fee check (
  not (settings ? 'centerDeliveryFee') or (
    jsonb_typeof(settings->'centerDeliveryFee') = 'number' and
    (settings->>'centerDeliveryFee')::numeric between 0 and 100000
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
-- Aplica únicamente las tarifas y métodos confirmados por el propietario.
-- Conserva horarios, tiempo estimado e instrucciones personalizados existentes.
insert into public.matumarket_store_settings(id,settings) values(1,
  '{"deliveryFee":5,"centerDeliveryFee":0,"deliveryZones":"Matucana centro: gratis. Alrededores: S/ 5. Confirmamos la zona según tu dirección por WhatsApp.","deliveryTime":"Coordinamos el tiempo estimado por WhatsApp al confirmar tu pedido.","deliveryHours":"7:00 a. m. – 10:00 p. m.","paymentMethods":["Yape","Efectivo"],"paymentInstructions":"Aceptamos Yape y efectivo. Coordinamos los datos de pago por WhatsApp después de confirmar disponibilidad y total."}'::jsonb
) on conflict(id) do update set settings = public.matumarket_store_settings.settings ||
  '{"deliveryFee":5,"centerDeliveryFee":0,"deliveryZones":"Matucana centro: gratis. Alrededores: S/ 5. Confirmamos la zona según tu dirección por WhatsApp.","paymentMethods":["Yape","Efectivo"]}'::jsonb;
commit;
