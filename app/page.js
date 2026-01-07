"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <main style={{ padding: 20, fontFamily: "Arial" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold" }}>Bodega Matucana Express</h1>

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
              <p style={{ fontWeight: "bold" }}>S/ {Number(p.price).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}