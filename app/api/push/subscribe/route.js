import { requireAdmin,requireSameOrigin,readJson } from '@/lib/server/supabase';
import { pushReady,validateSubscription } from '@/lib/server/push';
export const runtime='nodejs';
export async function POST(request){
 try{requireSameOrigin(request);const {client,user}=await requireAdmin(request);if(!pushReady())return Response.json({error:'Falta configurar las claves de notificaciones en Vercel.'},{status:503});
 const subscription=validateSubscription(await readJson(request,5000));
 const existing=await client.from('matumarket_push_subscriptions').select('endpoint').eq('user_id',user.id);
 if(existing.error)throw new Error('No se pudieron registrar las notificaciones.');
 if(existing.data.length>=5 && !existing.data.some(row=>row.endpoint===subscription.endpoint))throw new Error('Ya registraste cinco dispositivos. Desactiva uno antes de añadir otro.');
 const {error}=await client.from('matumarket_push_subscriptions').upsert({endpoint:subscription.endpoint,user_id:user.id,subscription});if(error)throw new Error('No se pudo guardar el dispositivo.');
 return Response.json({ok:true});}catch(e){return Response.json({error:e.message==='AUTH_REQUIRED'?'Inicia sesión como administrador.':e.message},{status:e.message==='AUTH_REQUIRED'?401:400});}
}
export async function DELETE(request){
 try{requireSameOrigin(request);const {client,user}=await requireAdmin(request);const {endpoint}=await readJson(request,5000);
 const {error}=await client.from('matumarket_push_subscriptions').delete().eq('endpoint',endpoint).eq('user_id',user.id);if(error)throw new Error('No se pudo desactivar el dispositivo.');return Response.json({ok:true});}
 catch(e){return Response.json({error:e.message==='AUTH_REQUIRED'?'Inicia sesión.':e.message},{status:e.message==='AUTH_REQUIRED'?401:400});}
}
