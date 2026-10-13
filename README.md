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


### Ofertas y combos

Ejecuta `supabase/promotions.sql` en el SQL Editor del mismo proyecto para habilitar las promociones compartidas. El script es repetible, no publica promociones y conserva los productos y cuentas existentes. Los clientes leen promociones activas y vigentes; solo administradores autorizados pueden crear o modificar promociones.

En el panel, abre **Ofertas y combos → Nueva promoción**. Una oferta incluye una unidad de un producto; un combo incluye dos o más productos distintos y sus cantidades. Define un precio menor al habitual, fechas opcionales en hora de Perú y activa la promoción cuando esté lista. Por defecto se guarda como borrador. Las imágenes se toman del primer producto y se actualizan al cambiar las fotos del catálogo.

La portada muestra únicamente promociones vigentes con todos sus productos visibles y un ahorro positivo respecto a los precios actuales. El carrito usa el precio promocional, mantiene el combo como una unidad e incluye su composición en WhatsApp. Si vence o deja de estar disponible, el cliente debe retirarlo y revisar el total antes de continuar. Las promociones no gestionan inventario ni pagos automáticos. La demo portable permite probar borradores, activación y compra localmente sin escribir al Supabase real. `npm run test:permissions` también comprueba RLS, precios, cantidades, referencias y fechas de promociones; las pruebas de navegador interceptan WhatsApp sin enviar pedidos.

### Material de difusión

`/difusion/index.html` reúne imágenes para estados (1080 × 1920), publicaciones (1080 × 1350), un afiche A4 PDF, QR PNG/SVG, texto para compartir y ZIP. Todos usan el logo existente, la URL pública de producción, WhatsApp 908 953 959, centro gratis, alrededores S/ 5, Yape y efectivo. Los QR se codifican de forma determinista y se verifican con un lector independiente; los documentos se renderizan desde PDF con texto y módulos QR vectoriales. No se publican mensajes en redes ni WhatsApp.

Para regenerar, instala `qrcode`, `reportlab` y `pillow` en un entorno Python aparte del entorno Node y ejecuta `python scripts/generate-marketing.py`. Luego renderiza los dos PDF sociales con `pdftoppm -png -singlefile -r 144 public/difusion/matumarket-estado.pdf public/difusion/matumarket-estado` y el equivalente para `matumarket-publicacion`. Conserva los cuatro módulos de margen blanco del QR y verifica cada archivo con un lector QR antes de compartir. El material es estático: regenera si cambian el enlace, tarifas, pagos, contacto u horario. No requiere claves ni servicios de pago y no cambia el catálogo.


### Agotados y horario de atención

Ejecuta `supabase/availability-hours.sql` en el SQL Editor después de configurar catálogo y condiciones de entrega. La migración conserva productos, cuentas, tarifas y pagos; añade `in_stock` (disponible inicialmente), actualiza la importación de respaldos y valida los nuevos campos opcionales de horario. Es repetible. Hasta ejecutarla, el catálogo y la edición de precios siguen funcionando, y el panel indica que debe habilitarse la disponibilidad.

En la tabla del panel, **Disponibilidad** alterna «Disponible/Agotado»; **Visibilidad** sigue alternando «Visible/Oculto». Un producto visible agotado se muestra con etiqueta y botón deshabilitado. Los combos que lo incluyen se retiran automáticamente de la tienda. Si un producto o promoción de la bolsa deja de estar disponible, el cliente debe retirarlo y revisar el total antes de continuar. Respaldos nuevos incluyen `in_stock`; respaldos antiguos conservan el comportamiento previo de productos disponibles.

En **Condiciones de entrega y métodos de pago**, configura apertura, cierre, días y pausa manual. El estado automático usa `America/Lima`, independientemente de la zona horaria del celular; admite horarios nocturnos hasta el día siguiente. Sin configuración nueva, usa el horario previo de 07:00–22:00 todos los días. Fuera de horario se puede preparar y enviar el pedido, pero la página y WhatsApp indican que requiere confirmación al retomar la atención. No implica respuesta automática ni cobros. El material estático de difusión debe regenerarse si cambias horarios o condiciones.


### Stock por cantidad y ventas confirmadas

Ejecuta `supabase/inventory.sql` después de las migraciones anteriores para habilitar `stock_quantity`, la importación con cantidades y el descuento transaccional de ventas. No inventa existencias: los productos previos mantienen cantidad `NULL` hasta que el propietario la configure. Cantidad cero muestra «Agotado»; una cantidad positiva indica unidades de la presentación publicada. El catálogo y la edición anterior funcionan antes de ejecutar la migración; los controles de cantidades permanecen deshabilitados.

Edita un producto y completa **Cantidad en stock**. La tienda muestra la cantidad y limita la bolsa sumando unidades de productos normales, ofertas y componentes de combos. Si cambia el stock durante la compra, exige ajustar la bolsa. Los combos muestran cantidad disponible únicamente cuando todos sus componentes tienen cantidades configuradas. Enviar WhatsApp no reserva ni descuenta inventario: el comercio confirma disponibilidad.

En **Descontar stock de una venta confirmada → Registrar venta confirmada**, selecciona productos o combos y cantidades, y pulsa **Confirmar venta y descontar stock** después de confirmar la venta con el cliente. Los combos se expanden a sus productos. La RPC verifica permisos, bloquea filas en orden estable, descuenta todo en una transacción y rechaza faltantes o cantidades sin configurar. Si falla cualquier producto, no descuenta ninguno. Cada envío tiene un UUID que evita un descuento doble al reintentar una operación; registrar la misma venta nuevamente como otra operación sí descontaría otra vez. El registro es privado para administradores y no guarda datos del cliente. La demo local sirve para pruebas en un navegador; el inventario compartido usa Supabase. Editar precios o visibilidad no sobrescribe cantidades compartidas; cambiar manualmente una cantidad es un ajuste deliberado.

Los respaldos nuevos incluyen las cantidades; al importar un respaldo antiguo sin cantidades, quedan sin configurar. No ejecutes migraciones antiguas después de `inventory.sql`, porque sus versiones anteriores de la función de importación no conocen cantidades. Para una instalación nueva ejecuta setup, store-settings, promotions, availability-hours e inventory en ese orden. No cambia las tarifas ni requiere servicios de pago.
