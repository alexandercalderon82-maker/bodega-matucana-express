'use client';

import { useEffect, useState } from 'react';
import { store } from './products';
import Brand from '@/components/Brand';
import Icon from '@/components/Icons';
import DeliveryMap from '@/components/DeliveryMap';
import {locationLink} from '@/lib/delivery-location';
import { isStoreOpen, hoursLabel } from '@/lib/store-hours';
import { useStoreSettings } from '@/lib/store-settings';
import { usePromotions } from '@/lib/promotions';
import { promotionProduct, promotionTime } from '@/lib/promotion-rules';
import ProductImage from '@/components/ProductImage';
import AdminAccess from '@/components/AdminAccess';
import { useCatalog, usesSharedCatalog } from '@/lib/catalog';

const money = value => `S/ ${value.toFixed(2)}`;

export default function Home() {
  const shared = usesSharedCatalog();
  const { settings } = useStoreSettings();
  const { products: catalog, categories: catalogCategories, error, loading } = useCatalog();
  const products = catalog.filter(p => p.active);
  const { promotions } = usePromotions();
  const [now, setNow] = useState(0);
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, []);
  const open = now ? isStoreOpen(settings, now) : null;
  const hours = hoursLabel(settings);
  const offers = now ? promotions.map(p => promotionProduct(p, catalog, now)).filter(Boolean) : [];
  const categories = ['Todo', ...catalogCategories];
  const [view, setView] = useState('store');
  const [category, setCategory] = useState('Todo');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [delivery, setDelivery] = useState('pickup');
  const [deliveryZone, setDeliveryZone] = useState('');
  const [sent, setSent] = useState(false);
  const [deliveryPoint,setDeliveryPoint]=useState(null);
  const purchasable = [...products.filter(p => p.in_stock !== false).map(p => ({ ...p, id: `product:${p.id}` })), ...offers];
  const items = purchasable.filter(p => cart[p.id]).map(p => ({ ...p, qty: cart[p.id] }));
  const unavailableProducts = Object.keys(cart).filter(id => id.startsWith('product:') && cart[id] > 0 && !purchasable.some(p => p.id === id));
  const unavailablePromotions = Object.keys(cart).filter(id => id.startsWith('promotion:') && cart[id] > 0 && !offers.some(p => p.id === id));
  const count = items.reduce((sum, p) => sum + p.qty, 0);
  const subtotal = items.reduce((sum, p) => sum + p.price * p.qty, 0);
  const zoneFee = deliveryZone === 'center' ? settings.centerDeliveryFee : settings.deliveryFee;
  const pendingZone = delivery === 'delivery' && !deliveryZone;
  const fee = delivery === 'delivery' && count && !pendingZone ? zoneFee : 0;
  const visible = products.filter(p => (category === 'Todo' || p.category === category) && p.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));

  function change(id, delta) {
    setCart(previous => ({ ...previous, [id]: Math.max(0, (previous[id] || 0) + delta) }));
    setSent(false);
  }

  function order(event) {
    event.preventDefault();
    if (!count || unavailablePromotions.length || unavailableProducts.length) return;
    const submittedAt = promotionTime();
    if (items.some(p => p.ends_at && submittedAt >= Date.parse(p.ends_at))) { setNow(submittedAt); return; }
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const address = String(data.get('address') || '').trim();
    if (!name || !phone || (delivery === 'delivery' && (!address || pendingZone))) return;
    const requestedPayment = String(data.get('payment') || '');
    const payment = settings.paymentMethods.includes(requestedPayment) ? requestedPayment : 'A coordinar por WhatsApp';
    const message = [
      `🛍️ *PEDIDO · ${store.name}*`,
      '¡Hola! Me gustaría realizar el siguiente pedido.',
      ...(!isStoreOpen(settings, submittedAt) ? ['🕒 La tienda no está atendiendo en este momento. Quedo pendiente de confirmación cuando retomen la atención.'] : []),
      '', '👤 *Datos del cliente*', `Nombre: ${name}`, `Celular: ${phone}`,
      '', delivery === 'delivery' ? '🛵 *Entrega a domicilio*' : '🏪 *Recojo en tienda*',
      ...(delivery === 'delivery' ? [`Zona de entrega: ${deliveryZone === 'center' ? 'Matucana centro' : 'Alrededores de Matucana'}`] : []),
      delivery === 'delivery' ? `Dirección y referencia: ${address}` : `Dirección: ${store.address}`,
      ...(delivery==='delivery'&&locationLink(deliveryPoint)?[`📍 Ubicación en el mapa: ${locationLink(deliveryPoint)}`]:[]),
      '', '📦 *Productos*',
      ...items.map(p => `• ${p.name} (${p.unit}) × ${p.qty}: ${money(p.price * p.qty)}`),
      '', '💰 *Resumen del pedido*', `Subtotal referencial: ${money(subtotal)}`,
      ...(delivery === 'delivery' ? [`Delivery referencial: ${money(fee)}`] : []),
      `*Total referencial: ${money(subtotal + fee)}*`,
      '', `💳 *Forma de pago:* ${payment}`,
      ...(String(data.get('note') || '').trim() ? ['', `📝 *Nota:* ${String(data.get('note')).trim()}`] : []),
      '', shared ? '✅ Por favor, confirmen disponibilidad, total y horario de entrega o recojo. ¡Gracias!' : '✅ Catálogo de ejemplo: por favor, confirmen productos, precios y disponibilidad. ¡Gracias!',
    ].join('\n');
    const whatsappUrl = new URL('https://api.whatsapp.com/send');
    whatsappUrl.searchParams.set('phone', store.whatsapp);
    whatsappUrl.searchParams.set('text', message);
    window.open(whatsappUrl.toString(), '_blank', 'noopener,noreferrer');
    setSent(true);
  }

  if (view === 'admin') return <AdminAccess onStore={() => setView('store')}/>;

  return (
    <>
      <div className="topbar"><span>De Matucana, para ti.</span><span>Atendemos de {hours}</span><span>Pedidos por WhatsApp <Icon name="arrow" size={12}/></span></div>
      <header className="header wrap">
        <Brand onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/><nav className="header-nav"><a href="#catalogo">Catálogo</a><a href="#como-comprar">Cómo comprar</a><button onClick={() => setView('admin')}>Administración</button></nav>
        <a className="cart-link" href="#pedido"><Icon name="bag" size={18}/> Mi pedido <span>{count}</span></a>
      </header>
      <main className="wrap">
        <section className="hero">
          <div className="hero-copy"><span className="hero-pill"><span/> EL MERCADO DE TU BARRIO</span><h1>Tu día empieza<br/>con algo <em>bueno.</em></h1><p>Los básicos de siempre, tus antojos de hoy y una forma más fácil de comprar. Todo, cerquita de casa.</p><div className="hero-actions"><a className="primary" href="#catalogo">Encuentra tus favoritos <Icon name="arrow" size={18}/></a><span>Elige. Pide.<br/><strong>Disfruta.</strong></span></div><div className="hero-meta"><Icon name="pin" size={16}/> {store.address}</div></div>
          <div className="hero-scene" aria-label="Ilustración de productos de ejemplo de MatuMarket"><div className="scene-orbit"/><div className="scene-caption">EL SABOR DE<br/><strong>estar cerca.</strong></div><div className="scene-label">LO BUENO<br/>ESTÁ AQUÍ <span><Icon name="arrow" size={32}/></span></div><div className="scene-products"><ProductImage src="/products/leche.svg" name="Leche de ejemplo" className="scene-milk"/><ProductImage src="/products/arroz.svg" name="Arroz de ejemplo" className="scene-rice"/><ProductImage src="/products/aceite.svg" name="Aceite de ejemplo" className="scene-oil"/></div><div className="scene-badge"><Icon name="leaf" size={19}/><span>Tu compra<br/><strong>sin complicaciones</strong></span></div><div className="scene-spark"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><g stroke="currentColor" strokeWidth="7" strokeLinecap="round"><path d="M32 7v50M7 32h50M14 14l36 36M14 50l36-36"/></g></svg></div></div>
        </section>
        <div className="benefits" id="como-comprar"><div><span><Icon name="bag" size={24}/></span><p><strong>Elige a tu gusto</strong><small>Explora y arma tu carrito</small></p></div><div><span><Icon name="arrow" size={24}/></span><p><strong>Pídelo por WhatsApp</strong><small>Coordinamos contigo directamente</small></p></div><div><span><Icon name="truck" size={24}/></span><p><strong>Recoge o recibe</strong><small>Elige lo que mejor te acomode</small></p></div></div>
        <div className="notice">{shared ? <><strong>Compra a tu manera.</strong> Arma tu pedido y confirma disponibilidad y entrega por WhatsApp.</> : <><strong>Versión de prueba.</strong> Productos, ilustraciones y precios de ejemplo. Confirma disponibilidad y total con la tienda.</>}</div>
        {open === false && <div className="store-closed-banner" role="status"><Icon name="clock"/><div><strong>{settings.storeMode === 'closed' ? 'Atención pausada por el momento' : 'Estamos fuera del horario de atención'}</strong><p>Puedes preparar tu pedido y enviarlo por WhatsApp. Lo revisaremos al retomar la atención; espera nuestra confirmación antes de pagar.</p><small>{hours}</small></div></div>}
        {error && <p className="error" role="alert">{error}</p>}
        {loading && <p role="status">Cargando catálogo…</p>}
        {offers.length > 0 && <section className="store-promotions" id="ofertas"><div className="section-heading"><div><span className="eyebrow">MÁS PARA TU DÍA</span><h2>Ofertas y combos</h2></div><span>Compra y ahorra</span></div><div className="promotion-grid">{offers.map(p => <article className="promotion-card" key={p.id}><div className="promotion-image"><ProductImage src={p.image} name={p.name}/><span>{p.kind === 'combo' ? 'Combo' : 'Oferta'}</span></div><div className="promotion-copy"><h3>{p.name}</h3><p>{p.unit}</p>{p.ends_at && <small>Hasta {new Date(p.ends_at).toLocaleString('es-PE', {timeZone:'America/Lima', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</small>}<div className="promotion-prices"><del aria-label="Precio habitual">{money(p.regularPrice)}</del><strong>{money(p.price)}</strong></div><div className="promotion-bottom"><span>Ahorras {money(p.regularPrice - p.price)}</span><button className="primary" aria-label={`Agregar promoción ${p.name}`} onClick={() => change(p.id, 1)}>Agregar <Icon name="plus" size={16}/></button></div></div></article>)}</div></section>}
        <div className="shop-layout">
          <section id="catalogo" className="catalog">
            <div className="section-heading"><div><span className="eyebrow">TU DESPENSA, CON UN CLIC</span><h2>Encuentra tus favoritos</h2></div><span>{visible.length} productos</span></div>
            <label className="search"><Icon name="search"/><span className="sr-only">Buscar productos</span><input type="search" placeholder="¿Qué necesitas hoy?" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <div className="categories" aria-label="Categorías">{categories.map(c => <button key={c} aria-pressed={category === c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
            <div className="products">{visible.map(p => <article className={`product ${p.in_stock === false ? 'sold-out-product' : ''}`} key={p.id}><div className="product-art"><span className="product-category-tag">{p.category}</span><ProductImage key={p.image} src={p.image} name={p.name}/></div><div className="product-content"><small>{p.category}</small><h3>{p.name}</h3><p>{p.unit}</p>{p.in_stock === false && <span className="sold-out-badge">Agotado</span>}<div className="product-bottom"><strong>{money(p.price)}</strong><button className="add" disabled={p.in_stock === false} aria-label={p.in_stock === false ? `${p.name} agotado` : `Agregar ${p.name}`} onClick={() => change(`product:${p.id}`, 1)}><Icon name="plus" size={18}/></button></div></div></article>)}</div>
            {!visible.length && <p className="empty">No encontramos productos. Prueba otra búsqueda o categoría.</p>}
          </section>
          <aside className="order" id="pedido"><div className="section-heading"><h2>Tu bolsa</h2><span className="count-badge">{count}</span></div><p className="muted">Tus favoritos están a un mensaje de distancia.</p>
            {!count ? <div className="empty"><div className="empty-bag"><Icon name="bag" size={32}/></div><p>Tu carrito está esperando.<br />Agrega tus productos favoritos.</p></div> : <ul className="cart-items">{items.map(p => <li key={p.id}><div><strong>{p.name}</strong><small>{money(p.price * p.qty)}</small></div><div className="quantity"><button aria-label={`Quitar una unidad de ${p.name}`} onClick={() => change(p.id, -1)}>−</button><span>{p.qty}</span><button aria-label={`Agregar una unidad de ${p.name}`} onClick={() => change(p.id, 1)}><Icon name="plus" size={18}/></button></div></li>)}</ul>}
            {unavailableProducts.length > 0 && <div className="purchase-conditions" role="status"><p>Un producto de tu bolsa se agotó o ya no está disponible. Retíralo y revisa el total antes de continuar.</p><button type="button" className="outline-button" onClick={() => { setCart(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !unavailableProducts.includes(id)))); setSent(false); }}>Retirar productos no disponibles</button></div>}
            {unavailablePromotions.length > 0 && <div className="purchase-conditions" role="status"><p>Una promoción de tu bolsa venció o ya no está disponible. Retírala y revisa el total antes de continuar.</p><button type="button" className="outline-button" onClick={() => { setCart(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !unavailablePromotions.includes(id)))); setSent(false); }}>Retirar promociones no disponibles</button></div>}
            <form onSubmit={order}><fieldset><legend>¿Cómo lo recibes?</legend><label><input type="radio" name="deliveryType" value="pickup" checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} /> Recojo en tienda</label><label><input type="radio" name="deliveryType" value="delivery" checked={delivery === 'delivery'} onChange={() => setDelivery('delivery')} /> Delivery · según zona</label></fieldset>
              {delivery === 'delivery' && <label className="field">Zona de entrega<select name="deliveryZone" aria-label="Zona de entrega" required value={deliveryZone} onChange={e => setDeliveryZone(e.target.value)}><option value="">Selecciona tu zona</option><option value="center">Matucana centro · {settings.centerDeliveryFee === 0 ? 'Gratis' : money(settings.centerDeliveryFee)}</option><option value="surroundings">Alrededores de Matucana · {money(settings.deliveryFee)}</option></select></label>}
              <div className="purchase-conditions"><strong>{delivery === 'delivery' ? 'Información de entrega' : 'Recojo en tienda'}</strong>{delivery === 'delivery' ? <><p><b>Cobertura:</b> {settings.deliveryZones}</p><p><b>Horario:</b> {settings.deliveryHours}</p><p><b>Tiempo estimado:</b> {settings.deliveryTime}</p><p><b>Costo referencial:</b> {pendingZone ? 'Selecciona tu zona para ver la tarifa' : zoneFee === 0 ? 'Gratis' : money(zoneFee)}. Confirmamos cobertura y total por WhatsApp antes del pago.</p></> : <><p>{store.address}</p><p>Atención: {hours}. Coordinamos cuándo estará listo tu pedido por WhatsApp.</p></>}</div>
              <label className="field">Tu nombre<input name="name" autoComplete="name" required maxLength={100} placeholder="¿Cómo te llamas?" /></label>
              <label className="field">Celular<input name="phone" type="tel" autoComplete="tel" required pattern="[+0-9 ()-]{6,20}" maxLength={20} placeholder="Tu número de contacto" /></label>
              {delivery === 'delivery' && <><label className="field">Dirección y referencia<input name="address" autoComplete="street-address" required maxLength={200} placeholder="Calle, número, piso o color de fachada" /></label><DeliveryMap value={deliveryPoint} onChange={setDeliveryPoint}/></>}
              <label className="field">Forma de pago<select name="payment" aria-label="Forma de pago" defaultValue=""><option value="">Coordinar por WhatsApp</option>{settings.paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}</select></label><p className="payment-instructions">{settings.paymentInstructions}</p>
              <label className="field">Nota <span>(opcional)</span><textarea name="note" maxLength={500} placeholder="¿Algo que debamos saber?" rows={2} /></label>
              <div className="totals"><div><span>Subtotal</span><span>{money(subtotal)}</span></div><div><span>Delivery</span><span>{pendingZone ? 'Por seleccionar' : money(fee)}</span></div><div className="total"><strong>Total referencial</strong><strong>{pendingZone ? 'Selecciona tu zona' : money(subtotal + fee)}</strong></div></div>
              {open === false && <p className="fine-print">Tu pedido se revisará cuando retomemos la atención. Espera confirmación antes de pagar.</p>}
              <button className="primary checkout" disabled={!count || unavailablePromotions.length > 0 || unavailableProducts.length > 0} type="submit">Pedir por WhatsApp <Icon name="arrow" size={17}/></button><p className="fine-print">Se abrirá WhatsApp con tu pedido. Revísalo y envíalo para coordinar; la tienda debe confirmar tu compra.</p>
              {sent && <p role="status" className="status">Si WhatsApp no se abrió, permite las ventanas emergentes y vuelve a intentar. Tu pedido sigue en el carrito.</p>}
            </form>
          </aside>
        </div>
      </main>
      <footer><div className="wrap footer-inner"><div><Brand dark/><p>Tu compra cerca de casa.<br/>Hecho para el día a día en Matucana.</p></div><div><strong>Visítanos</strong><p>{store.address}<br/>{hours}</p></div><div><strong>¿Algo que necesites?</strong><a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener noreferrer">Hablemos por WhatsApp <Icon name="arrow" size={14}/></a><button onClick={() => setView('admin')}>Panel de administración</button></div></div><div className="wrap footer-bottom">MatuMarket · Compramos en nuestro barrio.<span>{shared ? 'Tu compra cerca de casa' : 'Versión de prueba'}</span></div></footer>
    </>
  );
}
