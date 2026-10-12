self.addEventListener('push',event=>{
 let message={};try{message=event.data?.json()||{};}catch{}
 event.waitUntil(self.registration.showNotification(message.title||'MatuMarket',{body:message.body||'Tienes novedades en tu tienda.',icon:'/brand/matumarket-emblema.png',tag:message.orderId?`order-${message.orderId}`:'matumarket-test',renotify:true,vibrate:[200,100,200],data:{orderId:message.orderId||null}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=new URL('/admin',self.location.origin);
 if(/^[0-9a-f-]{36}$/i.test(event.notification.data?.orderId||''))url.searchParams.set('order',event.notification.data.orderId);
 event.waitUntil((async()=>{const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const tab of tabs){if(new URL(tab.url).origin===url.origin){await tab.navigate(url.href);return tab.focus();}}return self.clients.openWindow(url.href);})());
});
