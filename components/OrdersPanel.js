'use client';
import {useEffect,useState} from 'react';
import {getSupabase} from '@/lib/supabase';
import {demoOrders,adminRequest} from '@/lib/orders';
import Icon from './Icons';
const labels={pending:'Pendiente',confirmed:'Confirmado',completed:'Entregado',cancelled:'Cancelado'};
const money=n=>`S/ ${Number(n).toFixed(2)}`;

export default function OrdersPanel({demo=false}){
 const [orders,setOrders]=useState([]);const [error,setError]=useState('');const [message,setMessage]=useState('');const [filter,setFilter]=useState(()=>typeof window!=='undefined'&&new URL(window.location.href).searchParams.has('order')?'all':'pending');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  async function load(){
   if(demo){if(active){setOrders(demoOrders());setLoading(false);}return;}
   try{const {data,error}=await getSupabase().from('matumarket_orders').select('id,number,customer_name,phone,delivery_type,address,note,items,total,delivery_fee,status,push_status,created_at').order('created_at',{ascending:false}).limit(100);if(error)throw new Error('No se pudieron cargar los pedidos. Comprueba la configuración de pedidos en Supabase.');if(active){setOrders(data);setError('');}}
   catch(e){if(active)setError(e.message);}finally{if(active)setLoading(false);}
  }
  void load();const timer=setInterval(()=>void load(),15000);const focus=()=>void load();window.addEventListener('focus',focus);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);};
 },[demo]);
 useEffect(()=>{const id=new URL(window.location.href).searchParams.get('order');if(/^[0-9a-f-]{36}$/i.test(id||''))document.getElementById(`order-${id}`)?.scrollIntoView({block:'center',behavior:'smooth'});},[orders]);
 async function update(order,status){setBusy(true);setError('');try{if(demo){const next=orders.map(o=>o.id===order.id?{...o,status}:o);localStorage.setItem('matumarket-demo-orders-v1',JSON.stringify(next));setOrders(next);}else{const {error}=await getSupabase().from('matumarket_orders').update({status}).eq('id',order.id).select('id,status').single();if(error)throw new Error('No se pudo actualizar el pedido.');setOrders(previous=>previous.map(o=>o.id===order.id?{...o,status}:o));}setMessage(`Pedido #${order.number}: ${labels[status]}.`);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function retry(order){setBusy(true);try{const result=await adminRequest('/api/push/retry',{id:order.id});setMessage(result.accepted?'El servicio recibió el aviso. La entrega depende del teléfono.':'No hay un dispositivo activo que haya aceptado el aviso.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="orders-panel"><div className="section-heading"><h2>Pedidos de la tienda</h2><span>Últimos 100 pedidos</span></div><p className="muted">Revisa el pedido y coordina con el cliente antes de confirmarlo. Las notificaciones del celular se habilitan por separado.</p><div className="categories">{[['pending','Pendientes'],['confirmed','Confirmados'],['completed','Entregados'],['cancelled','Cancelados'],['all','Todos']].map(([value,label])=><button key={value} aria-pressed={filter===value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label} {orders.filter(o=>value==='all'||o.status===value).length}</button>)}</div>
 {loading&&<p role="status">Cargando pedidos…</p>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="status" role="status">{message}</p>}
 <div className="order-list">{orders.filter(o=>filter==='all'||o.status===filter).map(order=><article key={order.id} className="order-card" id={`order-${order.id}`}><header><div><span className="eyebrow">PEDIDO #{order.number}</span><h3>{order.customer_name}</h3><small>{new Date(order.created_at).toLocaleString('es-PE',{timeZone:'America/Lima'})}</small></div><span className="visibility is-active">{labels[order.status]}</span></header><p><strong>{order.delivery_type==='delivery'?'Delivery':'Recojo en tienda'}</strong>{order.address&&` · ${order.address}`}</p><a href={`tel:${order.phone.replace(/[^+0-9]/g,'')}`}>Llamar: {order.phone}</a><ul>{order.items.map(item=><li key={item.id}><span>{item.name} × {item.quantity}</span><strong>{money(item.price*item.quantity)}</strong></li>)}</ul>{order.note&&<p className="order-note">Nota: {order.note}</p>}<div className="order-total"><span>Delivery: {money(order.delivery_fee)}</span><strong>Total: {money(order.total)}</strong></div><div className="order-actions">{order.status==='pending'&&<button className="primary" disabled={busy} onClick={()=>update(order,'confirmed')}>Confirmar pedido <Icon name="check" size={16}/></button>}{order.status==='confirmed'&&<button className="primary" disabled={busy} onClick={()=>update(order,'completed')}>Marcar entregado</button>}{['pending','confirmed'].includes(order.status)&&<button className="outline-button" disabled={busy} onClick={()=>{if(window.confirm(`¿Cancelar el pedido #${order.number}?`))void update(order,'cancelled');}}>Cancelar</button>}{!demo&&['pending','failed','no_devices'].includes(order.push_status)&&<button className="text-button" disabled={busy} onClick={()=>void retry(order)}>Reintentar notificación</button>}</div></article>)}</div>{!loading&&!error&&!orders.some(o=>filter==='all'||o.status===filter)&&<p className="empty">No hay pedidos en esta sección.</p>}
 </section>;
}
