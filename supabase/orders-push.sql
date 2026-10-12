-- Ejecutar DESPUÉS de setup.sql. Agrega pedidos y suscripciones; conserva el catálogo existente.
begin;
create table if not exists public.matumarket_orders (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 request_key uuid not null unique,
 request_hash text not null,
 source_hash text not null check(char_length(source_hash)=64),
 customer_name text not null,
 phone text not null,
 delivery_type text not null check(delivery_type in ('pickup','delivery')),
 address text not null default '',
 note text not null default '',
 items jsonb not null,
 subtotal numeric(12,2) not null,
 delivery_fee numeric(12,2) not null,
 total numeric(12,2) not null,
 status text not null default 'pending' check(status in ('pending','confirmed','completed','cancelled')),
 push_status text not null default 'pending' check(push_status in ('pending','accepted','failed','no_devices')),
 created_at timestamptz not null default now()
);
create index if not exists matumarket_orders_source_time on public.matumarket_orders(source_hash,created_at);
create table if not exists public.matumarket_push_subscriptions (
 endpoint text primary key check(endpoint ~ '^https://fcm\.googleapis\.com/(fcm/send/|wp/)'),
 user_id uuid not null references auth.users(id) on delete cascade,
 subscription jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.matumarket_orders enable row level security;
alter table public.matumarket_push_subscriptions enable row level security;
revoke all on public.matumarket_orders,public.matumarket_push_subscriptions from public,anon,authenticated;
grant select on public.matumarket_orders to authenticated;
grant update(status) on public.matumarket_orders to authenticated;
grant all on public.matumarket_orders,public.matumarket_push_subscriptions to service_role;
grant usage,select on sequence public.matumarket_orders_number_seq to service_role;
drop policy if exists "matumarket orders admin read" on public.matumarket_orders;
create policy "matumarket orders admin read" on public.matumarket_orders for select to authenticated using(public.matumarket_is_admin());
drop policy if exists "matumarket orders admin status" on public.matumarket_orders;
create policy "matumarket orders admin status" on public.matumarket_orders for update to authenticated using(public.matumarket_is_admin()) with check(public.matumarket_is_admin());
-- Las suscripciones son privadas. Solo los endpoints de servidor autenticados las gestionan.
create or replace function public.matumarket_create_order(payload jsonb,request_key uuid,source_hash text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 saved public.matumarket_orders; entry jsonb; product public.matumarket_products;
 quantity integer; subtotal numeric:=0; fee numeric:=0; line_items jsonb:='[]'::jsonb;
 fingerprint text:=encode(sha256(convert_to(payload::text,'UTF8')),'hex');
 ids text[]:='{}';
begin
 if char_length(source_hash)<>64 then raise exception 'Origen inválido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request_key::text,0));
 select * into saved from public.matumarket_orders o where o.request_key=matumarket_create_order.request_key;
 if found then
   if saved.request_hash<>fingerprint then raise exception 'No se puede reutilizar la confirmación para otro pedido'; end if;
   return jsonb_build_object('id',saved.id,'number',saved.number,'total',saved.total,'push_status',saved.push_status);
 end if;
 perform pg_advisory_xact_lock(hashtextextended(source_hash,1));
 if (select count(*) from public.matumarket_orders o where o.source_hash=matumarket_create_order.source_hash and created_at>now()-interval '10 minutes')>=5 then
   raise exception 'Demasiados pedidos. Espera unos minutos e intenta nuevamente';
 end if;
 if jsonb_typeof(payload) is distinct from 'object' or
 char_length(btrim(coalesce(payload->>'name',''))) not between 1 and 100 or
 coalesce(payload->>'phone','') !~ '^[+0-9 ()-]{6,20}$' or char_length(regexp_replace(coalesce(payload->>'phone',''),'[^0-9]','','g')) not between 6 and 15 or
 coalesce(payload->>'delivery','') not in ('pickup','delivery') or
 char_length(coalesce(payload->>'address',''))>200 or char_length(coalesce(payload->>'note',''))>500 or
 (payload->>'delivery'='delivery' and char_length(btrim(coalesce(payload->>'address','')))=0) then
 raise exception 'Completa correctamente los datos del pedido'; end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'Carrito inválido'; end if;
 if jsonb_array_length(payload->'items') not between 1 and 50 then raise exception 'Elige entre 1 y 50 productos'; end if;
 -- Orden estable al bloquear filas: evita interbloqueos y usa los precios vigentes.
 for entry in select value from jsonb_array_elements(payload->'items') order by value->>'id' loop
   if coalesce(entry->>'quantity','') !~ '^[1-9][0-9]?$' then raise exception 'Cantidad inválida'; end if;
   quantity:=(entry->>'quantity')::integer;
   if (entry->>'id')=any(ids) then raise exception 'Producto duplicado'; end if;
   ids:=array_append(ids,entry->>'id');
   select * into product from public.matumarket_products where id=entry->>'id' and active for share;
   if not found then raise exception 'Un producto ya no está disponible. Actualiza el carrito'; end if;
   subtotal:=subtotal+product.price*quantity;
   line_items:=line_items||jsonb_build_array(jsonb_build_object('id',product.id,'name',product.name,'unit',product.unit,'price',product.price,'quantity',quantity));
 end loop;
 if payload->>'delivery'='delivery' then fee:=5; end if;
 if subtotal+fee>100000 then raise exception 'El pedido supera el importe permitido'; end if;
 insert into public.matumarket_orders(request_key,request_hash,source_hash,customer_name,phone,delivery_type,address,note,items,subtotal,delivery_fee,total)
 values(request_key,fingerprint,source_hash,btrim(payload->>'name'),btrim(payload->>'phone'),payload->>'delivery',coalesce(payload->>'address',''),coalesce(payload->>'note',''),line_items,subtotal,fee,subtotal+fee)
 returning * into saved;
 return jsonb_build_object('id',saved.id,'number',saved.number,'total',saved.total,'push_status',saved.push_status);
end; $$;
revoke all on function public.matumarket_create_order(jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.matumarket_create_order(jsonb,uuid,text) to service_role;
commit;
