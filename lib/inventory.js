export function stockUsage(cart, products, promotions) {
  const used=new Map();
  for(const [key,qty] of Object.entries(cart)){
    if(!Number.isInteger(qty)||qty<=0)continue;
    const parts=key.startsWith('product:')?[{productId:key.slice(8),qty:1}]:promotions.find(p=>`promotion:${p.id}`===key)?.items||[];
    for(const part of parts)used.set(part.productId,(used.get(part.productId)||0)+qty*part.qty);
  }
  return [...used].map(([id,qty])=>({product:products.find(p=>p.id===id),qty}));
}
export function stockProblems(cart,products,promotions){return stockUsage(cart,products,promotions).filter(({product,qty})=>product&&product.stock_quantity!=null&&qty>product.stock_quantity);}
