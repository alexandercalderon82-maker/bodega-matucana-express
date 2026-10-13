-- Ejecutar en el SQL Editor de Supabase. Tablas nuevas: no modifica las tablas de la aplicación anterior.
begin;

create table if not exists public.matumarket_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function public.matumarket_is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists(select 1 from public.matumarket_admins where user_id = (select auth.uid())); $$;
revoke all on function public.matumarket_is_admin() from public;
grant execute on function public.matumarket_is_admin() to anon, authenticated;

create table if not exists public.matumarket_categories (
  name text primary key check(char_length(name) between 1 and 60 and name = regexp_replace(btrim(name), '\s+', ' ', 'g')),
  created_at timestamptz not null default now()
);
create unique index if not exists matumarket_category_unique_name on public.matumarket_categories
  (translate(lower(name),'áéíóúüñäëïöâêîôûàèìòù','aeiouunaeioaeiouaeiou'));
create table if not exists public.matumarket_products (
  id text primary key check(char_length(id) between 1 and 100),
  name text not null check(char_length(btrim(name)) between 1 and 100),
  category text not null references public.matumarket_categories(name) on update cascade,
  unit text not null check(char_length(btrim(unit)) between 1 and 80),
  price numeric(12,2) not null check(price > 0 and price <= 100000),
  image text not null default '' check(image = '' or image ~ '^https://' or image ~ '^/products/[a-z0-9-]+\.svg$'),
  active boolean not null default true,
  in_stock boolean not null default true,
  stock_quantity integer check(stock_quantity between 0 and 1000000),
  updated_at timestamptz not null default now()
);
alter table public.matumarket_products add column if not exists in_stock boolean not null default true;
alter table public.matumarket_products add column if not exists stock_quantity integer check(stock_quantity between 0 and 1000000);
create or replace function public.matumarket_touch_product()
returns trigger language plpgsql set search_path = public, pg_temp
as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists matumarket_product_timestamp on public.matumarket_products;
create trigger matumarket_product_timestamp before update on public.matumarket_products
  for each row execute function public.matumarket_touch_product();

alter table public.matumarket_admins enable row level security;
alter table public.matumarket_categories enable row level security;
alter table public.matumarket_products enable row level security;
revoke all on public.matumarket_admins, public.matumarket_categories, public.matumarket_products from anon, authenticated;
grant select on public.matumarket_admins to authenticated;
grant select on public.matumarket_categories, public.matumarket_products to anon, authenticated;
grant insert, update, delete on public.matumarket_categories, public.matumarket_products to authenticated;

drop policy if exists "matumarket admins own membership" on public.matumarket_admins;
create policy "matumarket admins own membership" on public.matumarket_admins for select to authenticated using(user_id = (select auth.uid()));
-- No políticas ni privilegios para que un cliente se otorgue permisos de administrador.
drop policy if exists "matumarket categories public read" on public.matumarket_categories;
create policy "matumarket categories public read" on public.matumarket_categories for select to anon, authenticated using(true);
drop policy if exists "matumarket categories admin write" on public.matumarket_categories;
create policy "matumarket categories admin write" on public.matumarket_categories for all to authenticated using(public.matumarket_is_admin()) with check(public.matumarket_is_admin());
drop policy if exists "matumarket products allowed read" on public.matumarket_products;
create policy "matumarket products allowed read" on public.matumarket_products for select to anon, authenticated using(active or public.matumarket_is_admin());
drop policy if exists "matumarket products admin write" on public.matumarket_products;
create policy "matumarket products admin write" on public.matumarket_products for all to authenticated using(public.matumarket_is_admin()) with check(public.matumarket_is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('matumarket-images','matumarket-images',true,5242880,array['image/webp'])
on conflict(id) do nothing;
drop policy if exists "matumarket images admin insert" on storage.objects;
create policy "matumarket images admin insert" on storage.objects for insert to authenticated
  with check(bucket_id='matumarket-images' and public.matumarket_is_admin() and (storage.foldername(name))[1]='products');
drop policy if exists "matumarket images admin delete" on storage.objects;
create policy "matumarket images admin delete" on storage.objects for delete to authenticated
  using(bucket_id='matumarket-images' and public.matumarket_is_admin());
drop policy if exists "matumarket images admin select" on storage.objects;
create policy "matumarket images admin select" on storage.objects for select to authenticated
  using(bucket_id='matumarket-images' and public.matumarket_is_admin());
drop policy if exists "matumarket images enforce admin" on storage.objects;
create policy "matumarket images enforce admin" on storage.objects as restrictive for all to anon, authenticated
  using(bucket_id<>'matumarket-images' or public.matumarket_is_admin())
  with check(bucket_id<>'matumarket-images' or public.matumarket_is_admin());
-- El bucket es público para mostrar imágenes. Subir y borrar requiere ser administrador.

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
  insert into public.matumarket_products(id,name,category,unit,price,image,active,in_stock,stock_quantity)
    select id,name,category,unit,price,coalesce(image,''),active,coalesce(in_stock,true),stock_quantity
    from jsonb_to_recordset(payload->'products') as p(id text,name text,category text,unit text,price numeric,image text,active boolean,in_stock boolean,stock_quantity integer)
    on conflict(id) do update set name=excluded.name,category=excluded.category,unit=excluded.unit,price=excluded.price,image=excluded.image,active=excluded.active,in_stock=excluded.in_stock,stock_quantity=excluded.stock_quantity;
  delete from public.matumarket_products where id not in (select value->>'id' from jsonb_array_elements(payload->'products'));
  delete from public.matumarket_categories where name not in (select value from jsonb_array_elements_text(payload->'categories'));
end; $$;
revoke all on function public.matumarket_replace_catalog(jsonb) from public, anon;
grant execute on function public.matumarket_replace_catalog(jsonb) to authenticated;
commit;
