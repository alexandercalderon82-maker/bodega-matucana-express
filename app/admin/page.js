"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || "admin123";

export default function AdminPage() {
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const loadProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (authed) loadProducts();
  }, [authed]);

  const login = () => {
    if (pass === ADMIN_PASS) setAuthed(true);
    else alert("Clave incorrecta");
  };

  const updateProduct = async (id, patch) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) {
      console.error(error);
      alert("Error actualizando");
      return;
    }
    loadProducts();
  };

  const addProduct = async () => {
    if (!newName.trim()) return alert("Falta nombre");
    if (!newCategory.trim()) return alert("Falta categoría");
    if (!newPrice || isNaN(Number(newPrice))) return alert("Precio inválido");

    const { error } = await supabase.from("products").insert({
      name: newName.trim(),
      category: newCategory.trim(),
      price: Number(newPrice),
      image_url: newImageUrl.trim() || null,
      is_active: true,
    });

    if (error) {
      console.error(error);
      alert("Error agregando producto");
      return;
    }

    setNewName("");
    setNewCategory("");
    setNewPrice("");
    setNewImageUrl("");
    loadProducts();
  };

  if (!authed) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto rounded-xl border border-white/10 bg-white/5 p-5">
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-gray-300 text-sm mt-1">Ingresa tu clave</p>

          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="mt-4 w-full rounded-lg bg-black border border-white/10 px-3 py-2"
            placeholder="Clave admin"
            type="password"
          />

          <button
            onClick={login}
            className="mt-4 w-full rounded-lg bg-white text-black py-2 font-bold"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Panel Admin</h1>
        <p className="text-gray-300 text-sm mt-1">
          Aquí puedes editar productos y precios.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold">Agregar producto</h2>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre"
              className="rounded-lg bg-black border border-white/10 px-3 py-2"
            />
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Categoría"
              className="rounded-lg bg-black border border-white/10 px-3 py-2"
            />
            <input
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Precio"
              className="rounded-lg bg-black border border-white/10 px-3 py-2"
            />
            <input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Image URL (opcional)"
              className="rounded-lg bg-black border border-white/10 px-3 py-2"
            />
          </div>

          <button
            onClick={addProduct}
            className="mt-3 rounded-lg bg-green-500 text-black px-4 py-2 font-bold"
          >
            + Agregar
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Productos</h2>

          {loading ? (
            <p className="text-gray-300">Cargando...</p>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-bold">{p.name}</p>
                      <p className="text-sm text-gray-300">
                        {p.category} — S/ {Number(p.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 break-all">
                        {p.image_url || "Sin imagen"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          updateProduct(p.id, { is_active: !p.is_active })
                        }
                        className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
                      >
                        {p.is_active ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        onClick={() => {
                          const newPrice = prompt("Nuevo precio:", p.price);
                          if (newPrice === null) return;
                          updateProduct(p.id, { price: Number(newPrice) });
                        }}
                        className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-black"
                      >
                        Cambiar precio
                      </button>

                      <button
                        onClick={() => {
                          const newImg = prompt(
                            "Nueva URL de imagen:",
                            p.image_url || ""
                          );
                          if (newImg === null) return;
                          updateProduct(p.id, { image_url: newImg.trim() || null });
                        }}
                        className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
                      >
                        Cambiar imagen
                      </button>
                    </div>
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