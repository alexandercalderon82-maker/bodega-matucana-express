import 'server-only';
import webpush from 'web-push';
import { serviceClient } from './supabase';

export function pushReady(){return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);}
export function validateSubscription(value){
  const url=new URL(value?.endpoint);
  if(url.protocol!=='https:' || url.hostname!=='fcm.googleapis.com' || url.port || url.username || url.password || !/^\/(fcm\/send\/|wp\/)/.test(url.pathname)) throw new Error('Suscripción de Chrome no válida.');
  if(!/^[A-Za-z0-9_-]{87}$/.test(value.keys?.p256dh || '') || !/^[A-Za-z0-9_-]{22}$/.test(value.keys?.auth || '') || Buffer.from(value.keys.p256dh,'base64url').length!==65 || Buffer.from(value.keys.p256dh,'base64url')[0]!==4 || Buffer.from(value.keys.auth,'base64url').length!==16)throw new Error('Claves de suscripción inválidas.');
  return {endpoint:url.href,keys:{p256dh:value.keys.p256dh,auth:value.keys.auth}};
}
export async function sendNotification({orderId,number,testUserId}){
  const client=serviceClient();
  if(!pushReady()){if(orderId)await client.from('matumarket_orders').update({push_status:'failed'}).eq('id',orderId);return {accepted:0};}
  const admins=await client.from('matumarket_admins').select('user_id');
  if(admins.error)throw new Error('No se pudieron consultar los destinatarios.');
  const authorized=new Set(admins.data.map(a=>a.user_id));
  let query=client.from('matumarket_push_subscriptions').select('endpoint,user_id,subscription');
  if(testUserId)query=query.eq('user_id',testUserId);
  const rows=await query;if(rows.error)throw new Error('No se pudieron consultar los dispositivos.');
  const subscriptions=rows.data.filter(row=>authorized.has(row.user_id));
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://bodega-matucana-express-hx8c.vercel.app',process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
  const payload=JSON.stringify({title:testUserId?'MatuMarket: notificaciones activadas':`Nuevo pedido #${number}`,body:testUserId?'Este teléfono ya puede recibir avisos de pedidos.':'Abre el panel para revisar y confirmar el pedido.',orderId:orderId||null});
  const results=await Promise.allSettled(subscriptions.map(async row=>{
    try{validateSubscription(row.subscription);await webpush.sendNotification(row.subscription,payload,{TTL:86400,urgency:'high',timeout:5000});return true;}
    catch(error){if([404,410].includes(error.statusCode))await client.from('matumarket_push_subscriptions').delete().eq('endpoint',row.endpoint);throw new Error('No se pudo entregar el aviso al servicio push.');}
  }));
  const accepted=results.filter(r=>r.status==='fulfilled').length;
  if(orderId)await client.from('matumarket_orders').update({push_status:accepted?'accepted':subscriptions.length?'failed':'no_devices'}).eq('id',orderId);
  return {accepted};
}
