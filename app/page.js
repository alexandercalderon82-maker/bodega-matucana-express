'use client';

import { useEffect, useRef, useState } from 'react';
import { store } from './products';
import { isPortablePreview } from '@/lib/supabase';
import { saveDemoOrder } from '@/lib/orders';
import Brand from '@/components/Brand';
import Icon from '@/components/Icons';
import ProductImage from '@/components/ProductImage';
import AdminAccess from '@/components/AdminAccess';
import { useCatalog, usesSharedCatalog } from '@/lib/catalog';

const money = value => `S/ ${value.toFixed(2)}`;

export default function Home() {
  const shared = usesSharedCatalog();
  const { products: catalog, categories: catalogCategories, error, loading } = useCatalog();
  const products = catalog.filter(p => p.active);
  const categories = ['Todo', ...catalogCategories];
  const [view, setView] = useState('store');
  const [category, setCategory] = useState('Todo');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [delivery, setDelivery] = useState('pickup');
  const [sent, setSent] = useState(false);
  const [onlineOrders,setOnlineOrders]=useState(()=>isPortablePreview());
  const [sending,setSending]=useState(false);
  const [orderError,setOrderError]=useState('');
  const [receipt,setReceipt]=useState(null);
  const attempt=useRef(null);
  useEffect(()=>{let alive=true;const check=()=>{if(!isPortablePreview()&&view==='store')fetch('/api/orders/status').then(r=>r.json()).then(data=>{if(alive)setOnlineOrders(Boolean(data.orders));}).catch(()=>{});};check();window.addEventListener('focus',check);return()=>{alive=false;window.removeEventListener('focus',check);};},[view]);
  const items = products.filter(p => cart[p.id]).map(p => ({ ...p, qty: cart[p.id] }));
  const count = items.reduce((sum, p) => sum + p.qty, 0);
  const subtotal = items.reduce((sum, p) => sum + p.price * p.qty, 0);
  const fee = delivery === 'delivery' && count ? store.deliveryFee : 0;
  const visible = products.filter(p => (category === 'Todo' || p.category === category) && p.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));

  function change(id, delta) {
    setCart(previous => ({ ...previous, [id]: Math.min(99,Math.max(0, (previous[id] || 0) + delta)) }));
    setSent(false); setReceipt(null); setOrderError('');
  }

  async function order(event) {
    event.preventDefault();
    if (!count || sending) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const address = String(data.get('address') || '').trim();
    if (!name || !phone || (delivery === 'delivery' && !address)) return;
    if(onlineOrders){
      setSending(true);setOrderError('');
      try{
        const payload={name,phone,address,note:String(data.get('note')||'').trim(),delivery,items:items.map(p=>({id:p.id,quantity:p.qty}))};
        const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))))).map(n=>n.toString(16).padStart(2,'0')).join('');
        if(!attempt.current){try{attempt.current=JSON.parse(sessionStorage.getItem('matumarket-order-attempt')||'null');}catch{}}
        if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,id:crypto.randomUUID()};
        try{sessionStorage.setItem('matumarket-order-attempt',JSON.stringify(attempt.current));}catch{}
        let saved;
        if(isPortablePreview())saved=saveDemoOrder({...payload,items:items.map(p=>({id:p.id,name:p.name,unit:p.unit,price:p.price,quantity:p.qty})),total:subtotal+fee},attempt.current.id);
        else{
          const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:attempt.current.id})});
          const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo confirmar el pedido.');saved=result;
        }
        setReceipt(saved);setCart({});attempt.current=null;try{sessionStorage.removeItem('matumarket-order-attempt');}catch{}
      }catch(e){setOrderError(e.message||'No se pudo confirmar. Reintenta con los mismos datos para evitar duplicados.');}
      finally{setSending(false);}
      return;
    }
    const message = [
      `Hola, ${store.name}. Quisiera consultar este pedido:`,
      shared ? 'Por favor confirmar disponibilidad y entrega.' : 'Catálogo de ejemplo: por favor confirmar productos, precios y disponibilidad.',
      '', `Nombre: ${name}`, `Celular: ${phone}`,
      delivery === 'delivery' ? `Delivery a: ${address}` : 'Recojo en tienda', '',
      ...items.map(p => `• ${p.name} (${p.unit}) × ${p.qty}: ${money(p.price * p.qty)}`),
      '', `Subtotal referencial: ${money(subtotal)}`, `Delivery referencial: ${money(fee)}`, `Total referencial: ${money(subtotal + fee)}`,
      `Nota: ${String(data.get('note') || '').trim() || 'Sin nota'}`,
    ].join('\n');
    window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setSent(true);
  }

  if (view === 'admin') return <AdminAccess onStore={() => setView('store')}/>;

  return (
    <>
      <div className="topbar"><span>De Matucana, para ti.</span><span>Atendemos de {store.hours}</span><span>{onlineOrders?'Pedidos online':'Pedidos por WhatsApp'} <Icon name="arrow" size={12}/></span></div>
      <header className="header wrap">
        <Brand onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/><nav className="header-nav"><a href="#catalogo">Catálogo</a><a href="#como-comprar">Cómo comprar</a><button onClick={() => setView('admin')}>Administración</button></nav>
        <a className="cart-link" href="#pedido"><Icon name="bag" size={18}/> Mi pedido <span>{count}</span></a>
      </header>
      <main className="wrap">
        <section className="hero">
          <div className="hero-copy"><span className="hero-pill"><span/> EL MERCADO DE TU BARRIO</span><h1>Tu día empieza<br/>con algo <em>bueno.</em></h1><p>Los básicos de siempre, tus antojos de hoy y una forma más fácil de comprar. Todo, cerquita de casa.</p><div className="hero-actions"><a className="primary" href="#catalogo">Encuentra tus favoritos <Icon name="arrow" size={18}/></a><span>Elige. Pide.<br/><strong>Disfruta.</strong></span></div><div className="hero-meta"><Icon name="pin" size={16}/> {store.address}</div></div>
          <div className="hero-scene" aria-label="Ilustración de productos de ejemplo de MatuMarket"><div className="scene-orbit"/><div className="scene-caption">EL SABOR DE<br/><strong>estar cerca.</strong></div><div className="scene-label">LO BUENO<br/>ESTÁ AQUÍ <span><Icon name="arrow" size={32}/></span></div><div className="scene-products"><ProductImage src="/products/leche.svg" name="Leche de ejemplo" className="scene-milk"/><ProductImage src="/products/arroz.svg" name="Arroz de ejemplo" className="scene-rice"/><ProductImage src="/products/aceite.svg" name="Aceite de ejemplo" className="scene-oil"/></div><div className="scene-badge"><Icon name="leaf" size={19}/><span>Tu compra<br/><strong>sin complicaciones</strong></span></div><div className="scene-spark"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><g stroke="currentColor" strokeWidth="7" strokeLinecap="round"><path d="M32 7v50M7 32h50M14 14l36 36M14 50l36-36"/></g></svg></div></div>
        </section>
        <div className="benefits" id="como-comprar"><div><span><Icon name="bag" size={24}/></span><p><strong>Elige a tu gusto</strong><small>Explora y arma tu carrito</small></p></div><div><span><Icon name="arrow" size={24}/></span><p><strong>{onlineOrders?'Confirma tu pedido':'Pídelo por WhatsApp'}</strong><small>Coordinamos contigo directamente</small></p></div><div><span><Icon name="truck" size={24}/></span><p><strong>Recoge o recibe</strong><small>Elige lo que mejor te acomode</small></p></div></div>
        <div className="notice">{shared ? <><strong>Compra a tu manera.</strong> {onlineOrders?'Confirma tu pedido aquí. La tienda revisará disponibilidad y entrega.':'Arma tu pedido y confirma disponibilidad y entrega por WhatsApp.'}</> : <><strong>Versión de prueba.</strong> Productos, ilustraciones y precios de ejemplo. Confirma disponibilidad y total con la tienda.</>}</div>
        {error && <p className="error" role="alert">{error}</p>}
        {loading && <p role="status">Cargando catálogo…</p>}
        <div className="shop-layout">
          <section id="catalogo" className="catalog">
            <div className="section-heading"><div><span className="eyebrow">TU DESPENSA, CON UN CLIC</span><h2>Encuentra tus favoritos</h2></div><span>{visible.length} productos</span></div>
            <label className="search"><Icon name="search"/><span className="sr-only">Buscar productos</span><input type="search" placeholder="¿Qué necesitas hoy?" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <div className="categories" aria-label="Categorías">{categories.map(c => <button key={c} aria-pressed={category === c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
            <div className="products">{visible.map(p => <article className="product" key={p.id}><div className="product-art"><span className="product-category-tag">{p.category}</span><ProductImage key={p.image} src={p.image} name={p.name}/></div><div className="product-content"><small>{p.category}</small><h3>{p.name}</h3><p>{p.unit}</p><div className="product-bottom"><strong>{money(p.price)}</strong><button className="add" aria-label={`Agregar ${p.name}`} onClick={() => change(p.id, 1)}><Icon name="plus" size={18}/></button></div></div></article>)}</div>
            {!visible.length && <p className="empty">No encontramos productos. Prueba otra búsqueda o categoría.</p>}
          </section>
          <aside className="order" id="pedido"><div className="section-heading"><h2>Tu bolsa</h2><span className="count-badge">{count}</span></div><p className="muted">Tus favoritos están a un mensaje de distancia.</p>
            {!count ? <div className="empty"><div className="empty-bag"><Icon name="bag" size={32}/></div><p>Tu carrito está esperando.<br />Agrega tus productos favoritos.</p></div> : <ul className="cart-items">{items.map(p => <li key={p.id}><div><strong>{p.name}</strong><small>{money(p.price * p.qty)}</small></div><div className="quantity"><button aria-label={`Quitar una unidad de ${p.name}`} onClick={() => change(p.id, -1)}>−</button><span>{p.qty}</span><button aria-label={`Agregar una unidad de ${p.name}`} onClick={() => change(p.id, 1)}><Icon name="plus" size={18}/></button></div></li>)}</ul>}
            <form onSubmit={order}><fieldset><legend>¿Cómo lo recibes?</legend><label><input type="radio" name="deliveryType" value="pickup" checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} /> Recojo en tienda</label><label><input type="radio" name="deliveryType" value="delivery" checked={delivery === 'delivery'} onChange={() => setDelivery('delivery')} /> Delivery · {money(store.deliveryFee)}</label></fieldset>
              <label className="field">Tu nombre<input name="name" autoComplete="name" required maxLength={100} placeholder="¿Cómo te llamas?" /></label>
              <label className="field">Celular<input name="phone" type="tel" autoComplete="tel" required pattern="[+0-9 ()-]{6,20}" maxLength={20} placeholder="Tu número de contacto" /></label>
              {delivery === 'delivery' && <label className="field">Dirección<input name="address" autoComplete="street-address" required maxLength={200} placeholder="Calle, número y referencia" /></label>}
              <label className="field">Nota <span>(opcional)</span><textarea name="note" maxLength={500} placeholder="¿Algo que debamos saber?" rows={2} /></label>
              <div className="totals"><div><span>Subtotal</span><span>{money(subtotal)}</span></div><div><span>Delivery</span><span>{money(fee)}</span></div><div className="total"><strong>Total referencial</strong><strong>{money(subtotal + fee)}</strong></div></div>
              <button className="primary checkout" disabled={!count||sending} type="submit">{sending?'Guardando pedido…':onlineOrders?'Confirmar pedido':'Pedir por WhatsApp'} <Icon name="arrow" size={17}/></button><p className="fine-print">{onlineOrders?'Guardaremos tu pedido sin abrir WhatsApp. La tienda debe confirmarlo antes de la entrega.':'Se abrirá WhatsApp con tu pedido. Revísalo y envíalo para coordinar; la tienda debe confirmar tu compra.'}</p>
              {orderError&&<p className="error" role="alert">{orderError}</p>}{receipt&&<div className="receipt" role="status"><strong>{isPortablePreview()?'Pedido de demostración':'Pedido recibido'} #{receipt.number}</strong>Total: {money(Number(receipt.total))}.<br/>{isPortablePreview()?'Se guardó solo en este navegador; no se envió a la tienda ni al celular.':'La tienda revisará tu pedido y coordinará contigo. Conserva este número de referencia.'}</div>}
              {sent && <p role="status" className="status">Si WhatsApp no se abrió, permite las ventanas emergentes y vuelve a intentar. Tu pedido sigue en el carrito.</p>}
            </form>
          </aside>
        </div>
      </main>
      <footer><div className="wrap footer-inner"><div><Brand dark/><p>Tu compra cerca de casa.<br/>Hecho para el día a día en Matucana.</p></div><div><strong>Visítanos</strong><p>{store.address}<br/>{store.hours}</p></div><div><strong>¿Algo que necesites?</strong><a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener noreferrer">Hablemos por WhatsApp <Icon name="arrow" size={14}/></a><button onClick={() => setView('admin')}>Panel de administración</button></div></div><div className="wrap footer-bottom">MatuMarket · Compramos en nuestro barrio.<span>{shared ? 'Tu compra cerca de casa' : 'Versión de prueba'}</span></div></footer>
    </>
  );
}
