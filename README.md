# MatuMarket

Tienda con identidad visual propia, catálogo por categorías, carrito y pedidos por WhatsApp. El panel permite crear categorías, agregar productos dentro de ellas y editar precios e imágenes. El acceso real usa Supabase Auth y permisos PostgreSQL RLS; los cambios se comparten entre dispositivos.

## Desarrollo y validación

Node.js 22 o superior; validado con Node.js 24.

```bash
npm ci
npm run dev -- --hostname 0.0.0.0 --port 3000
npm run lint
npm run test:permissions
npm run build
npm start -- --hostname 0.0.0.0 --port 3003
```

Reutiliza el checkout existente del entorno aislado; no necesitas crear un worktree.

## Activar la administración real

Sigue [docs/supabase-setup.md](docs/supabase-setup.md). Reactiva el proyecto anterior, ejecuta [supabase/setup.sql](supabase/setup.sql), crea una cuenta en Supabase Auth y autoriza su UUID en `matumarket_admins`. Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la URL y la clave pública publishable/anon. Nunca uses una secret key o service_role en el navegador. El usuario del panel es el correo de la cuenta. No hay contraseña predeterminada ni registro público desde la aplicación.

Sin configuración, la tienda muestra datos de ejemplo y la administración real permanece bloqueada. Con Supabase, el catálogo compartido comienza vacío hasta que un administrador agregue o importe productos. Las tablas usan el prefijo `matumarket_` para conservar las de la aplicación anterior. El SQL también crea el bucket `matumarket-images`. Deben verificarse esquema, permisos y conectividad del proyecto real antes de publicar: las pruebas locales no sustituyen esa comprobación.

## Versión descargable de demostración

```bash
npm run preview
# Otro destino:
npm run preview -- /tmp/matumarket-prueba.html
```

El generador incluye React, CSS, logo e ilustraciones dentro de un HTML independiente. No incorpora URL, claves ni credenciales reales de Supabase, incluso si están configuradas en el entorno. Al pulsar «Administración», ofrece «Explorar panel de demostración». Ese botón solo abre una copia local de prueba; no inicia sesión ni modifica la base de datos. La protección real funciona en la web conectada a Supabase.

En la demo, los cambios se guardan en localStorage, bajo `matumarket-catalog-v1`. Las copias antiguas con un array de productos se migran al formato con `products` y `categories` conservando sus datos. Las categorías vacías se conservan al guardar y exportar. No se comparte almacenamiento entre dispositivos y borrar los datos del navegador elimina los cambios locales. Exporta una copia JSON para conservarlos; importar pide confirmar antes de reemplazar el catálogo. La importación compartida usa una transacción en PostgreSQL.

El panel agrupa productos por categorías, permite filtrar y buscar, seleccionar la categoría al crear un producto, crear nuevas categorías, editar precio/nombre/presentación/imagen, y ocultar/mostrar productos. Acepta imágenes JPG, PNG y WebP de hasta 5 MB, optimizadas a WebP con un máximo de 900 px, o URL HTTPS. En modo compartido, las imágenes subidas se guardan en Supabase Storage. El navegador refresca las lecturas al enfocar la ventana y cada 30 segundos; el panel también refresca después de guardar.

## Marca y catálogo

MatuMarket — **Tu compra cerca de casa**. Verde `#163F31`, crema `#FBF7E9`, naranja `#EF8447`. Emblema en `public/brand/matumarket-emblema.png`; composición del logo en `public/brand/logo.svg`. Fuentes del sistema, sin Google Fonts. La disponibilidad legal del nombre no se ha comprobado.

Los productos locales de `app/products.js` son ejemplos. El teléfono, horario, dirección y tarifa de delivery provienen de la aplicación anterior: confirma esos datos con el negocio. El carrito vive en memoria. El cliente debe enviar el mensaje de WhatsApp y la tienda debe confirmar el pedido. Los pedidos se coordinan por WhatsApp: el cliente revisa y envía el mensaje, y la tienda confirma disponibilidad y entrega. No se registran pedidos automáticamente ni se procesan pagos. El panel conserva la administración de productos y categorías con correo y contraseña.

## Pruebas

`npm run test:permissions` ejecuta el SQL real en PostgreSQL local mediante PGlite, representando los esquemas de Supabase Auth y Storage. Comprueba RLS, lectura pública limitada a productos activos, rechazo de escrituras sin autorización, imposibilidad de autoasignarse administrador, protección del bucket incluso con otra política permisiva, revocación, duplicados, precios inválidos, importación atómica y ejecución repetible del setup. No necesita claves ni conecta a un proyecto real.

También se han comprobado en navegador los flujos del catálogo local, categorías vacías, edición de precio/imagen, persistencia, copias, carrito, layouts móviles y mensaje de WhatsApp interceptado sin enviar pedidos. La validación de autenticación, catálogo e imágenes contra el proyecto Supabase real queda pendiente de su activación y configuración.

## Mapa de entrega

Al elegir Delivery aparece un mapa centrado en Matucana con Leaflet y los mapas públicos de OpenStreetMap. El cliente puede tocar el punto, arrastrar el marcador o pulsar «Usar mi ubicación»; la ubicación del dispositivo se solicita únicamente con ese clic y requiere su permiso y una conexión HTTPS. La precisión del GPS se muestra como aproximada y el marcador se puede corregir. «Marcar centro del mapa» permite seleccionar con controles de teclado. El centro inicial no se envía como dirección sin selección explícita.

El mensaje de WhatsApp incluye un enlace a Google Maps con las coordenadas elegidas, además de la dirección y referencia escritas. Para recojo no se incluye ubicación. El punto es opcional y la dirección escrita sigue siendo necesaria: el cliente puede continuar si rechaza el permiso o no carga el mapa. La tienda confirma cobertura y delivery; el mapa no define una zona ni un precio nuevos. No se almacenan coordenadas en Supabase ni se envía el pedido automáticamente.

No necesita claves de mapas ni un servicio de API de pago. Se mantiene la atribución visible a OpenStreetMap y Leaflet, se usan los tiles HTTPS estándar, la caché HTTP del navegador y su Referer; no se realizan precargas ni descargas offline. Respeta la [política del servicio](https://operations.osmfoundation.org/policies/tiles/) y revisa el proveedor si aumenta mucho el tráfico. No se utiliza geocodificación automática.

La demostración HTML descargable muestra un enlace a la tienda publicada en lugar de solicitar tiles sin un Referer web válido. El mapa interactivo se prueba en la web. Las comprobaciones en navegador cubrieron geolocalización simulada, clic, arrastre, coordenadas correctas en WhatsApp, recojo, quitar punto, permisos denegados y tiles fallidos, sin enviar mensajes ni modificar datos del negocio.

### Condiciones de entrega y pagos

La bolsa muestra cobertura, horario, tiempo estimado, costo y condiciones de pago antes de abrir WhatsApp. El propietario confirmó Yape y efectivo, Matucana centro gratis y alrededores S/ 5. El cliente debe elegir la zona para calcular el delivery; el mapa no clasifica automáticamente zonas sin límites definidos. El pedido incluye la preferencia de pago; no realiza cobros ni confirma compras automáticamente.

Para compartir estos ajustes entre dispositivos, ejecuta `supabase/store-settings.sql` en el SQL Editor del proyecto existente después de `supabase/setup.sql`. El script crea o actualiza las tarifas y métodos confirmados, conservando horarios e instrucciones existentes. Crea únicamente `matumarket_store_settings`: lectura pública, escritura de administradores autorizados mediante RLS y validación de valores. No modifica productos ni cuentas. Luego abre el panel y despliega **Condiciones de entrega y métodos de pago** para actualizar el costo, zonas, horario, plazo, pagos aceptados e instrucciones. No publiques credenciales ni datos privados en estos textos públicos.

Si la tabla todavía no existe, la tienda usa las condiciones confirmadas: centro gratis, alrededores S/ 5, Yape y efectivo. El plazo y cobertura exacta se confirman por WhatsApp. El panel explica la configuración pendiente y deshabilita guardar. La demostración portable guarda estos ajustes solo en el navegador. `npm run test:permissions` incluye lectura pública, rechazo de cambios anónimos o de usuarios sin autorización, cambios del administrador, validación y revocación de acceso para la tabla nueva.
