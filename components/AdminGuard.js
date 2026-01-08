"use client";

import { useEffect, useState } from "react";

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || "Rcalderon08@";
const STORAGE_KEY = "admin_authed";

export default function AdminGuard({ children }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      setAuthed(true);
    }
    setReady(true);
  }, []);

  const login = () => {
    const pass = prompt("🔒 Ingresa la clave de admin:");
    if (pass === ADMIN_PASS) {
      localStorage.setItem(STORAGE_KEY, "true");
      setAuthed(true);
    } else {
      alert("❌ Clave incorrecta");
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
  };

  if (!ready) return null;

  if (!authed) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">🔒 Admin protegido</h1>
          <p className="text-gray-300 mt-2">
            Ingresa tu clave para acceder al panel.
          </p>

          <button
            onClick={login}
            className="mt-5 w-full rounded-xl bg-white text-black py-2 font-bold hover:opacity-90 transition"
          >
            Ingresar clave
          </button>

          <p className="text-xs text-gray-400 mt-4">
            (Esta clave está guardada en Vercel como <b>NEXT_PUBLIC_ADMIN_PASS</b>)
          </p>
        </div>
      </main>
    );
  }

  return (
    <div>
      {/* Botón salir (opcional) */}
      <div className="bg-black text-white px-6 py-3 border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-300">✅ Sesión Admin activa</p>
          <button
            onClick={logout}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm font-semibold hover:bg-white/15 transition"
          >
            Salir
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}