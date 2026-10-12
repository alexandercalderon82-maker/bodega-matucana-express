'use client';

import { createClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabase = Boolean(url && key);
export const isPortablePreview = () => typeof window !== 'undefined' && window.__MATUMARKET_PREVIEW__ === true;
let client;
export function getSupabase() {
  if (!hasSupabase || isPortablePreview()) throw new Error('Falta configurar la conexión a Supabase en la aplicación publicada.');
  if (!client) client = createClient(url, key);
  return client;
}
const initial = { status: hasSupabase ? 'loading' : 'unconfigured', user: null, error: '' };
let snapshot = initial;
const listeners = new Set();
let started = false;
let generation = 0;
function emit(value) { snapshot = value; listeners.forEach(listener => listener()); }
export async function refreshAuth() {
  const current = ++generation;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (current !== generation) return;
    if (error || !data.user) { emit({ status: 'signed-out', user: null, error: '' }); return; }
    const role = await supabase.from('matumarket_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (current !== generation) return;
    if (role.error) { emit({ status: 'denied', user: data.user, error: 'No se pudieron comprobar los permisos. Verifica la configuración de Supabase.' }); return; }
    emit({ status: role.data ? 'admin' : 'denied', user: data.user, error: role.data ? '' : 'Esta cuenta no está autorizada para administrar la tienda.' });
  } catch { if (current === generation) emit({ status: 'error', user: null, error: 'No se pudo conectar con el servicio de acceso. Intenta nuevamente.' }); }
}
function subscribe(listener) {
  listeners.add(listener);
  if (!started && hasSupabase && !isPortablePreview()) {
    started = true;
    try {
      getSupabase().auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') { generation++; emit({ status: 'signed-out', user: null, error: '' }); }
        else { emit({ status: 'loading', user: null, error: '' }); setTimeout(() => { void refreshAuth(); }, 0); }
      });
      void refreshAuth();
    } catch { emit({ status: 'error', user: null, error: 'La conexión de Supabase no está configurada correctamente.' }); }
  }
  return () => listeners.delete(listener);
}
export function useAuth() { return useSyncExternalStore(subscribe, () => snapshot, () => initial); }
export async function signIn(email, password) {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error('No se pudo ingresar. Comprueba tu correo, contraseña y conexión.');
  await refreshAuth();
}
export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new Error('No se pudo cerrar la sesión. Intenta nuevamente.');
  generation++; emit({ status: 'signed-out', user: null, error: '' });
}
