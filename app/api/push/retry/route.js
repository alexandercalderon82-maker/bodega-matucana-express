import {requireAdmin,requireSameOrigin,readJson} from '@/lib/server/supabase';
import {sendNotification} from '@/lib/server/push';
export const runtime='nodejs';
export async function POST(request){try{requireSameOrigin(request);const {client}=await requireAdmin(request);const {id}=await readJson(request,1000);const {data,error}=await client.from('matumarket_orders').select('id,number').eq('id',id).maybeSingle();if(error||!data)return Response.json({error:'Pedido no encontrado.'},{status:404});return Response.json(await sendNotification({orderId:data.id,number:data.number}));}catch(e){return Response.json({error:e.message==='AUTH_REQUIRED'?'Inicia sesión como administrador.':'No se pudo reintentar el aviso.'},{status:e.message==='AUTH_REQUIRED'?401:503});}}
