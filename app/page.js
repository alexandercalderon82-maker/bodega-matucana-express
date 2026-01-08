"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DELIVERY_FEE = 5;
const STORE_NAME = "Bodega Matucana Express";
const STORE_ADDRESS = "Jr. Tacna - Matucana";
const STORE_HOURS = "7:00 a.m. a 10:00 p.m.";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState([]); // [{id, name, price, qty}]
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("delivery"); // delivery | pickup
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  // ✅ ✅ NUEVO: mensaje de éxito (reemplaza el alert final)
  const [successMsg, setSuccessMsg] = useState("");

  // ✅ Cargar productos
  const loadProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("id,name,price,category,image_url,is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ERROR SUPABASE:", error.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // ✅ Agregar al carrito
  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((p) => p.id === product.id);
      if (found) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  // ✅ Quitar del carrito (eliminar completamente)
  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  // ✅ 4.1: Aumentar cantidad
  const increaseQty = (id) => {
    setCart((prev) =>
      prev.map((p) => (p.id === id ? { ...p, qty: p.qty + 1 } : p))
    );
  };

  // ✅ 4.1: Disminuir cantidad (si llega a 0, se elimina)
  const decreaseQty = (id) => {
    setCart((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: p.qty - 1 } : p))
        .filter((p) => p.qty > 0)
    );
  };

  // ✅ Calcular totales
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.qty,
    0
  );

  const deliveryFee = deliveryType === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  // ✅ Mensaje WhatsApp
  const buildWhatsappMessage = () => {
    const itemsText =
      cart.length === 0
        ? "• (Sin productos)"
        : cart
            .map(
              (item) =>
                `• ${item.name} x${item.qty} — S/ ${(
                  Number(item.price) * item.qty
                ).toFixed(2)}`
            )
            .join("\n");

    const deliveryText =
      deliveryType === "delivery"
        ? `🚚 *Tipo:* Delivery\n📍 *Dirección:* ${address || "-"}`
        : `🏪 *Tipo:* Recojo en tienda`;

    const msg = `
📋 *PEDIDO - ${STORE_NAME}*

👤 *Nombre:* ${customerName || "-"}
📱 *Celular:* ${phone || "-"}

${deliveryText}

🛒 *Productos:*
${itemsText}

📝 *Subtotal:* S/ ${subtotal.toFixed(2)}
🚚 *Delivery:* S/ ${deliveryFee.toFixed(2)}
💰 *Total:* S/ ${total.toFixed(2)}

🗒️ *Nota:* ${note || "Sin nota"}

📍 *Ubicación:* ${STORE_ADDRESS}
🕜 *Horario:* ${STORE_HOURS}
`.trim();

    return msg;
  };

  const sendWhatsapp = async () => {
    if (!customerName.trim() || !phone.trim()) {
      alert("Completa tu nombre y celular.");
      return;
    }

    if (deliveryType === "delivery" && !address.trim()) {
      alert("Ingresa tu dirección para delivery.");
      return;
    }

    if (cart.length === 0) {
      alert("Agrega al menos 1 producto.");
      return;
    }

    try {
      // ✅ 1) Guardar pedido en tabla orders
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            customer_name: customerName,
            phone: phone,
            delivery_type: deliveryType,
            address: deliveryType === "delivery" ? address : null,
            note: note,
            subtotal: subtotal,
            delivery_fee: deliveryFee,
            total: total,
          },
        ])
        .select()
        .single();

      if (orderError) {
        console.error("Error guardando order:", orderError.message);
        alert("❌ Error guardando el pedido en Supabase.");
        return;
      }

      // ✅ 2) Guardar productos en tabla order_items
      const itemsToInsert = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        name_snapshot: item.name,
        price_snapshot: Number(item.price),
        quantity: item.qty,
        subtotal: Number(item.price) * item.qty,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error guardando items:", itemsError.message);
        alert("❌ Error guardando productos del pedido.");
        return;
      }

      // ✅ 3) Abrir WhatsApp
      const message = buildWhatsappMessage();
      const encoded = encodeURIComponent(message);

      const whatsappURL = `https://wa.me/51908953959?text=${encoded}`;
      window.open(whatsappURL, "_blank");

      // ✅ 4) Limpiar carrito y campos
      setCart([]);
      setCustomerName("");
      setPhone("");
      setAddress("");
      setNote("");

      // ✅ ✅ NUEVO: Mensaje bonito dentro del carrito
      setSuccessMsg("✅ Pedido guardado en Supabase y WhatsApp listo para enviar.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error general:", err);
      alert("❌ Ocurrió un error inesperado.");
    }
  };

  return (
    <main style={{ padding: 20, fontFamily: "Arial" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold" }}>{STORE_NAME}</h1>
      <p style={{ marginTop: 4, color: "#555" }}>
        {STORE_ADDRESS} • {STORE_HOURS}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
          gap: 20,
          marginTop: 20,
          alignItems: "start",
        }}
      >
        {/* ✅ Productos */}
        <section>
          <h2 style={{ fontSize: 22, fontWeight: "bold" }}>Productos</h2>

          {loading ? (
            <p style={{ marginTop: 20 }}>Cargando productos...</p>
          ) : products.length === 0 ? (
            <p style={{ marginTop: 20 }}>No hay productos disponibles.</p>
          ) : (
            <div
              style={{
                marginTop: 20,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{
                        width: "100%",
                        height: 130,
                        objectFit: "cover",
                        borderRadius: 10,
                        marginBottom: 10,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 130,
                        background: "#f2f2f2",
                        borderRadius: 10,
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#777",
                        fontSize: 12,
                      }}
                    >
                      Sin imagen
                    </div>
                  )}

                  <p style={{ fontWeight: "bold", marginBottom: 4 }}>{p.name}</p>
                  <p style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
                    {p.category || "Sin categoría"}
                  </p>
                  <p style={{ fontWeight: "bold" }}>
                    S/ {Number(p.price).toFixed(2)}
                  </p>

                  <button
                    onClick={() => addToCart(p)}
                    style={{
                      background: "black",
                      color: "white",
                      padding: "10px",
                      width: "100%",
                      marginTop: "10px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ✅ Carrito */}
        <aside
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 12,
            background: "#fff",
            position: "sticky",
            top: 20,
            height: "fit-content",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
            🛒 Carrito
          </h2>

          {/* ✅ ✅ NUEVO: Banner bonito */}
          {successMsg && (
            <div
              style={{
                background: "#d1fae5",
                color: "#065f46",
                padding: "10px",
                borderRadius: 10,
                fontSize: 14,
                marginBottom: 12,
                border: "1px solid #10b981",
              }}
            >
              {successMsg}
            </div>
          )}

          {cart.length === 0 ? (
            <p style={{ marginTop: 12, color: "#666" }}>
              Aún no agregaste productos.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #eee",
                    paddingBottom: 8,
                  }}
                >
                  <div>
                    <p style={{ fontWeight: "bold", margin: 0 }}>{item.name}</p>
                    <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                      S/ {Number(item.price).toFixed(2)} x {item.qty}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => decreaseQty(item.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        cursor: "pointer",
                        background: "#fff",
                      }}
                    >
                      ➖
                    </button>

                    <span
                      style={{
                        fontWeight: "bold",
                        minWidth: 18,
                        textAlign: "center",
                      }}
                    >
                      {item.qty}
                    </span>

                    <button
                      onClick={() => increaseQty(item.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        cursor: "pointer",
                        background: "#fff",
                      }}
                    >
                      ➕
                    </button>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        background: "red",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      ✖
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <hr style={{ margin: "16px 0" }} />

          <p>
            <b>Subtotal:</b> S/ {subtotal.toFixed(2)}
          </p>
          <p>
            <b>Delivery:</b> S/ {deliveryFee.toFixed(2)}
          </p>
          <p style={{ fontSize: 18 }}>
            <b>Total:</b> S/ {total.toFixed(2)}
          </p>

          <hr style={{ margin: "16px 0" }} />

          <input
            placeholder="Tu nombre"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 10,
            }}
          />

          <input
            placeholder="Tu celular"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 10,
            }}
          />

          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 10,
            }}
          >
            <option value="delivery">Delivery</option>
            <option value="pickup">Recojo en tienda</option>
          </select>

          {deliveryType === "delivery" && (
            <input
              placeholder="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ddd",
                marginBottom: 10,
              }}
            />
          )}

          <textarea
            placeholder="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 10,
              minHeight: 60,
            }}
          />

          <button
            onClick={sendWhatsapp}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: "#25D366",
              color: "white",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Enviar pedido por WhatsApp
          </button>
        </aside>
      </div>
    </main>
  );
}