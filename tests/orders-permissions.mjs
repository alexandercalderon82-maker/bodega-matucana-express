import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const db=new PGlite();const admin='00000000-0000-4000-8000-000000000001';const customer='00000000-0000-4000-8000-000000000002';let checks=0;
async function role(name,user=''){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec(`set role ${name}`);}
async function deny(sql,args=[]){await assert.rejects(()=>db.query(sql,args));checks++;}
const payload={name:'Cliente de prueba',phone:'999888777',delivery:'delivery',address:'Dirección de prueba',note:'',items:[{id:'agua',quantity:2,price:0}]};
const create=(value=payload,id=randomUUID(),source='a'.repeat(64))=>db.query('select public.matumarket_create_order($1::jsonb,$2::uuid,$3::text) as receipt',[JSON.stringify(value),id,source]);
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;grant usage on schema auth to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);create function storage.foldername(path text) returns text[] language sql immutable as $$select string_to_array(path,'/');$$;alter table storage.objects enable row level security;`);
 await db.exec(await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8'));
 const migration=await readFile(new URL('../supabase/orders-push.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);checks++;
 await db.query('insert into auth.users(id) values($1),($2)',[admin,customer]);await db.query('insert into public.matumarket_admins(user_id) values($1)',[admin]);
 await db.exec("insert into public.matumarket_categories(name) values('Bebidas');insert into public.matumarket_products(id,name,category,unit,price,active) values('agua','Agua','Bebidas','1 litro',2,true),('hidden','Oculto','Bebidas','1 litro',3,false)");
 await role('anon');await assert.rejects(()=>create());checks++;await deny('select * from public.matumarket_orders');await deny('select * from public.matumarket_push_subscriptions');
 await role('authenticated',customer);await assert.rejects(()=>create());checks++;await deny("insert into public.matumarket_push_subscriptions(endpoint,user_id,subscription) values('https://fcm.googleapis.com/fcm/send/test',$1,'{}')",[customer]);assert.equal((await db.query('select * from public.matumarket_orders')).rows.length,0);checks++;
 await role('service_role');const key=randomUUID();const saved=(await create(payload,key)).rows[0].receipt;assert.equal(Number(saved.total),9);checks++;
 const again=(await create(payload,key)).rows[0].receipt;assert.equal(again.id,saved.id);checks++;
 await assert.rejects(()=>create({...payload,name:'Otro cliente'},key));checks++;
 assert.equal((await db.query('select * from public.matumarket_orders')).rows.length,1);checks++;
 await assert.rejects(()=>create({...payload,items:[{id:'agua',quantity:100}]}));checks++;
 await assert.rejects(()=>create({...payload,items:[{id:'hidden',quantity:1}]}));checks++;
 await assert.rejects(()=>create({...payload,items:[{id:'agua',quantity:1},{id:'agua',quantity:1}]}));checks++;
 await assert.rejects(()=>create({...payload,address:''}));checks++;
 await assert.rejects(()=>create({...payload,phone:'texto inválido'}));checks++;
 for(let i=0;i<4;i++)await create(payload);await assert.rejects(()=>create(payload));checks++;
 const pickup=(await create({...payload,delivery:'pickup',address:''},randomUUID(),'b'.repeat(64))).rows[0].receipt;assert.equal(Number(pickup.total),4);checks++;
 await role('authenticated',customer);assert.equal((await db.query('select * from public.matumarket_orders')).rows.length,0);checks++;
 assert.equal((await db.query("update public.matumarket_orders set status='completed' returning id")).rows.length,0);checks++;
 await deny('update public.matumarket_orders set total=1');
 await role('authenticated',admin);assert.equal((await db.query('select * from public.matumarket_orders')).rows.length,6);checks++;
 await db.query("update public.matumarket_orders set status='confirmed' where id=$1",[saved.id]);checks++;
 await deny('update public.matumarket_orders set total=1');await deny("update public.matumarket_orders set status='inventado'");await deny('select * from public.matumarket_push_subscriptions');
 await db.exec('reset role');await db.query('delete from public.matumarket_admins where user_id=$1',[admin]);await role('authenticated',admin);assert.equal((await db.query('select * from public.matumarket_orders')).rows.length,0);checks++;
 console.log(`PASS: ${checks} comprobaciones de pedidos, privacidad, precios vigentes, idempotencia, límites y permisos. Sin pedidos reales ni notificaciones enviadas.`);
}finally{await db.close();}
