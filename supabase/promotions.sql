-- Añade ofertas y combos. No crea promociones ni modifica productos o cuentas.
begin;
create table if not exists public.matumarket_promotions (
  id uuid primary key,
  name text not null check(char_length(btrim(name)) between 1 and 100),
  kind text not null check(kind in ('offer','combo')),
  items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 20),
  price numeric(12,2) not null check(price>0 and price<=100000),
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  check(starts_at is null or ends_at is null or ends_at>starts_at)
);
create or replace function public.matumarket_validate_promotion()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare item jsonb; product_price numeric; total_price numeric:=0; seen text[]:=array[]::text[]; product_id text; quantity integer;
begin
  -- Permite retirar una promoción aunque sus productos o precios hayan cambiado.
  if TG_OP='UPDATE' and not new.active and new.items=old.items and new.price=old.price and new.kind=old.kind then return new; end if;
  if new.kind='offer' and (jsonb_array_length(new.items)<>1 or (new.items->0->>'qty')::numeric<>1) then raise exception 'Una oferta incluye una unidad'; end if;
  if new.kind='combo' and jsonb_array_length(new.items)<2 then raise exception 'Un combo incluye dos productos distintos'; end if;
  for item in select * from jsonb_array_elements(new.items) loop
    if jsonb_typeof(item->'productId') is distinct from 'string' or jsonb_typeof(item->'qty') is distinct from 'number' then raise exception 'Producto inválido'; end if;
    product_id:=item->>'productId';
    if (item->>'qty')::numeric<>trunc((item->>'qty')::numeric) or (item->>'qty')::numeric not between 1 and 100 or product_id=any(seen) then raise exception 'Cantidad o producto duplicado inválido'; end if;
    quantity:=(item->>'qty')::integer;
    select price into product_price from public.matumarket_products where id=product_id;
    if not found then raise exception 'Producto inexistente'; end if;
    total_price:=total_price+product_price*quantity; seen:=array_append(seen,product_id);
  end loop;
  if new.price>=total_price then raise exception 'El precio debe ser menor que el precio habitual'; end if;
  return new;
end $$;
drop trigger if exists matumarket_promotion_validation on public.matumarket_promotions;
create trigger matumarket_promotion_validation before insert or update on public.matumarket_promotions for each row execute function public.matumarket_validate_promotion();
alter table public.matumarket_promotions enable row level security;
revoke all on public.matumarket_promotions from anon,authenticated;
grant select on public.matumarket_promotions to anon,authenticated;
grant insert,update on public.matumarket_promotions to authenticated;
drop policy if exists "matumarket promotions read" on public.matumarket_promotions;
create policy "matumarket promotions read" on public.matumarket_promotions for select to anon,authenticated using((active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())) or public.matumarket_is_admin());
drop policy if exists "matumarket promotions admin write" on public.matumarket_promotions;
create policy "matumarket promotions admin write" on public.matumarket_promotions for all to authenticated using(public.matumarket_is_admin()) with check(public.matumarket_is_admin());
commit;
