'use client';

import { useSyncExternalStore } from 'react';
import { products as initialProducts } from '@/app/products';
import { getSupabase, hasSupabase, isPortablePreview } from '@/lib/supabase';

const KEY = 'matumarket-catalog-v1';
const EVENT = 'matumarket-catalog-changed';
let cachedRaw;
let cachedProducts = initialProducts;
let cachedCategories = [...new Set(initialProducts.map(p => p.category))];
let localError = '';
let cachedSnapshot = { products: initialProducts, categories: cachedCategories, error: '', loading: false, quantityReady: true, availabilityReady: true };
const localServerSnapshot = cachedSnapshot;
const remoteInitial = { products: [], categories: [], error: '', loading: true, quantityReady: false, availabilityReady: false };
const serverSnapshot = hasSupabase ? remoteInitial : localServerSnapshot;
let remoteSnapshot = remoteInitial;
const remoteListeners = new Set();
let remoteVersion = 0;
let remoteStop;
export const usesSharedCatalog = () => hasSupabase && !isPortablePreview();


export function validateProduct(product) {
  if (!product || typeof product.id !== 'string' || !product.id || typeof product.name !== 'string' || !product.name.trim() || product.name.length > 100) throw new Error('El producto necesita un nombre válido.');
  if (typeof product.category !== 'string' || !product.category.trim() || product.category.length > 60) throw new Error('Escribe una categoría.');
  if (typeof product.unit !== 'string' || !product.unit.trim() || product.unit.length > 80) throw new Error('Escribe una presentación.');
  if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price <= 0 || product.price > 100000) throw new Error('El precio debe ser mayor a cero y no superar S/ 100 000.');
  const image = product.image || '';
  if (typeof image !== 'string' || (image && !(/^https:\/\//.test(image) || /^\/products\/[a-z0-9-]+\.svg$/.test(image) || /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(image)))) throw new Error('Usa una imagen HTTPS o sube un archivo JPG, PNG o WebP.');
  if (typeof product.active !== 'boolean') throw new Error('Disponibilidad inválida.');
  if (product.in_stock !== undefined && typeof product.in_stock !== 'boolean') throw new Error('Disponibilidad de stock inválida.');
  const stock_quantity = product.stock_quantity ?? null;
  if (stock_quantity !== null && (!Number.isInteger(stock_quantity) || stock_quantity < 0 || stock_quantity > 1000000)) throw new Error('El stock debe ser una cantidad entera entre 0 y 1 000 000.');
  return { stock_quantity, in_stock: stock_quantity !== null ? stock_quantity > 0 : product.in_stock ?? true, id: product.id, name: product.name.trim(), category: product.category.trim(), unit: product.unit.trim(), price: Math.round(product.price * 100) / 100, image, active: product.active };
}

export function validateCategory(value) {
  if (typeof value !== 'string') throw new Error('El nombre de la categoría no es válido.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 60) throw new Error('La categoría debe tener entre 1 y 60 caracteres.');
  if (['todo', 'todas'].includes(categoryKey(name))) throw new Error('Elige un nombre distinto de Todo o Todas.');
  return name;
}
export function categoryKey(name) { return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es'); }
export function validateCatalog(value) {
  const source = Array.isArray(value) ? { products: value, categories: [] } : value;
  if (!source || !Array.isArray(source.products) || !Array.isArray(source.categories) || source.products.length > 200) throw new Error('La copia no contiene un catálogo válido de hasta 200 productos.');
  const products = source.products.map(validateProduct);
  if (new Set(products.map(p => p.id)).size !== products.length) throw new Error('Hay identificadores de productos duplicados.');
  const categories = source.categories.map(validateCategory);
  if (new Set(categories.map(categoryKey)).size !== categories.length) throw new Error('Hay categorías duplicadas.');
  for (const product of products) {
    const name = validateCategory(product.category);
    const canonical = categories.find(c => categoryKey(c) === categoryKey(name));
    if (canonical) product.category = canonical;
    else { categories.push(name); product.category = name; }
  }
  if (categories.length > 50) throw new Error('El catálogo admite hasta 50 categorías.');
  return { version: 2, products, categories };
}
function snapshot() {
  if (usesSharedCatalog()) return remoteSnapshot;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const value = raw === null ? validateCatalog(initialProducts) : validateCatalog(JSON.parse(raw));
      cachedProducts = value.products;
      cachedCategories = value.categories;
      localError = '';
    }
  } catch {
    localError = 'No se pudo leer el catálogo guardado. Mostramos los productos de ejemplo.';
    cachedProducts = initialProducts;
    cachedCategories = localServerSnapshot.categories;
  }
  if (cachedSnapshot.products !== cachedProducts || cachedSnapshot.categories !== cachedCategories || cachedSnapshot.error !== localError) cachedSnapshot = { products: cachedProducts, categories: cachedCategories, error: localError, loading: false, quantityReady: true, availabilityReady: true };
  return cachedSnapshot;
}
function subscribe(callback) {
  if (usesSharedCatalog()) {
    remoteListeners.add(callback);
    if (!remoteStop) {
      let client;
      try { client = getSupabase(); } catch {
        remoteSnapshot = { products: [], categories: [], loading: false, error: 'La conexión de Supabase no está configurada correctamente.' };
        callback(); return () => { remoteListeners.delete(callback); };
      }
      const timer = setInterval(() => { void refreshRemoteCatalog(); }, 30000);
      const focus = () => { void refreshRemoteCatalog(); };
      window.addEventListener('focus', focus);
      const { data } = client.auth.onAuthStateChange(() => { setTimeout(focus, 0); });
      remoteStop = () => { clearInterval(timer); window.removeEventListener('focus', focus); data.subscription.unsubscribe(); remoteStop = null; };
      void refreshRemoteCatalog();
    }
    return () => { remoteListeners.delete(callback); if (!remoteListeners.size) remoteStop?.(); };
  }
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(EVENT, callback); };
}
export function useCatalog() {
  return useSyncExternalStore(subscribe, snapshot, () => serverSnapshot);
}
export async function saveCatalog(products, categories = snapshot().categories) {
  const validated = validateCatalog({ products, categories });
  if (usesSharedCatalog()) {
    if (!remoteSnapshot.quantityReady && validated.products.some(p=>p.stock_quantity!==null)) throw new Error('Ejecuta supabase/inventory.sql para importar cantidades.');
    if (!remoteSnapshot.availabilityReady && validated.products.some(p => !p.in_stock)) throw new Error('Ejecuta supabase/availability-hours.sql para importar productos agotados.');
    const uploaded = [];
    for (const product of validated.products) uploaded.push(await prepareSharedProduct(product));
    const { error } = await getSupabase().rpc('matumarket_replace_catalog', { payload: { ...validated, products: uploaded } });
    if (error) throw new Error('No se pudo importar el catálogo compartido. Verifica tus permisos y la configuración.');
    await refreshRemoteCatalog(); return;
  }
  try { localStorage.setItem(KEY, JSON.stringify(validated)); }
  catch { throw new Error('No hay espacio para guardar. Usa imágenes más pequeñas o exporta una copia del catálogo.'); }
  window.dispatchEvent(new Event(EVENT));
}
export async function addCategory(name) {
  const category = validateCategory(name);
  const current = snapshot();
  if (current.categories.length >= 50) throw new Error('El catálogo admite hasta 50 categorías.');
  if (current.categories.some(c => categoryKey(c) === categoryKey(category))) throw new Error('Ya existe una categoría con ese nombre.');
  if (usesSharedCatalog()) {
    const { error } = await getSupabase().from('matumarket_categories').insert({ name: category });
    if (error) throw new Error(error.code === '23505' ? 'Ya existe una categoría con ese nombre.' : 'No se pudo crear la categoría. Verifica tus permisos y conexión.');
    await refreshRemoteCatalog();
  } else await saveCatalog(current.products, [...current.categories, category]);
  return category;
}
export async function imageFromFile(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Selecciona un archivo JPG, PNG o WebP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 5 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return canvas.toDataURL('image/webp', 0.8);
}

export async function refreshRemoteCatalog() {
  const version = ++remoteVersion;
  try {
    const client = getSupabase();
    const results = await Promise.all([
      client.from('matumarket_products').select('id,name,category,unit,price,image,active').order('name'),
      client.from('matumarket_categories').select('name').order('name'),
      client.from('matumarket_products').select('id,in_stock'),
    ]);
    if (results.slice(0,2).some(result => result.error)) throw new Error('No se pudo cargar el catálogo de Supabase. Verifica las tablas, permisos y conexión.');
    const quantities = await client.from('matumarket_products').select('id,stock_quantity');
    if (quantities.error && !['PGRST204','42703','PGRST205'].includes(quantities.error.code)) throw new Error('No se pudo comprobar el stock.');
    const quantityMap = new Map((quantities.data || []).map(p=>[p.id,p.stock_quantity]));
    const stock = results[2];
    if (stock.error && !['PGRST204','42703','PGRST205'].includes(stock.error.code)) throw new Error('No se pudo verificar la disponibilidad de los productos.');
    const stockMap = new Map((stock.data || []).map(p => [p.id,p.in_stock]));
    const value = validateCatalog({ products: results[0].data.map(p => ({ ...p, stock_quantity: quantityMap.get(p.id) ?? null, in_stock: stockMap.get(p.id) ?? true, price: Number(p.price) })), categories: results[1].data.map(c => c.name) });
    if (version === remoteVersion) remoteSnapshot = { products: value.products, categories: value.categories, error: '', loading: false, quantityReady: !quantities.error, availabilityReady: !stock.error };
  } catch (error) {
    if (version === remoteVersion) remoteSnapshot = { products: [], categories: [], error: error.message || 'No se pudo cargar el catálogo compartido.', loading: false, availabilityReady: false };
  }
  remoteListeners.forEach(listener => listener());
}
async function prepareSharedProduct(product) {
  const validated = validateProduct(product);
  if (validated.image.startsWith('data:image/')) {
    const source = await (await fetch(validated.image)).blob();
    const optimized = await imageFromFile(new File([source], 'imagen', { type: source.type }));
    const blob = await (await fetch(optimized)).blob();
    const path = `products/${crypto.randomUUID()}.webp`;
    const client = getSupabase();
    const { error } = await client.storage.from('matumarket-images').upload(path, blob, { contentType: 'image/webp', upsert: false });
    if (error) throw new Error('No se pudo subir la imagen. Comprueba los permisos, el bucket y la conexión.');
    validated.image = client.storage.from('matumarket-images').getPublicUrl(path).data.publicUrl;
  }
  return validated;
}
export async function saveProduct(product, { updateStock = false } = {}) {
  if (!usesSharedCatalog()) {
    const current = snapshot();
    const original = current.products.find(p=>p.id===product.id);
    if (original && !updateStock) product={...product,stock_quantity:original.stock_quantity};
    const exists = Boolean(original);
    await saveCatalog(exists ? current.products.map(p => p.id === product.id ? product : p) : [...current.products, product]); return;
  }
  if (!remoteSnapshot.products.some(p => p.id === product.id) && remoteSnapshot.products.length >= 200) throw new Error('El catálogo admite hasta 200 productos.');
  const prepared = await prepareSharedProduct(product);
  if (!remoteSnapshot.availabilityReady) {
    if (!prepared.in_stock) throw new Error('Ejecuta supabase/availability-hours.sql para marcar productos agotados.');
    delete prepared.in_stock;
  }
  const existing = remoteSnapshot.products.some(p=>p.id===product.id);
  if (!remoteSnapshot.quantityReady && prepared.stock_quantity !== null) throw new Error('Ejecuta supabase/inventory.sql para guardar cantidades.');
  if (!remoteSnapshot.quantityReady || (existing && !updateStock)) delete prepared.stock_quantity;
  const query = getSupabase().from('matumarket_products');
  const { error } = existing ? await query.update(prepared).eq('id',prepared.id).select('id').single() : await query.insert(prepared);
  if (error) throw new Error('No se pudo guardar el producto. Comprueba tus permisos y conexión.');
  await refreshRemoteCatalog();
}

export async function confirmInventorySale(saleId, items) {
  if (!Array.isArray(items) || !items.length || new Set(items.map(i=>i.productId)).size!==items.length || items.some(i=>!i.productId||!Number.isInteger(i.qty)||i.qty<1||i.qty>1000000)) throw new Error('Revisa productos y cantidades de la venta.');
  if (usesSharedCatalog()) {
    const {error}=await getSupabase().rpc('matumarket_confirm_sale',{sale_id:saleId,sale_items:items});
    if(error)throw new Error('No se descontó stock. Revisa si hay unidades suficientes, productos con cantidad configurada y permisos.');
    await refreshRemoteCatalog();
  } else {
    const current=snapshot();
    const ledger=JSON.parse(localStorage.getItem('matumarket-sales-v1')||'[]');
    if(ledger.includes(saleId))return;
    for(const item of items){const p=current.products.find(p=>p.id===item.productId);if(!p||p.stock_quantity===null||p.stock_quantity<item.qty)throw new Error('Configura cantidades y revisa que haya stock suficiente.');}
    await saveCatalog(current.products.map(p=>{const item=items.find(i=>i.productId===p.id);return item?{...p,stock_quantity:p.stock_quantity-item.qty,in_stock:p.stock_quantity-item.qty>0}:p;}));
    localStorage.setItem('matumarket-sales-v1',JSON.stringify([...ledger,saleId]));
  }
}

export async function renameCategory(previousName, nextName) {
  const name = validateCategory(nextName);
  const current = snapshot();
  if (!current.categories.includes(previousName)) throw new Error('La categoría ya no existe. Actualiza el panel.');
  if (current.categories.some(c=>c!==previousName && categoryKey(c)===categoryKey(name))) throw new Error('Ya existe una categoría con ese nombre.');
  if (name === previousName) return name;
  if (usesSharedCatalog()) {
    const {error}=await getSupabase().from('matumarket_categories').update({name}).eq('name',previousName).select('name').single();
    if (error) throw new Error(error.code==='23505' ? 'Ya existe una categoría con ese nombre.' : 'No se pudo renombrar la categoría. Revisa tus permisos y conexión.');
    await refreshRemoteCatalog();
  } else await saveCatalog(current.products.map(p=>p.category===previousName?{...p,category:name}:p),current.categories.map(c=>c===previousName?name:c));
  return name;
}
