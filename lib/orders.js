'use client';
import {getSupabase,isPortablePreview} from './supabase';
const KEY='matumarket-demo-orders-v1';
export function demoOrders(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch{return [];}}
export function saveDemoOrder(payload,requestId){
 const orders=demoOrders();const existing=orders.find(o=>o.id===requestId);if(existing)return existing;
 const order={id:requestId,number:orders.length+1,customer_name:payload.name,phone:payload.phone,delivery_type:payload.delivery,address:payload.address,note:payload.note,items:payload.items,status:'pending',created_at:new Date().toISOString(),total:payload.total,delivery_fee:payload.delivery==='delivery'?5:0,push_status:'no_devices'};
 localStorage.setItem(KEY,JSON.stringify([order,...orders].slice(0,200)));return order;
}
export async function adminRequest(path,body,method='POST'){
 if(isPortablePreview())throw new Error('Las notificaciones reales se habilitan en la web publicada.');
 const {data}=await getSupabase().auth.getSession();if(!data.session)throw new Error('Inicia sesión nuevamente.');
 const response=await fetch(path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(body||{})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo completar la operación.');return result;
}
