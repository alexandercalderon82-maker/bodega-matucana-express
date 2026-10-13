'use client';
import { useState } from 'react';
import { usePromotions, savePromotion } from '@/lib/promotions';
import { validatePromotion, promotionProduct } from '@/lib/promotion-rules';
const money=value=>`S/ ${value.toFixed(2)}`;
const localDate=value=>value?new Date(Date.parse(value)-5*3600000).toISOString().slice(0,16):'';
const instant=value=>value?new Date(`${value}:00-05:00`).toISOString():null;

export default function PromotionsPanel({products}) {
  const {promotions,available,error}=usePromotions();
  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [saveError,setSaveError]=useState('');
  function edit(p){setDraft(p?{...p,starts_at:localDate(p.starts_at),ends_at:localDate(p.ends_at)}:{id:crypto.randomUUID(),name:'',kind:'offer',price:'',items:[{productId:'',qty:1}],active:false,starts_at:'',ends_at:''});setMessage('');setSaveError('');}
  function item(index,field,value){setDraft({...draft,items:draft.items.map((i,n)=>n===index?{...i,[field]:value}:i)});}
  const regularPrice=draft?draft.items.reduce((sum,i)=>sum+(products.find(p=>p.id===i.productId)?.price||0)*i.qty,0):0;
  async function save(event){event.preventDefault();setBusy(true);setSaveError('');try{
    const value=validatePromotion({...draft,starts_at:instant(draft.starts_at),ends_at:instant(draft.ends_at)});
    if(value.price>=Math.round(regularPrice*100)/100)throw Error('El precio promocional debe ser menor al precio habitual.');
    if(value.active&&value.items.some(i=>!products.find(p=>p.id===i.productId&&p.active&&p.in_stock!==false)))throw Error('Los productos deben estar visibles y disponibles antes de publicar la promoción.');
    await savePromotion(value);setDraft(null);setMessage('Promoción guardada. Solo aparecerá si está activa, vigente y sus productos están disponibles.');
  }catch(e){setSaveError(e.message);}finally{setBusy(false);}}
  async function disable(p){setBusy(true);setSaveError('');try{await savePromotion({...p,active:false});setMessage('Promoción desactivada.');}catch(e){setSaveError(e.message);}finally{setBusy(false);}}
  return <details className="promotions-panel"><summary>Ofertas y combos</summary><p className="muted">Prepara promociones ahora y actívalas cuando tus productos estén listos. Las fechas usan la hora de Perú.</p>{error&&<p className="error" role="alert">{error}</p>}
    {!draft&&<><button className="primary" disabled={!available||busy||!products.length} onClick={()=>edit()}>Nueva promoción</button>{!products.length&&<p className="muted">Necesitas al menos un producto para preparar una oferta.</p>}<div className="promotion-admin-list">{promotions.map(p=><article key={p.id}><div><strong>{p.name}</strong><p>{p.kind==='combo'?'Combo':'Oferta'} · {money(p.price)} · {!p.active?'Borrador':promotionProduct(p,products)?'Visible en tienda':'Programada o no disponible'}</p></div><div><button className="outline-button" disabled={busy} onClick={()=>edit(p)}>Editar {p.name}</button>{p.active&&<button className="outline-button" disabled={busy} onClick={()=>disable(p)}>Desactivar {p.name}</button>}</div></article>)}</div>{!promotions.length&&available&&<p className="muted">No hay promociones. La tienda no mostrará esta sección hasta que publiques una.</p>}</>}
    {draft&&<form onSubmit={save}><label className="field">Nombre de promoción<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Ej. Combo desayuno"/></label>
      <label className="field">Tipo de promoción<select aria-label="Tipo de promoción" value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value,items:e.target.value==='offer'?[{...draft.items[0],qty:1}]:draft.items})}><option value="offer">Oferta de un producto</option><option value="combo">Combo de productos</option></select></label>
      <fieldset><legend>Productos incluidos</legend>{draft.items.map((i,index)=><div className="promotion-item-editor" key={index}><label className="field">Producto {index+1}<select aria-label={`Producto ${index+1}`} required value={i.productId} onChange={e=>item(index,'productId',e.target.value)}><option value="">Selecciona un producto</option>{products.map(p=><option key={p.id} value={p.id} disabled={draft.items.some((other,n)=>n!==index&&other.productId===p.id)}>{p.name} · {p.unit} · {money(p.price)}{!p.active?' · Oculto':''}</option>)}</select></label>{draft.kind==='combo'&&<><label className="field">Cantidad {index+1}<input aria-label={`Cantidad ${index+1}`} type="number" min="1" max="100" step="1" required value={i.qty} onChange={e=>item(index,'qty',Number(e.target.value))}/></label><button type="button" className="outline-button" aria-label={`Quitar producto ${index+1}`} disabled={draft.items.length===1} onClick={()=>setDraft({...draft,items:draft.items.filter((_,n)=>n!==index)})}>Quitar</button></>}</div>)}{draft.kind==='combo'&&<button type="button" className="outline-button" disabled={draft.items.length>=20} onClick={()=>setDraft({...draft,items:[...draft.items,{productId:'',qty:1}]})}>Añadir producto al combo</button>}</fieldset>
      <label className="field">Precio promocional (S/)<input type="number" min="0.01" max="100000" step="0.01" required value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})}/></label><p className="muted">Precio habitual: {money(regularPrice)}{Number(draft.price)>0&&Number(draft.price)<regularPrice?` · Ahorro: ${money(regularPrice-Number(draft.price))}`:''}</p>
      <div className="editor-grid"><label className="field">Inicio (hora de Perú, opcional)<input type="datetime-local" value={draft.starts_at} onChange={e=>setDraft({...draft,starts_at:e.target.value})}/></label><label className="field">Fin (hora de Perú, opcional)<input type="datetime-local" value={draft.ends_at} onChange={e=>setDraft({...draft,ends_at:e.target.value})}/></label></div><label className="checkbox-field"><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/> Activar promoción en la tienda</label>
      <div className="editor-actions"><button type="button" className="outline-button" disabled={busy} onClick={()=>setDraft(null)}>Cancelar promoción</button><button className="primary" type="submit" disabled={busy||!available}>{busy?'Guardando…':'Guardar promoción'}</button></div>
    </form>}{saveError&&<p className="error" role="alert">{saveError}</p>}{message&&<p className="status" role="status">{message}</p>}
  </details>;
}
