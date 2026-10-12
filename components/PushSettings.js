'use client';
import {useEffect,useState} from 'react';
import {adminRequest} from '@/lib/orders';
const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
function decodeKey(key){return Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(key.length/4)*4,'=')),char=>char.charCodeAt(0));}
export default function PushSettings({demo=false}){
 const [active,setActive]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;if(!demo&&'serviceWorker'in navigator)navigator.serviceWorker.getRegistration('/').then(r=>r?.pushManager.getSubscription()).then(s=>{if(alive)setActive(Boolean(s));}).catch(()=>{});return()=>{alive=false;};},[demo]);
 async function enable(){setBusy(true);setError('');try{
  if(demo)throw new Error('La prueba descargable no envía avisos. Usa Chrome en la web publicada.');
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('Abre la web en Chrome de Android para activar los avisos.');
  if(!publicKey)throw new Error('Falta configurar las claves de notificaciones en Vercel.');
  // Permiso solicitado directamente desde el clic, antes de cualquier operación de red.
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Permite las notificaciones desde los ajustes de este sitio en Chrome.');
  await navigator.serviceWorker.register('/sw.js');const registration=await navigator.serviceWorker.ready;
  let subscription=await registration.pushManager.getSubscription();
  if(subscription){const old=subscription.options.applicationServerKey;const expected=decodeKey(publicKey);if(old&&!expected.every((v,i)=>v===new Uint8Array(old)[i])){await subscription.unsubscribe();subscription=null;}}
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(publicKey)});
  await adminRequest('/api/push/subscribe',subscription.toJSON());setActive(true);setMessage('Este teléfono está registrado. Envía una prueba para comprobar que recibe el aviso.');
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function disable(){setBusy(true);setError('');try{const r=await navigator.serviceWorker.getRegistration('/');const s=await r?.pushManager.getSubscription();if(s){await adminRequest('/api/push/subscribe',{endpoint:s.endpoint},'DELETE');await s.unsubscribe();}setActive(false);setMessage('Avisos desactivados en este dispositivo.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function test(){setBusy(true);setError('');try{const result=await adminRequest('/api/push/test');setMessage(result.accepted?'Aviso aceptado por el servicio. Comprueba la notificación en tu teléfono.':'No se pudo enviar a un dispositivo activo. Pulsa Activar notificaciones para registrar este teléfono.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="push-settings"><div><h2>Avisos en tu Android</h2><p>Recibe una notificación aunque el panel esté cerrado. Necesitas internet, permiso de Chrome y las notificaciones habilitadas en Android. El ahorro de batería puede retrasarlas.</p></div><div className="order-actions"><button className="primary" disabled={busy} onClick={()=>void enable()}>{active?'Registrar de nuevo':'Activar notificaciones'}</button>{active&&<><button className="outline-button" disabled={busy} onClick={()=>void test()}>Enviar prueba</button><button className="text-button" disabled={busy} onClick={()=>void disable()}>Desactivar este dispositivo</button></>}</div>{message&&<p className="status" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
