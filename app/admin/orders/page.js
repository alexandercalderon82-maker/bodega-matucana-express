"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [items, setItems] = useState([]);

  // ✅ Cargar pedidos
  const loadOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando pedidos:", error.message);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  // ✅ Cargar items de un pedido
  const loadItems = async (orderId) => {
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (error) {
      console.error("Error cargando items:", error.message);
      setItems([]);
    } else {
      setItems(data || []);
    }
  };

  // ✅ Cambiar estado del pedido
  const updateStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error("Error actualizando estado:", error.message);
      alert("❌ Error actualizando estado");
      return;
    }

    // refrescar lista
    await loadOrders();

    // si está seleccionado, actualizar también
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <AdminGuard>
      <main style={{ padding: 20, fontFamily: "Arial" }}>
        <h1 style={{ fontSize: 26, fontWeight: "bold" }}>📦 Admin — Pedidos</h1>
        <p style={{ color: "#666" }}>
          Aquí verás todos los pedidos guardados en Supabase.
        </p>

        <button
          onClick={loadOrders}
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: "black",
            color: "white",
          }}
        >
          🔄 Actualizar
        </button>

        {loading ? (
          <p style={{ marginTop: 20 }}>Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <p style={{ marginTop: 20 }}>Aún no hay pedidos.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
              gap: 20,
              marginTop: 20,
              alignItems: "start",
            }}
          >
            {/* ✅ Lista de pedidos */}
            <section>
              {orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => {
                    setSelectedOrder(o);
                    loadItems(o.id);
                  }}
                  style={{
                    border: "1px solid #ddd",
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 12,
                    cursor: "pointer",
                    background:
                      selectedOrder?.id === o.id ? "#f9f9f9" : "white",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: "bold" }}>
                    👤 {o.customer_name} — 📱 {o.phone}
                  </p>
                  <p style={{ margin: 0, color: "#555" }}>
                    💰 Total: S/ {Number(o.total).toFixed(2)}
                  </p>

                  <p style={{ margin: 0, color: "#777", fontSize: 13 }}>
                    📅 {new Date(o.created_at).toLocaleString()}
                  </p>

                  <p style={{ margin: "6px 0 0 0" }}>
                    <b>Estado:</b>{" "}
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 8,
                        background:
                          o.status === "delivered" ? "#d4edda" : "#fff3cd",
                        color:
                          o.status === "delivered" ? "#155724" : "#856404",
                        fontSize: 13,
                        fontWeight: "bold",
                      }}
                    >
                      {o.status === "delivered" ? "✅ Entregado" : "⏳ Pendiente"}
                    </span>
                  </p>
                </div>
              ))}
            </section>

            {/* ✅ Detalle del pedido */}
            <aside
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                background: "white",
                position: "sticky",
                top: 20,
                height: "fit-content",
              }}
            >
              {!selectedOrder ? (
                <p style={{ color: "#666" }}>
                  Selecciona un pedido para ver los detalles.
                </p>
              ) : (
                <>
                  <h2 style={{ marginTop: 0 }}>🧾 Detalle</h2>

                  <p>
                    <b>Cliente:</b> {selectedOrder.customer_name}
                  </p>
                  <p>
                    <b>Celular:</b> {selectedOrder.phone}
                  </p>

                  <p>
                    <b>Tipo:</b>{" "}
                    {selectedOrder.delivery_type === "delivery"
                      ? "🚚 Delivery"
                      : "🏪 Recojo"}
                  </p>

                  {selectedOrder.delivery_type === "delivery" && (
                    <p>
                      <b>Dirección:</b> {selectedOrder.address || "-"}
                    </p>
                  )}

                  <p>
                    <b>Nota:</b> {selectedOrder.note || "Sin nota"}
                  </p>

                  <hr />

                  <h3>🛒 Productos</h3>

                  {items.length === 0 ? (
                    <p style={{ color: "#666" }}>Sin productos.</p>
                  ) : (
                    <ul style={{ paddingLeft: 18 }}>
                      {items.map((it) => (
                        <li key={it.id} style={{ marginBottom: 6 }}>
                          {it.name_snapshot} x{it.quantity} — S/{" "}
                          {(Number(it.price_snapshot) * it.quantity).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  )}

                  <hr />

                  <p>
                    <b>Subtotal:</b> S/{" "}
                    {Number(selectedOrder.subtotal).toFixed(2)}
                  </p>
                  <p>
                    <b>Delivery:</b> S/{" "}
                    {Number(selectedOrder.delivery_fee).toFixed(2)}
                  </p>
                  <p style={{ fontSize: 18 }}>
                    <b>Total:</b> S/ {Number(selectedOrder.total).toFixed(2)}
                  </p>

                  <hr />

                  {/* ✅ Botones de estado */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => updateStatus(selectedOrder.id, "pending")}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        background: "#ffc107",
                        fontWeight: "bold",
                      }}
                    >
                      ⏳ Pendiente
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(selectedOrder.id, "delivered")
                      }
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        background: "#28a745",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      ✅ Entregado
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </main>
    </AdminGuard>
  );
}