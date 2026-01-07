export default function AdminHome() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold">Panel Admin</h1>
        <p className="text-gray-300 mt-2">
          Administra productos y revisa pedidos de tu tienda.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <a
            href="/admin/products"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
          >
            <h2 className="text-xl font-bold">🛒 Productos</h2>
            <p className="text-gray-300 mt-2">
              Agregar, editar, activar/desactivar y eliminar productos.
            </p>
          </a>

          <a
            href="/admin/orders"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
          >
            <h2 className="text-xl font-bold">📦 Pedidos</h2>
            <p className="text-gray-300 mt-2">
              Ver pedidos recibidos y su detalle.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}