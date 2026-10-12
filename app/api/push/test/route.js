import {requireAdmin,requireSameOrigin} from '@/lib/server/supabase';
import {sendNotification} from '@/lib/server/push';
export const runtime='nodejs';
export async function POST(request){try{requireSameOrigin(request);const {user}=await requireAdmin(request);const result=await sendNotification({testUserId:user.id});return Response.json(result);}catch(e){return Response.json({error:e.message==='AUTH_REQUIRED'?'Inicia sesión como administrador.':'No se pudo enviar la prueba.'},{status:e.message==='AUTH_REQUIRED'?401:503});}}
