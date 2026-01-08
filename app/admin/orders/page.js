"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [items, setItems] = useState([]);

  // ✅ NUEVO: filtros
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | delivered
  const [search, setSearch] = useState("");

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

    await loadOrders();

    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // ✅ NUEVO: filtrar pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const statusOk =
        statusFilter === "all" ? true : o.status === statusFilter;

      const q = search.trim().toLowerCase();
      const searchOk =
        q === ""
          ? true
          : (o.customer_name || "").toLowerCase().includes(q) ||
            (o.phone || "").toLowerCase().includes(q);

      return statusOk && searchOk;
    });
  }, [orders, statusFilter, search]);

  return (
    <AdminGuard>
      <main style={{ padding: 20, fontFamily: "Arial" }}>
        <h1 style={{ fontSize: 26, fontWeight: "bold" }}>📦 Admin — Pedidos</h1>
        <p style={{ color: "#666" }}>
          Aquí verás todos los pedidos guardados en Supabase.
        </p>

        {/* ✅ NUEVO: filtros */}
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            onClick={loadOrders}
            style={{
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="delivered">Entregados</option>
          </select>

          <input
            placeholder="Buscar por nombre o celular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              minWidth: 260,
              flex: 1,
            }}
          />
        </div>

        {loading ? (
          <p style={{ marginTop: 20 }}>Cargando pedidos...</p>
        ) : filteredOrders.length === 0 ? (
          <p style={{ marginTop: 20 }}>No hay pedidos con ese filtro.</p>
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
              {filteredOrders.map((o) => (
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
                      selectedOrder?.id === o.id ? "#f0f0f0" : o.status === "delivered" ? "#e6ffed" // ✅ verde suave : "white" ,
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

                  {/* ✅ NUEVO: BOTÓN WHATSAPP */}
                  <button
                    onClick={() => {
                      const phone = (selectedOrder.phone || "").replace(/\D/g, "");
                      if (!phone) {
                        alert("No hay celular válido.");
                        return;
                      }
                      window.open(`https://wa.me/51${phone}`, "_blank");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: "#25D366",
                      color: "white",
                      fontWeight: "bold",
                      marginTop: 10,
                    }}
                  >
                    💬 Abrir WhatsApp del cliente
                  </button>

                  <p style={{ marginTop: 12 }}>
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