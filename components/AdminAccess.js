'use client';

import { useState } from 'react';
import Brand from './Brand';
import Icon from './Icons';
import AdminPanel from './AdminPanel';
import { useAuth, signIn, signOut, refreshAuth, isPortablePreview, hasSupabase } from '@/lib/supabase';

export default function AdminAccess({ onStore }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const preview = isPortablePreview();
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await signIn(email, password); setPassword(''); }
    catch (e) { setError(e.message); setPassword(''); }
    finally { setBusy(false); }
  }
  async function logout() {
    setError('');
    try { await signOut(); }
    catch (e) { setError(e.message); }
  }
  if (preview && demo) return <AdminPanel onStore={onStore} demo onLogout={() => setDemo(false)}/>;
  if (auth.status === 'admin' && !preview) return <><AdminPanel onStore={onStore} onLogout={logout}/>{error && <p role="alert" className="error">{error}</p>}</>;
  return <div className="login-shell"><div className="login-brand"><Brand onClick={onStore ? e => { e.preventDefault(); onStore(); } : undefined}/></div><main className="login-card"><span className="login-icon"><Icon name="settings" size={28}/></span><span className="eyebrow">SOLO PARA ADMINISTRADORES</span><h1>Bienvenido de nuevo.</h1><p>Ingresa para organizar tus categorías y mantener tu catálogo al día.</p>
    {preview ? <><div className="demo-banner"><div><strong>Vista previa descargable</strong><p>Este archivo permite probar el panel por categorías. El ingreso real con usuario y contraseña funciona en la web conectada a Supabase; aquí no se comprueban credenciales.</p></div></div><div className="preview-login-fields"><label className="field">Usuario (correo electrónico)<input type="email" disabled placeholder="tu@correo.com"/></label><label className="field">Contraseña<input type="password" disabled placeholder="Disponible en la web configurada"/></label></div><button className="primary" onClick={() => setDemo(true)}>Explorar panel de demostración <Icon name="arrow" size={16}/></button></> : !hasSupabase ? <div className="error" role="alert">El acceso administrativo está bloqueado hasta configurar Supabase. No hay una contraseña predeterminada. Configura la URL, clave pública, tablas y cuenta autorizada según las instrucciones del proyecto.</div> : auth.status === 'loading' ? <p role="status">Comprobando sesión y permisos…</p> : auth.status === 'denied' ? <><p className="error" role="alert">{auth.error}</p><button className="outline-button" onClick={logout}>Cerrar sesión</button></> : <form onSubmit={login}><label className="field">Usuario (correo electrónico)<input type="email" required autoComplete="username" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"/></label><label className="field">Contraseña<input type="password" required autoComplete="current-password" minLength={1} value={password} onChange={e => setPassword(e.target.value)}/></label><button className="primary" type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar al panel'}<Icon name="arrow" size={16}/></button>{(error || auth.error) && <p className="error" role="alert">{error || auth.error}</p>}{auth.status === 'error' && <button type="button" className="text-button" onClick={() => void refreshAuth()}>Reintentar conexión</button>}<p className="fine-print">Solo cuentas creadas y autorizadas por la tienda. Si olvidaste tu contraseña, solicita al propietario restablecerla desde Supabase.</p></form>}
    {onStore && <button className="text-button login-back" onClick={onStore}>Volver a la tienda</button>}
  </main><p className="login-footer">MatuMarket · Tu compra cerca de casa</p></div>;
}
