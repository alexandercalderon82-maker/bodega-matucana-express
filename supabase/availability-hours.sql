-- Añade disponibilidad y valida los horarios. Conserva productos, pagos, tarifas y cuentas.
begin;
alter table public.matumarket_products add column if not exists in_stock boolean not null default true;
create or replace function public.matumarket_replace_catalog(payload jsonb)
returns void language plpgsql security invoker set search_path = public, pg_temp
as $$
begin
  if not public.matumarket_is_admin() then raise exception 'Administrador requerido' using errcode='42501'; end if;
  if jsonb_typeof(payload->'products') is distinct from 'array' or jsonb_typeof(payload->'categories') is distinct from 'array' then
    raise exception 'Catálogo inválido';
  end if;
  if jsonb_array_length(payload->'products') > 200 or jsonb_array_length(payload->'categories') > 50 then raise exception 'Catálogo demasiado grande'; end if;
  insert into public.matumarket_categories(name) select value from jsonb_array_elements_text(payload->'categories') on conflict(name) do nothing;
  insert into public.matumarket_products(id,name,category,unit,price,image,active,in_stock)
    select id,name,category,unit,price,coalesce(image,''),active,coalesce(in_stock,true)
    from jsonb_to_recordset(payload->'products') as p(id text,name text,category text,unit text,price numeric,image text,active boolean,in_stock boolean)
    on conflict(id) do update set name=excluded.name,category=excluded.category,unit=excluded.unit,price=excluded.price,image=excluded.image,active=excluded.active,in_stock=excluded.in_stock;
  delete from public.matumarket_products where id not in (select value->>'id' from jsonb_array_elements(payload->'products'));
  delete from public.matumarket_categories where name not in (select value from jsonb_array_elements_text(payload->'categories'));
end; $$;
revoke all on function public.matumarket_replace_catalog(jsonb) from public, anon;
grant execute on function public.matumarket_replace_catalog(jsonb) to authenticated;
alter table public.matumarket_store_settings drop constraint if exists matumarket_attention_hours;
alter table public.matumarket_store_settings add constraint matumarket_attention_hours check (
  (not (settings ? 'openingTime') or (jsonb_typeof(settings->'openingTime')='string' and settings->>'openingTime' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')) and
  (not (settings ? 'closingTime') or (jsonb_typeof(settings->'closingTime')='string' and settings->>'closingTime' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')) and
  (not (settings ? 'openingTime' and settings ? 'closingTime') or settings->>'openingTime' <> settings->>'closingTime') and
  (not (settings ? 'openingDays') or (jsonb_typeof(settings->'openingDays')='array' and settings->'openingDays' <@ '[0,1,2,3,4,5,6]'::jsonb)) and
  (not (settings ? 'storeMode') or (jsonb_typeof(settings->'storeMode')='string' and settings->>'storeMode' in ('auto','closed')))
);
commit;
