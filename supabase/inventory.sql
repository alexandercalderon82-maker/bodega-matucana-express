-- Cantidades de inventario y descuentos manuales de ventas confirmadas.
-- Conserva productos y cantidades existentes; NULL significa aún sin configurar.
begin;
alter table public.matumarket_products add column if not exists in_stock boolean not null default true;
alter table public.matumarket_products add column if not exists stock_quantity integer check(stock_quantity between 0 and 1000000);
create or replace function public.matumarket_sync_stock()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.stock_quantity is not null then new.in_stock := new.stock_quantity > 0; end if;
  return new;
end $$;
drop trigger if exists matumarket_stock_sync on public.matumarket_products;
create trigger matumarket_stock_sync before insert or update on public.matumarket_products for each row execute function public.matumarket_sync_stock();
create table if not exists public.matumarket_inventory_sales (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  items jsonb not null check(jsonb_typeof(items)='array'),
  created_at timestamptz not null default now()
);
alter table public.matumarket_inventory_sales enable row level security;
revoke all on public.matumarket_inventory_sales from anon,authenticated;
grant select,insert on public.matumarket_inventory_sales to authenticated;
drop policy if exists "matumarket sales admin" on public.matumarket_inventory_sales;
create policy "matumarket sales admin" on public.matumarket_inventory_sales for all to authenticated using(public.matumarket_is_admin()) with check(public.matumarket_is_admin() and user_id=auth.uid());
create or replace function public.matumarket_confirm_sale(sale_id uuid,sale_items jsonb)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare item jsonb; seen text[]:=array[]::text[]; product_id text; quantity integer; remaining integer; inserted_id uuid; previous_items jsonb;
begin
  if not public.matumarket_is_admin() then raise exception 'Administrador requerido' using errcode='42501'; end if;
  if jsonb_typeof(sale_items) is distinct from 'array' or jsonb_array_length(sale_items) not between 1 and 200 then raise exception 'Venta inválida'; end if;
  for item in select * from jsonb_array_elements(sale_items) loop
    if jsonb_typeof(item->'productId') is distinct from 'string' or jsonb_typeof(item->'qty') is distinct from 'number' then raise exception 'Producto inválido'; end if;
    product_id:=item->>'productId';
    if product_id=any(seen) or (item->>'qty')::numeric not between 1 and 1000000 or (item->>'qty')::numeric<>trunc((item->>'qty')::numeric) then raise exception 'Cantidad inválida'; end if;
    seen:=array_append(seen,product_id);
  end loop;
  insert into public.matumarket_inventory_sales(id,user_id,items) values(sale_id,auth.uid(),sale_items) on conflict(id) do nothing returning id into inserted_id;
  if inserted_id is null then
    select items into previous_items from public.matumarket_inventory_sales where id=sale_id;
    if previous_items is distinct from sale_items then raise exception 'Identificador de venta reutilizado'; end if;
    return;
  end if;
  -- Orden estable de bloqueos: todas las cantidades se descuentan en una transacción.
  for item in select value from jsonb_array_elements(sale_items) order by value->>'productId' loop
    product_id:=item->>'productId'; quantity:=(item->>'qty')::integer;
    select stock_quantity into remaining from public.matumarket_products where id=product_id for update;
    if not found or remaining is null or remaining < quantity then raise exception 'Stock insuficiente o sin configurar'; end if;
    update public.matumarket_products set stock_quantity=remaining-quantity where id=product_id;
  end loop;
end $$;
revoke all on function public.matumarket_confirm_sale(uuid,jsonb) from public,anon;
grant execute on function public.matumarket_confirm_sale(uuid,jsonb) to authenticated;
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
