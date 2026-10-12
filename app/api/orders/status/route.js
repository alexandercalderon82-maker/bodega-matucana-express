import { serviceClient,serverReady } from '@/lib/server/supabase';
import { pushReady } from '@/lib/server/push';
export const dynamic='force-dynamic';
export async function GET(){
 let ready=false;let registered=false;
 if(serverReady()){try{const {error}=await serviceClient().from('matumarket_orders').select('id').limit(0);ready=!error;if(ready&&pushReady()){const client=serviceClient();const admins=await client.from('matumarket_admins').select('user_id');if(!admins.error&&admins.data.length){const devices=await client.from('matumarket_push_subscriptions').select('endpoint').in('user_id',admins.data.map(a=>a.user_id)).limit(1);registered=!devices.error&&devices.data.length>0;}}}catch{}}
 return Response.json({orders:ready&&pushReady()&&registered,push:ready&&pushReady()},{headers:{'Cache-Control':'no-store'}});
}
