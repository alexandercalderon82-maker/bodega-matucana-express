'use client';
import {useState} from 'react';
import {confirmInventorySale} from '@/lib/catalog';
export default function InventorySalePanel({products,quantityReady,promotions}){
  const [draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  function edit(index,field,value){setDraft({...draft,id:crypto.randomUUID(),items:draft.items.map((i,n)=>n===index?{...i,[field]:value}:i)});setError('');}
  async function confirm(event){event.preventDefault();setBusy(true);setError('');try{
    const quantities=new Map();
    for(const line of draft.items){const parts=line.key.startsWith('product:')?[{productId:line.key.slice(8),qty:1}]:promotions.find(p=>`promotion:${p.id}`===line.key)?.items;
      if(!parts||!Number.isInteger(line.qty)||line.qty<1)throw Error('Selecciona productos y cantidades válidas.');
      for(const part of parts)quantities.set(part.productId,(quantities.get(part.productId)||0)+line.qty*part.qty);
    }
    const items=[...quantities].map(([productId,qty])=>({productId,qty}));
    await confirmInventorySale(draft.id,items);setDraft(null);setMessage('Venta confirmada. Stock descontado una sola vez.');
  }catch(e){setError(e.message);}finally{setBusy(false);}}
  return <details className="store-settings-panel"><summary>Descontar stock de una venta confirmada</summary><p className="muted">Usa esta opción después de confirmar una venta por WhatsApp o en tu local. No envía mensajes ni cobra. Confirma cada venta una sola vez.</p>{!quantityReady&&<p className="status">Para habilitar cantidades, ejecuta supabase/inventory.sql.</p>}
    {!draft?<button className="primary" disabled={!quantityReady||!products.length} onClick={()=>{setDraft({id:crypto.randomUUID(),items:[{key:'',qty:1}]});setMessage('');setError('');}}>Registrar venta confirmada</button>:<form onSubmit={confirm}>{draft.items.map((line,index)=><div className="promotion-item-editor" key={index}><label className="field">Producto o combo {index+1}<select aria-label={`Producto o combo ${index+1}`} required disabled={busy} value={line.key} onChange={e=>edit(index,'key',e.target.value)}><option value="">Selecciona</option><optgroup label="Productos">{products.map(p=><option key={p.id} value={`product:${p.id}`}>{p.name} · {p.stock_quantity===null?'Sin cantidad configurada':`${p.stock_quantity} disponibles`}</option>)}</optgroup><optgroup label="Ofertas y combos">{promotions.map(p=><option key={p.id} value={`promotion:${p.id}`}>{p.name}</option>)}</optgroup></select></label><label className="field">Unidades vendidas {index+1}<input aria-label={`Unidades vendidas ${index+1}`} required disabled={busy} type="number" min="1" max="1000000" step="1" value={line.qty} onChange={e=>edit(index,'qty',Number(e.target.value))}/></label><button className="outline-button" type="button" disabled={busy||draft.items.length===1} onClick={()=>setDraft({...draft,id:crypto.randomUUID(),items:draft.items.filter((_,n)=>n!==index)})}>Quitar</button></div>)}<button className="outline-button" type="button" disabled={busy||draft.items.length>=100} onClick={()=>setDraft({...draft,id:crypto.randomUUID(),items:[...draft.items,{key:'',qty:1}]})}>Añadir a la venta</button><div className="editor-actions"><button className="outline-button" type="button" disabled={busy} onClick={()=>setDraft(null)}>Cancelar venta</button><button className="primary" type="submit" disabled={busy}>{busy?'Descontando…':'Confirmar venta y descontar stock'}</button></div></form>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="status" role="status">{message}</p>}
  </details>;
}
