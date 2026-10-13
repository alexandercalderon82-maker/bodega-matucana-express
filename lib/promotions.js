'use client';
import { useSyncExternalStore } from 'react';
import { getSupabase } from './supabase';
import { usesSharedCatalog } from './catalog';
import { validatePromotion } from './promotion-rules';
const key='matumarket-promotions-v1';
const initial={promotions:[],available:false,error:''};
let snapshot=initial;
const listeners=new Set();
let stop;
function emit(value){snapshot=value;listeners.forEach(listener=>listener());}
async function refresh(){
  try {
    let data;
    if(usesSharedCatalog()){
      const result=await getSupabase().from('matumarket_promotions').select('id,name,kind,items,price,active,starts_at,ends_at').order('name');
      if(result.error)throw result.error;
      data=result.data;
    } else data=JSON.parse(localStorage.getItem(key)||'[]');
    if(!Array.isArray(data)||data.length>100)throw Error('Datos inválidos');
    emit({promotions:data.map(p=>validatePromotion({...p,price:Number(p.price)})),available:true,error:''});
  } catch {emit({promotions:[],available:false,error:'Para administrar promociones, ejecuta supabase/promotions.sql en el SQL Editor de Supabase. Si ya lo hiciste, revisa tu conexión.'});}
}
function subscribe(listener){
  listeners.add(listener);
  if(!stop){const focus=()=>{void refresh();};const timer=setInterval(focus,30000);window.addEventListener('focus',focus);window.addEventListener('storage',focus);const {data}=usesSharedCatalog()?getSupabase().auth.onAuthStateChange(()=>setTimeout(focus,0)):{data:null};stop=()=>{clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('storage',focus);data?.subscription.unsubscribe();stop=null;};void refresh();}
  return ()=>{listeners.delete(listener);if(!listeners.size)stop?.();};
}
export function usePromotions(){return useSyncExternalStore(subscribe,()=>snapshot,()=>initial);}
export async function savePromotion(value){
  const promotion=validatePromotion(value);
  if(!snapshot.promotions.some(p=>p.id===promotion.id)&&snapshot.promotions.length>=100)throw Error('Puedes guardar hasta 100 promociones.');
  if(usesSharedCatalog()){
    const {error}=await getSupabase().from('matumarket_promotions').upsert(promotion);
    if(error)throw Error('No se pudo guardar. Revisa permisos, productos y que el precio sea menor que comprarlos por separado.');
  } else {
    localStorage.setItem(key,JSON.stringify([...snapshot.promotions.filter(p=>p.id!==promotion.id),promotion]));
  }
  await refresh();
}
