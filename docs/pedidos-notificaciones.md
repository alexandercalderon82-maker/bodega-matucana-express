# Pedidos guardados y notificaciones para Android

Esta integración no contrata WhatsApp, Firebase de pago ni servicios de mensajería de pago. Usa el servidor existente de Vercel, Supabase y Web Push de Chrome. Se aplican los límites y condiciones de tus planes actuales; no ofrece capacidad ilimitada ni cambia tu plan de facturación.

## 1. Crear tablas y permisos

Ejecuta `supabase/orders-push.sql` en SQL Editor del proyecto ya configurado. Conserva productos y categorías. Los pedidos y dispositivos son privados; visitantes no pueden leerlos, escribirlos directamente ni modificar precios/totales. El servidor registra el pedido usando una función reservada a `service_role`. Los administradores solo pueden leer pedidos y actualizar su estado mediante la API del cliente.

El servidor calcula precios vigentes, cantidades y tarifa de delivery (S/ 5, igual a la configuración actual). Actualiza tanto la función SQL como `app/products.js` si cambias esa tarifa. Una confirmación repetida con el mismo identificador y contenido devuelve el mismo pedido, y un cambio de contenido con ese identificador se rechaza. Se limitan a cinco pedidos cada diez minutos por origen de red, hasta 50 productos diferentes y hasta 99 unidades por producto. La dirección de red se almacena únicamente como un hash con clave, no como IP en texto. El precio enviado por el cliente no determina el cobro.

## 2. Variables de servidor en Vercel

En el proyecto de Vercel, abre Settings → Environment Variables. Mantén las dos variables públicas de Supabase que ya funcionan. Añade estas tres:

- `SUPABASE_SERVICE_ROLE_KEY`: clave **secret** de Supabase (`sb_secret_…`) o legacy **service_role**, exclusivamente en el servidor. Se obtiene de Settings → API Keys. **Nunca** la uses en `NEXT_PUBLIC_SUPABASE_ANON_KEY`, en GitHub, en el navegador ni en chat.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: clave pública generada en el siguiente paso.
- `VAPID_PRIVATE_KEY`: su clave privada, exclusivamente en el servidor.

Abre `/preparar-notificaciones.html` en la web publicada, o el mismo archivo descargado con Chrome. Pulsa «Generar claves» una vez y copia ambos valores a las variables correspondientes de Vercel. Las claves se generan en tu navegador, no se transmiten y no se guardan en el archivo. Guarda un respaldo seguro de la privada. No envíes capturas de los valores.

El contacto VAPID usa por defecto `https://bodega-matucana-express-hx8c.vercel.app`. Si cambia el dominio, configura `VAPID_SUBJECT` con la nueva URL HTTPS. Guarda las variables para Production y realiza un nuevo deploy para incluir la clave pública en el cliente.

No compartas esos secretos conmigo. El entorno de Codex no necesita sus valores para ejecutar las pruebas locales. Los secretos de Vercel no se copian desde Codex.

## 3. Activar tu Android

En Chrome del teléfono abre la web, ingresa al panel como administrador, abre **Notificaciones → Activar notificaciones** y acepta el permiso. Luego pulsa **Enviar prueba** y verifica que llega. Esto registra solo ese navegador/dispositivo. Se admiten hasta cinco por administrador. Si borras los datos de Chrome o cambias las claves VAPID, regístralo de nuevo. «Desactivar este dispositivo» elimina su registro.

El aviso funciona con el panel cerrado: el service worker abre `/admin` al tocarlo. El mensaje solo muestra el número del pedido, sin nombre, dirección ni teléfono del cliente. Los permisos de Android, internet, batería, modo No molestar y el servicio push pueden retrasar o impedir el aviso. Cerrar sesión no desactiva los avisos; revocar los permisos de administrador impide enviar nuevos avisos a esa cuenta.

## 4. Pedidos

La web comprueba `/api/orders/status`. Mientras el servidor, las tablas, las claves o el dispositivo Android no estén configurados, conserva el checkout por WhatsApp para evitar interrumpir la tienda actual. Cuando las tablas y las claves están disponibles y existe al menos un dispositivo registrado de un administrador, el botón pasa a **Confirmar pedido**: registra el pedido, limpia el carrito después del éxito y muestra su referencia y total. La tienda debe confirmar disponibilidad y entrega; no se cobra online.

El panel **Pedidos** muestra los últimos 100, filtra por estado y permite confirmarlos, marcarlos entregados o cancelarlos. Se refresca al enfocar la ventana y cada 15 segundos.

El envío push se intenta después de guardar el pedido. Un fallo de notificación no elimina el pedido ni obliga al cliente a repetirlo. El estado «accepted» significa que el servicio push aceptó el aviso, no que el usuario lo leyó. Los avisos caducan a las 24 horas. El panel permite reintentar avisos pendientes/fallidos o sin dispositivos; las notificaciones del mismo pedido se agrupan. No hay un sistema externo de reintentos continuos: comprueba regularmente el panel si el teléfono no recibió un aviso.

## Demostración y verificación

`npm run preview` genera el HTML descargable actualizado. Allí se puede confirmar un pedido de prueba y verlo en la sección Pedidos del panel local. No se envía a la tienda ni a ningún teléfono; las notificaciones reales necesitan la web HTTPS.

Ejecuta `npm run lint`, `npm run test:permissions`, `npm run test:orders` y `npm run build`. Las pruebas locales no envían pedidos o avisos al negocio. Antes de activar el checkout automático, configura las variables/tablas y verifica desde tu Android la suscripción, una notificación de prueba y un pedido real consentido. Nunca publiques las claves de servidor.
