export function validatePromotion(value) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)) throw new Error('Identificador de promoción inválido.');
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100) throw new Error('Escribe un nombre de hasta 100 caracteres.');
  if (!['offer', 'combo'].includes(value.kind) || !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 20) throw new Error('Selecciona los productos de la promoción.');
  if (new Set(value.items.map(i => i.productId)).size !== value.items.length || value.items.some(i => typeof i.productId !== 'string' || !i.productId || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 100)) throw new Error('Revisa los productos y sus cantidades (1 a 100).');
  if (value.kind === 'offer' && (value.items.length !== 1 || value.items[0].qty !== 1)) throw new Error('Una oferta corresponde a una unidad de un producto.');
  if (value.kind === 'combo' && value.items.length < 2) throw new Error('El combo debe incluir al menos dos productos distintos.');
  const price = Number(value.price);
  if (!Number.isFinite(price) || price <= 0 || price > 100000) throw new Error('Escribe un precio válido mayor a cero.');
  const start = value.starts_at || null; const end = value.ends_at || null;
  if ((start && !Number.isFinite(Date.parse(start))) || (end && !Number.isFinite(Date.parse(end))) || (start && end && Date.parse(end) <= Date.parse(start))) throw new Error('La fecha final debe ser posterior al inicio.');
  if (typeof value.active !== 'boolean') throw new Error('Estado de promoción inválido.');
  return { id: value.id, name: value.name.trim(), kind: value.kind, items: value.items.map(i => ({productId:i.productId,qty:i.qty})), price:Math.round(price*100)/100, active:value.active, starts_at:start, ends_at:end };
}
export function promotionProduct(promotion, products, now = Date.now()) {
  if (!promotion.active || (promotion.starts_at && now < Date.parse(promotion.starts_at)) || (promotion.ends_at && now >= Date.parse(promotion.ends_at))) return null;
  const included = promotion.items.map(item => ({ ...item, product: products.find(p => p.id === item.productId && p.active && p.in_stock !== false) }));
  if (included.some(item => !item.product)) return null;
  const regularPrice = Math.round(included.reduce((sum,i) => sum + i.product.price*i.qty,0)*100)/100;
  if (promotion.price >= regularPrice) return null;
  return { id:`promotion:${promotion.id}`, name:promotion.name, unit:included.map(i => `${i.qty} × ${i.product.name} (${i.product.unit})`).join(' + '), price:promotion.price, regularPrice, image:included[0].product.image, kind:promotion.kind, ends_at:promotion.ends_at };
}

export function promotionTime() { return Date.now(); }
