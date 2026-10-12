import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function serverReady() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }
export function serviceClient() {
  if (!serverReady()) throw new Error('El registro de pedidos aún no está configurado.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function requireAdmin(request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error('AUTH_REQUIRED');
  const client=serviceClient();
  const {data,error}=await client.auth.getUser(token);
  if(error || !data.user) throw new Error('AUTH_REQUIRED');
  const role=await client.from('matumarket_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
  if(role.error || !role.data) throw new Error('AUTH_REQUIRED');
  return {client,user:data.user};
}
export function requireSameOrigin(request) {
  const origin=request.headers.get('origin');
  const url=new URL(request.url);
  const host=request.headers.get('host') || url.host;
  const protocol=request.headers.get('x-forwarded-proto') || url.protocol.slice(0,-1);
  if(!origin || origin!==`${protocol}://${host}`) throw new Error('ORIGIN_INVALID');
}
export async function readJson(request, maxBytes=12000) {
  const reader=request.body?.getReader();if(!reader) throw new Error('Solicitud inválida');
  let bytes=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>maxBytes){await reader.cancel();throw new Error('Solicitud demasiado grande');}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('Solicitud inválida');}
}
