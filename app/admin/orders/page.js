import AdminGuard from "@/components/AdminGuard";

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        created_at,
        customer_name,
        phone,
        delivery_type,
        address,
        note,
        subtotal,
        delivery_fee,
        total,
        order_items (
          id,
          name_snapshot,
          price_snapshot,
          quantity,
          subtotal
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Error cargando pedidos. Revisa consola.");
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <AdminGuard>
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <a
            href="/admin"
            className="inline-block text-gray-300 hover:text-white transition"
          >
            ⬅ Volver
          </a>

          <button
            onClick={loadOrders}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 transition"
          >
            🔄 Actualizar
          </button>
        </div>

        <h1 className="text-3xl font-bold mt-3">Admin — Pedidos</h1>
        <p className="text-gray-300 mt-2">
          Aquí verás todos los pedidos que se guarden en Supabase.
        </p>

        {loading ? (
          <p className="text-gray-300 mt-8">Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-gray-300">Aún no hay pedidos.</p>
            <p className="text-gray-400 text-sm mt-2">
              Cuando un cliente haga checkout, aquí aparecerá el pedido.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-lg font-bold break-all">Pedido #{o.id}</p>
                    <p className="text-sm text-gray-300 mt-1">
                      📅 {new Date(o.created_at).toLocaleString()}
                    </p>

                    <div className="mt-3 text-sm text-gray-200 space-y-1">
                      <p>
                        👤 <b>{o.customer_name || "-"}</b>
                      </p>
                      <p>
                        📱 <b>{o.phone || "-"}</b>
                      </p>
                      <p>
                        {o.delivery_type === "delivery" ? "🚚 Delivery" : "🏪 Recojo"}
                      </p>

                      {o.delivery_type === "delivery" && (
                        <p>
                          📍 <b>{o.address || "-"}</b>
                        </p>
                      )}

                      {o.note && (
                        <p>
                          📝 <b>{o.note}</b>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                      <p>
                        Subtotal:{" "}
                        <b>S/ {Number(o.subtotal || 0).toFixed(2)}</b>
                      </p>
                      <p>
                        Delivery:{" "}
                        <b>S/ {Number(o.delivery_fee || 0).toFixed(2)}</b>
                      </p>
                      <p className="text-base mt-2">
                        Total:{" "}
                        <b>S/ {Number(o.total || 0).toFixed(2)}</b>
                      </p>
                    </div>

                    {o.phone && (
                      <a
                        className="block mt-3"
                        href={`https://wa.me/${String(o.phone).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <button className="w-full rounded-xl bg-green-500 text-black px-4 py-2 font-bold hover:opacity-90 transition">
                          Abrir WhatsApp
                        </button>
                      </a>
                    )}
                  </div>
                </div>

                <hr className="my-4 border-white/10" />

                <div>
                  <p className="font-bold">🛒 Items</p>
                  <div className="mt-2 space-y-2">
                    {(o.order_items || []).map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {it.quantity}x {it.name_snapshot}
                          </p>
                          <p className="text-xs text-gray-300">
                            S/ {Number(it.price_snapshot).toFixed(2)} c/u
                          </p>
                        </div>

                        <p className="font-bold">
                          S/ {Number(it.subtotal).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
    </AdminGuard>
  );
}