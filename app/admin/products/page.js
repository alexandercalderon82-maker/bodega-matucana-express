"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // formulario nuevo producto
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const loadProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Error cargando productos");
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addProduct = async () => {
    if (!name.trim()) return alert("Falta nombre");
    if (!category.trim()) return alert("Falta categoría");
    if (!price || isNaN(Number(price))) return alert("Precio inválido");

    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      category: category.trim(),
      price: Number(price),
      image_url: imageUrl.trim() || null,
      is_active: true,
    });

    if (error) {
      console.error(error);
      alert("Error agregando producto");
      return;
    }

    setName("");
    setCategory("");
    setPrice("");
    setImageUrl("");
    loadProducts();
  };

  const toggleActive = async (id, current) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Error actualizando");
      return;
    }

    loadProducts();
  };

  const deleteProduct = async (id) => {
    const confirmDelete = confirm("¿Seguro quieres eliminar este producto?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Error eliminando producto");
      return;
    }

    loadProducts();
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <a
          href="/admin"
          className="inline-block text-gray-300 hover:text-white transition"
        >
          ⬅ Volver
        </a>

        <h1 className="text-3xl font-bold mt-3">Admin — Productos</h1>
        <p className="text-gray-300 mt-2">
          Agrega, edita, activa/desactiva o elimina productos de tu tienda.
        </p>

        {/* Formulario */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-bold">➕ Agregar producto</h2>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              className="rounded-xl bg-black border border-white/10 px-3 py-2 outline-none"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoría"
              className="rounded-xl bg-black border border-white/10 px-3 py-2 outline-none"
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Precio (S/)"
              className="rounded-xl bg-black border border-white/10 px-3 py-2 outline-none"
            />
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL de imagen (opcional)"
              className="rounded-xl bg-black border border-white/10 px-3 py-2 outline-none"
            />
          </div>

          <button
            onClick={addProduct}
            className="mt-4 rounded-xl bg-green-500 text-black px-5 py-2 font-bold hover:opacity-90 transition"
          >
            + Agregar producto
          </button>
        </div>

        {/* Lista */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-3">📦 Lista de productos</h2>

          {loading ? (
            <p className="text-gray-300">Cargando...</p>
          ) : products.length === 0 ? (
            <p className="text-gray-300">No hay productos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold truncate">{p.name}</p>
                      <p className="text-sm text-gray-300">{p.category}</p>
                      <p className="mt-2 font-bold">
                        S/ {Number(p.price).toFixed(2)}
                      </p>

                      <p className="text-xs text-gray-400 mt-2 break-all">
                        {p.image_url || "Sin imagen"}
                      </p>

                      <p className="text-sm mt-2">
                        Estado:{" "}
                        {p.is_active ? (
                          <span className="text-green-400 font-semibold">
                            ✅ Activo
                          </span>
                        ) : (
                          <span className="text-red-400 font-semibold">
                            ❌ Inactivo
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => toggleActive(p.id, p.is_active)}
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 transition"
                    >
                      {p.is_active ? "Desactivar" : "Activar"}
                    </button>

                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold hover:opacity-90 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}