import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const customer = '00000000-0000-4000-8000-000000000002';
let checks = 0;
async function deny(sql, args = []) {
  await assert.rejects(() => db.query(sql, args)); checks++;
}
async function role(name, user = '') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec(`set role ${name}`);
}
try {
  // Supabase service schemas are represented locally; the actual application SQL runs unchanged.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);
    create function storage.foldername(path text) returns text[] language sql immutable as $$ select string_to_array(path,'/'); $$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant all on storage.objects to anon,authenticated;
    grant usage on all sequences in schema storage to anon,authenticated;
    grant execute on function storage.foldername(text) to anon,authenticated;
    -- Simulates an overly broad pre-existing storage policy; the new restrictive policy must still protect its bucket.
    create policy legacy_storage_policy on storage.objects for all to anon,authenticated using(true) with check(true);
  `);
  const schema = await readFile(new URL('../supabase/setup.sql', import.meta.url), 'utf8');
  await db.exec(schema);
  await db.exec(schema); checks++; // Repeatable setup.
  await db.query('insert into auth.users(id) values($1),($2)', [admin, customer]);
  await db.query('insert into public.matumarket_admins(user_id) values($1)', [admin]);
  await db.exec("insert into public.matumarket_categories(name) values('Bebidas'); insert into public.matumarket_products(id,name,category,unit,price,active) values('public','Agua','Bebidas','1 litro',2,true),('hidden','Agua oculta','Bebidas','1 litro',3,false)");
  const insert = "insert into public.matumarket_products(id,name,category,unit,price) values('intruder','Intruso','Bebidas','1 litro',1)";
  const storageInsert = "insert into storage.objects(bucket_id,name) values('matumarket-images','products/unauthorized.webp')";
  await role('anon');
  assert.equal((await db.query('select * from public.matumarket_products')).rows.length,1); checks++;
  await deny(insert); await deny('select * from public.matumarket_admins'); await deny(storageInsert);
  await role('authenticated', customer);
  assert.equal((await db.query('select * from public.matumarket_admins')).rows.length,0); checks++;
  await deny('insert into public.matumarket_admins(user_id) values($1)',[customer]);
  await deny(insert); await deny(storageInsert);
  assert.equal((await db.query("update public.matumarket_products set price=99 where id='public' returning id")).rows.length,0); checks++;
  await deny("select public.matumarket_replace_catalog($1::jsonb)",[JSON.stringify({products:[],categories:[]})]);
  await role('authenticated', admin);
  assert.equal((await db.query('select * from public.matumarket_products')).rows.length,2); checks++;
  await db.exec("insert into public.matumarket_categories(name) values('Panadería'); update public.matumarket_products set price=5 where id='public'; insert into storage.objects(bucket_id,name) values('matumarket-images','products/admin.webp')"); checks++;
  await deny("insert into public.matumarket_categories(name) values('panaderia')");
  await deny("update public.matumarket_products set price=-1 where id='public'");
  const invalid = { categories:['Bebidas','Rollback'], products:[{id:'bad',name:'Error',category:'Rollback',unit:'1',price:-1,image:'',active:true}] };
  await deny('select public.matumarket_replace_catalog($1::jsonb)',[JSON.stringify(invalid)]);
  assert.equal((await db.query("select * from public.matumarket_categories where name='Rollback'")).rows.length,0); checks++;
  assert.equal((await db.query("select price from public.matumarket_products where id='public'")).rows[0].price,'5.00'); checks++;
  const replacement = {categories:['Nueva'],products:[{id:'new',name:'Nuevo',category:'Nueva',unit:'1 kg',price:7.5,image:'https://example.com/image.webp',active:true}]};
  await db.query('select public.matumarket_replace_catalog($1::jsonb)',[JSON.stringify(replacement)]);
  assert.equal((await db.query('select * from public.matumarket_products')).rows.length,1); checks++;
  await db.exec('reset role');await db.query('delete from public.matumarket_admins where user_id=$1',[admin]);
  await role('authenticated', admin);
  assert.equal((await db.query('select public.matumarket_is_admin() as admin')).rows[0].admin,false); checks++;
  await deny("insert into public.matumarket_categories(name) values('Unauthorized')");
  await deny(storageInsert);
  console.log(`PASS: ${checks} comprobaciones de permisos PostgreSQL, RLS, revocación, Storage, importación atómica y repetibilidad. No usa un proyecto Supabase real.`);
} finally { await db.close(); }
