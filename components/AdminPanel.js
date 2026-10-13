'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Brand from './Brand';
import Icon from './Icons';
import ProductImage from './ProductImage';
import StoreSettingsPanel from './StoreSettingsPanel';
import PromotionsPanel from './PromotionsPanel';
import { useCatalog, saveCatalog, imageFromFile, validateProduct, validateCatalog, addCategory, saveProduct, usesSharedCatalog } from '@/lib/catalog';

const blank = { id: '', name: '', category: 'Abarrotes', unit: '', price: '', image: '', active: true, in_stock: true };

export default function AdminPanel({ onStore, demo = false, onLogout }) {
  const { products, categories, loading, error: catalogError, availabilityReady } = useCatalog();
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(blank);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!editing) return;
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function keyboard(event) {
      if (event.key === 'Escape' && !busy) { setEditing(null); return; }
      if (event.key !== 'Tab') return;
      const controls = [...document.querySelectorAll('.product-editor button:not(:disabled), .product-editor input:not(:disabled), .product-editor textarea')].filter(node => node.offsetParent !== null);
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); document.body.style.overflow = overflow; before?.focus(); };
  }, [editing, busy]);

  function open(product, category = selectedCategory) {
    setDraft(product ? { ...product } : { ...blank, category: category || categories[0] || 'Abarrotes', id: crypto.randomUUID() });
    setEditing(product ? 'edit' : 'new'); setMessage(''); setError('');
  }
  async function upload(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError('');
    try { const image = await imageFromFile(file); setDraft(previous => ({ ...previous, image })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); event.target.value = ''; }
  }
  async function save(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const product = validateProduct({ ...draft, price: Number(draft.price) });
      await saveProduct(product); setEditing(null); setMessage(`${product.name}: cambios guardados ${usesSharedCatalog() ? 'en la tienda compartida' : 'en este navegador'}.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function toggle(product) {
    setBusy(true);
    try { await saveProduct({ ...product, active: !product.active }); setMessage(`${product.name}: ${product.active ? 'oculto' : 'visible'} en la tienda.`); setError(''); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function toggleStock(product) {
    setBusy(true); setError('');
    try { await saveProduct({ ...product, in_stock: product.in_stock === false }); setMessage(`${product.name}: ${product.in_stock === false ? 'disponible' : 'agotado'}.`); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function exportCatalog() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 2, products, categories }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'matumarket-productos.json'; link.click(); URL.revokeObjectURL(url);
  }
  async function importCatalog(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setError('');
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error('La copia del catálogo debe pesar menos de 4 MB.');
      const parsed = JSON.parse(await file.text());
      const restored = validateCatalog(parsed);
      if (!window.confirm(`¿Reemplazar el catálogo ${usesSharedCatalog() ? 'compartido de la tienda' : 'local'} con los ${restored.products.length} productos y ${restored.categories.length} categorías de esta copia?`)) return;
      await saveCatalog(restored.products, restored.categories); setSelectedCategory(''); setMessage(`Catálogo restaurado ${usesSharedCatalog() ? 'en la tienda compartida' : 'en este navegador'}.`);
    } catch (e) { setError(e instanceof SyntaxError ? 'El archivo no es una copia JSON válida.' : e.message); }
    finally { event.target.value = ''; }
  }
  async function createCategory(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const name = await addCategory(categoryName); setSelectedCategory(name); setEditing(null);
      setMessage(`Categoría ${name} creada. Ya puedes agregar sus productos.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function openCategory() { setCategoryName(''); setEditing('category'); setError(''); }
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (!selectedCategory || p.category === selectedCategory));
  const groups = (selectedCategory ? [selectedCategory] : categories).map(category => ({ category, products: filtered.filter(p => p.category === category) })).filter(group => !search || group.products.length);

  return <div className="admin-shell">
    <header className="header wrap"><Brand onClick={onStore ? e => { e.preventDefault(); onStore(); } : undefined}/><div className="admin-header-actions">{onLogout && <button className="outline-button" onClick={onLogout}><Icon name="logout" size={16}/>{demo ? 'Salir de la demo' : 'Cerrar sesión'}</button>}<Link className="outline-button" href="/" onClick={onStore ? e => { e.preventDefault(); onStore(); } : undefined}>Ver tienda <Icon name="arrow" size={16}/></Link></div></header>
    <main className="wrap admin-main">
      <div className="admin-title"><div><span className="eyebrow">TU NEGOCIO, A TU MANERA</span><h1>Control de productos</h1><p>Actualiza tu catálogo en unos pocos pasos.</p></div><div className="admin-title-actions"><button className="outline-button" disabled={busy || loading} onClick={openCategory}><Icon name="plus" size={18}/> Nueva categoría</button><button className="primary" disabled={busy || loading || !categories.length} title={!categories.length ? 'Crea una categoría primero' : undefined} onClick={() => open()}><Icon name="plus" size={18}/> Nuevo producto</button></div></div>
      <div className={demo ? "demo-banner" : "connection-banner"}><Icon name="settings"/><div><strong>{demo ? 'Panel de demostración local' : 'Administración con acceso autorizado'}</strong><p>{demo ? 'Los cambios se guardan solo en este navegador. El acceso real requiere la web conectada a Supabase.' : 'Los cambios se guardan en Supabase y se comparten con los clientes de la tienda.'}</p></div></div>
      <StoreSettingsPanel/>
      <PromotionsPanel products={products}/>
      {!loading && !availabilityReady && <p className="status">Para habilitar «Agotado», ejecuta supabase/availability-hours.sql en Supabase.</p>}
      <div className="admin-stats"><div><span>Productos</span><strong>{products.length}</strong></div><div><span>Visibles en tienda</span><strong>{products.filter(p => p.active).length}</strong></div><div><span>Categorías</span><strong>{categories.length}</strong></div></div>
      {loading && <p role="status" className="status">Cargando categorías y productos…</p>}
      {message && <p className="status" role="status"><Icon name="check"/>{message}</p>}
      {(catalogError || (!editing && error)) && <p className="error" role="alert">{catalogError || error}</p>}
      <div className="admin-toolbar"><label className="search"><Icon name="search"/><input type="search" aria-label="Buscar en administración" placeholder="Buscar un producto…" value={search} onChange={e => setSearch(e.target.value)}/></label><div className="catalog-backup-actions"><label className="upload-button">Importar copia<input type="file" accept="application/json,.json" aria-label="Importar copia del catálogo" onChange={importCatalog}/></label><button className="outline-button" onClick={exportCatalog}>Exportar catálogo</button></div></div>
      <div className="category-workspace">
        <aside className="category-sidebar"><div className="category-sidebar-heading"><strong>Categorías</strong><button aria-label="Agregar categoría" disabled={busy || loading} onClick={openCategory}><Icon name="plus" size={16}/></button></div><button className={!selectedCategory ? 'selected' : ''} aria-pressed={!selectedCategory} onClick={() => setSelectedCategory('')}>Todas las categorías <span>{products.length}</span></button>{categories.map(category => <button key={category} className={selectedCategory === category ? 'selected' : ''} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{category}<span>{products.filter(p => p.category === category).length}</span></button>)}</aside>
        <div className="category-groups">{groups.map(group => <section className="category-group" key={group.category}><header><div><h2>{group.category}</h2><span>{group.products.length} {group.products.length === 1 ? 'producto' : 'productos'}</span></div><button className="text-button" aria-label={`Agregar producto en ${group.category}`} onClick={() => open(null, group.category)}><Icon name="plus" size={16}/> Agregar producto</button></header><ProductTable products={group.products} toggle={toggle} toggleStock={toggleStock} availabilityReady={availabilityReady} open={open} busy={busy}/></section>)}{!groups.length && <p className="empty">No hay productos que coincidan con la búsqueda en esta categoría.</p>}</div>
      </div>
      {editing && <div className="modal-backdrop"><section className="product-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="section-heading"><h2 id="editor-title">{editing === 'category' ? 'Nueva categoría' : editing === 'new' ? 'Nuevo producto' : 'Editar producto'}</h2><button className="close-button" aria-label="Cerrar editor" disabled={busy} onClick={() => setEditing(null)}>×</button></div>{editing === 'category' ? <form onSubmit={createCategory}><p className="muted">Organiza tus productos en categorías. Puedes crearla ahora y añadir productos después.</p><label className="field">Nombre de categoría<input autoFocus required maxLength={60} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Ej. Limpieza, Panadería…"/></label>{error && <p className="error" role="alert">{error}</p>}<div className="editor-actions"><button type="button" className="outline-button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button><button className="primary" disabled={busy} type="submit">Crear categoría <Icon name="check" size={16}/></button></div></form> : <form onSubmit={save}>
        <div className="editor-image"><ProductImage key={draft.image} src={draft.image} name={draft.name || 'Producto'}/><div><label className="upload-button">{busy ? 'Procesando imagen…' : 'Subir imagen'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy}/></label><p>JPG, PNG o WebP · Hasta 5 MB<br/>Se optimiza automáticamente.</p></div></div>
        <label className="field">Nombre<input autoFocus required maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></label>
        <div className="editor-grid"><label className="field">Precio (S/)<input type="number" required min="0.01" max="100000" step="0.01" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })}/></label><label className="field">Presentación<input required maxLength={80} placeholder="Ej. 1 kg" value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })}/></label></div>
        <label className="field">Categoría<select aria-label="Categoría" required value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>

        <label className="field">URL de imagen <span>(opcional, HTTPS)</span><input type="url" value={draft.image.startsWith('https://') ? draft.image : ''} placeholder="https://…" onChange={e => setDraft({ ...draft, image: e.target.value })}/></label>
        <label className="checkbox-field"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })}/> Mostrar en la tienda</label>
        <label className="checkbox-field"><input type="checkbox" disabled={!availabilityReady} checked={draft.in_stock !== false} onChange={e => setDraft({ ...draft, in_stock: e.target.checked })}/> Disponible para comprar</label><p className="muted">Desmarca para mostrar «Agotado». La visibilidad se controla por separado.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="editor-actions"><button type="button" className="outline-button" onClick={() => setEditing(null)} disabled={busy}>Cancelar</button><button className="primary" disabled={busy} type="submit">Guardar cambios <Icon name="check" size={16}/></button></div>
      </form>}</section></div>}
      <p className="admin-footnote">{demo ? 'Consejo: exporta una copia. Borrar los datos del navegador elimina los cambios de esta demo.' : 'Exporta una copia del catálogo cuando necesites un respaldo adicional.'}</p>
    </main>
  </div>;
}

function ProductTable({ products, toggle, toggleStock, availabilityReady, open, busy }) {
  if (!products.length) return <p className="empty category-empty">Esta categoría está lista. Agrega tu primer producto para empezar.</p>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Disponibilidad</th><th>Visibilidad</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><div className="admin-product"><ProductImage key={p.image} src={p.image} name={p.name}/><div><strong>{p.name}</strong><small>{p.unit}</small></div></div></td><td>{p.category}</td><td className="price">S/ {p.price.toFixed(2)}</td><td><button className={`visibility ${p.in_stock !== false ? 'is-active' : ''}`} disabled={busy || !availabilityReady} aria-label={`${p.in_stock === false ? 'Marcar disponible' : 'Marcar agotado'} ${p.name}`} onClick={() => toggleStock(p)}>{p.in_stock === false ? 'Agotado' : 'Disponible'}</button></td><td><button className={`visibility ${p.active ? 'is-active' : ''}`} aria-label={`${p.active ? 'Ocultar' : 'Mostrar'} ${p.name}`} disabled={busy} onClick={() => toggle(p)}>{p.active ? 'Visible' : 'Oculto'}</button></td><td><button className="text-button" aria-label={`Editar ${p.name}`} onClick={() => open(p)}>Editar <Icon name="arrow" size={14}/></button></td></tr>)}</tbody></table></div>;
}
