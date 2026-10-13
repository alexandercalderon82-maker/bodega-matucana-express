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
