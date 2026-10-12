import { createHmac } from 'node:crypto';
import { serviceClient,serverReady,requireSameOrigin,readJson } from '@/lib/server/supabase';
import { sendNotification } from '@/lib/server/push';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request){
  if(!serverReady())return Response.json({error:'Los pedidos online todavía no están disponibles.'},{status:503});
  try{
    requireSameOrigin(request);
    const body=await readJson(request);
    if(!body||Array.isArray(body)||typeof body!=='object'||typeof body.name!=='string'||typeof body.phone!=='string'||typeof body.delivery!=='string'||!Array.isArray(body.items))throw new Error('Completa correctamente los datos del pedido.');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId||''))throw new Error('Confirmación inválida.');
    const payload={name:body.name,phone:body.phone,delivery:body.delivery,address:body.address||'',note:body.note||'',items:body.items};
    const ip=request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const source=createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY).update(ip).digest('hex');
    const {data,error}=await serviceClient().rpc('matumarket_create_order',{payload,request_key:body.requestId,source_hash:source});
    if(error){const message=error.code==='P0001'?error.message:'No se pudo registrar el pedido. Intenta nuevamente.';return Response.json({error:message},{status:error.code==='P0001'?400:503});}
    if(['pending','failed','no_devices'].includes(data.push_status)){
      try{await sendNotification({orderId:data.id,number:data.number});}catch{/* El pedido ya está guardado. El panel conserva el estado pendiente para reintentar. */}
    }
    return Response.json({id:data.id,number:data.number,total:data.total},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return Response.json({error:error.message==='ORIGIN_INVALID'?'Solicitud no permitida.':error.message},{status:400});}
}
