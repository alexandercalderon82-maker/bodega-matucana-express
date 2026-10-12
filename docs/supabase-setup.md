# Activar el acceso real de MatuMarket

La aplicación tiene un panel por categorías con inicio de sesión mediante Supabase Auth. La protección de los datos se aplica en PostgreSQL con RLS, no depende de ocultar botones en el navegador. No contiene usuario ni contraseña predeterminados.

1. Reactiva tu proyecto de Supabase o crea uno nuevo. No es necesario eliminar los datos anteriores.
2. En **SQL Editor**, ejecuta `supabase/setup.sql`. Crea las tablas `matumarket_categories`, `matumarket_products`, `matumarket_admins`, sus permisos y el bucket público `matumarket-images`. No modifica las antiguas tablas `products`, `orders` u `order_items`. Si ya existen objetos con esos nombres nuevos, revisa su esquema y permisos antes de reutilizarlos. El bucket debe ser público, limitar archivos a 5 MB y aceptar `image/webp`.
3. En **Authentication → Users → Add user**, crea tu cuenta con un correo propio y una contraseña fuerte. Confirma el correo de la cuenta. Puedes desactivar el registro público si solo usarás cuentas que crea el propietario. Las cuentas normales nunca obtienen permisos de administración automáticamente.
4. Autoriza esa cuenta desde **SQL Editor**, reemplazando únicamente el correo de ejemplo:

   ```sql
   insert into public.matumarket_admins(user_id)
   select id from auth.users where email = 'TU_CORREO'
   on conflict do nothing;
   ```

   Comprueba que se insertó una fila. No compartas tu contraseña por chat. Una cuenta sin esta fila recibe acceso denegado, aunque su correo y contraseña sean correctos.
5. En la configuración del entorno y, cuando despliegues, en Vercel, añade:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL HTTPS del proyecto.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave **publishable** o **anon** del proyecto, obtenida de sus ajustes de API.

   Son datos de conexión públicos del cliente. **Nunca uses la clave service_role ni una secret key**: el navegador las expondría y podrían saltarse los permisos. No hay una variable para guardar la contraseña del administrador.
6. Permite el hostname exacto de tu proyecto en la red del entorno. Reinicia el servidor de desarrollo y recompila para que Next.js incluya las variables públicas. `npm run build` debe ejecutarse después de configurarlas para un despliegue.
7. Abre `/admin`, ingresa con tu correo y contraseña, crea categorías y productos. El catálogo compartido comienza vacío: no se publican automáticamente los precios de ejemplo.

## Traer el catálogo de la demostración

En el HTML descargable, entra a «Explorar panel de demostración» y exporta el catálogo JSON. En la web configurada, ingresa como administrador y usa «Importar copia». Confirma el reemplazo. La importación compartida es una transacción PostgreSQL: datos inválidos revierten las modificaciones del catálogo. Las imágenes locales se suben al bucket antes de la importación; una importación fallida puede dejar archivos sin referencias, que el propietario puede limpiar en Storage. No ejecutes pruebas destructivas sobre un catálogo real.

Las copias antiguas que contienen solo un array de productos siguen siendo compatibles. Las nuevas incluyen `version`, `products` y `categories`, por lo que se conservan también categorías vacías.

## Comprobar los permisos antes de publicar

En un proyecto de prueba comprueba: un visitante ve solo productos activos; un usuario sin autorización no entra al panel ni puede escribir mediante la API; no puede añadirse a `matumarket_admins`; un administrador puede crear categorías, editar precios e imágenes y ocultar productos; cerrar sesión vuelve al formulario. Verifica el resultado desde otro navegador sin sesión. Las lecturas se refrescan al enfocar la ventana y cada 30 segundos; también después de guardar.

La pantalla de acceso bloquea la administración cuando faltan variables, falla la verificación de permisos o la cuenta no está autorizada. La sesión se gestiona con Supabase Auth. Para revocar una cuenta, elimina su fila de `matumarket_admins`; para restablecer su contraseña o terminar sus sesiones, usa las herramientas de Supabase Auth.

El HTML descargable **no contiene credenciales y no inicia sesión real**. Es una demostración local separada, con un botón claramente señalado para explorar el diseño. No puede modificar el catálogo compartido. La protección real necesita una web publicada y el proyecto de Supabase correctamente configurado.
