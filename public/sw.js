// Retira la suscripción anterior: MatuMarket vuelve a coordinar pedidos por WhatsApp.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const subscription=await self.registration.pushManager.getSubscription();
 if(subscription)await subscription.unsubscribe();
 await self.registration.unregister();
})()));
