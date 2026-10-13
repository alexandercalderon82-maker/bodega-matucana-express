'use client';

import { useSyncExternalStore } from 'react';
import { store } from '@/app/products';
import { getSupabase } from './supabase';
import { usesSharedCatalog } from './catalog';

export const defaultSettings = {
  deliveryFee: store.deliveryFee,
  deliveryZones: 'Matucana. Confirmamos cobertura según tu dirección por WhatsApp.',
  deliveryTime: 'Coordinamos el tiempo estimado por WhatsApp al confirmar tu pedido.',
  deliveryHours: store.hours,
  paymentMethods: [],
  paymentInstructions: 'Consulta los métodos disponibles por WhatsApp. Coordina el pago después de que confirmemos disponibilidad y total.',
};
const key = 'matumarket-store-settings-v1';
const listeners = new Set();
const initial = { settings: defaultSettings, error: '', available: false };
let snapshot = initial;
let started = false;
let stop;
export function validateSettings(value) {
  if (!value || !Number.isFinite(Number(value.deliveryFee)) || Number(value.deliveryFee) < 0 || Number(value.deliveryFee) > 100000) throw new Error('El costo de delivery debe estar entre S/ 0 y S/ 100 000.');
  const result = { deliveryFee: Math.round(Number(value.deliveryFee) * 100) / 100 };
  for (const field of ['deliveryZones', 'deliveryTime', 'deliveryHours', 'paymentInstructions']) {
    if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 500) throw new Error('Completa las condiciones y las instrucciones de pago (hasta 500 caracteres).');
    result[field] = value[field].trim();
  }
  if (!Array.isArray(value.paymentMethods) || value.paymentMethods.some(m => !['Yape', 'Plin', 'Efectivo'].includes(m)) || new Set(value.paymentMethods).size !== value.paymentMethods.length) throw new Error('Selecciona métodos de pago válidos.');
  result.paymentMethods = value.paymentMethods;
  return result;
}
function emit(value) { snapshot = value; listeners.forEach(listener => listener()); }
async function refresh() {
  if (!usesSharedCatalog()) {
    try { const raw = localStorage.getItem(key); emit({ settings: raw ? validateSettings(JSON.parse(raw)) : defaultSettings, error: '', available: true }); }
    catch { emit({ ...initial, error: 'No se pudieron leer las condiciones guardadas.' }); }
    return;
  }
  try {
    const { data, error } = await getSupabase().from('matumarket_store_settings').select('settings').eq('id', 1).maybeSingle();
    if (error) throw error;
    emit({ settings: data ? validateSettings(data.settings) : defaultSettings, error: '', available: true });
  } catch { emit({ ...snapshot, available: false, error: 'Para guardar condiciones compartidas, ejecuta supabase/store-settings.sql en el SQL Editor de Supabase. Si ya lo hiciste, revisa la conexión.' }); }
}
function subscribe(listener) {
  listeners.add(listener);
  if (!started) {
    started = true;
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus); window.addEventListener('storage', focus);
    const timer = setInterval(focus, 30000);
    stop = () => { clearInterval(timer); window.removeEventListener('focus', focus); window.removeEventListener('storage', focus); started = false; };
    void refresh();
  }
  return () => { listeners.delete(listener); if (!listeners.size) stop?.(); };
}
export function useStoreSettings() { return useSyncExternalStore(subscribe, () => snapshot, () => initial); }
export async function saveStoreSettings(value) {
  const settings = validateSettings(value);
  if (usesSharedCatalog()) {
    const { error } = await getSupabase().from('matumarket_store_settings').upsert({ id: 1, settings });
    if (error) throw new Error('No se pudieron guardar las condiciones. Revisa la conexión, tus permisos y la configuración de Supabase.');
  } else { localStorage.setItem(key, JSON.stringify(settings)); }
  emit({ settings, error: '', available: true });
}
