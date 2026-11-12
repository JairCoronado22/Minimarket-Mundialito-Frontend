# Retail Pulse — El Mundialito

Panel de gestión de compras y reposición inteligente, organizado en componentes HTML, estilos y módulos JavaScript.

## Estructura

```text
.
├── index.html
├── login.html
├── pos.html
├── components/
│   ├── purchasing-overview.html
│   ├── restock-suggestions.html
│   ├── sidebar.html
│   └── topbar.html
└── assets/
    ├── css/
    │   └── main.css
    └── js/
        ├── main.js
        ├── login.js
        ├── navigation.js
        ├── inventory.js
        ├── pos.js
        ├── purchasing.js
        └── tailwind.config.js
```

`login.html` contiene la pantalla de acceso de demostración. La cuenta de cajero abre `pos.html`, una terminal de ventas separada del dashboard administrativo; la cuenta de administrador abre `index.html`. `assets/js/pos.js` controla la búsqueda de productos, el carrito, el stock y el cobro simulado, con selección de efectivo, tarjeta, Yape o Plin. El POS web conserva el simulador manual; la app Expo puede leer códigos de barras y QR con la cámara del celular y también ofrece el simulador manual. Como los productos de demostración no tienen códigos precargados, la primera lectura permite vincular el código al producto elegido; las siguientes lecturas lo agregan directamente al carrito. La cámara requiere permiso y, en web, un contexto seguro (HTTPS o localhost). Cada venta cobrada se registra junto con su detalle, fecha, cajero, caja y medio de pago; `assets/js/sales.js` comparte el historial y los totales separados por medio de pago entre el POS y la sección “Ventas & Cajas” del panel administrativo. En “Inventario & Almacén”, `assets/js/inventory.js` permite registrar lotes recibidos con cantidad, proveedor y vencimiento; las recepciones actualizan el stock que consulta el POS. “Alertas Predictivas” muestra productos con 10 unidades o menos y lotes con existencias que vencen dentro de 30 días; los vencidos y los que vencen en 7 días o menos se marcan como urgentes. En el dashboard Expo, el resumen de alertas se complementa con las listas separadas de stock bajo y lotes vencidos/próximos a vencer. Las ventas consumen primero los lotes más antiguos para que las alertas de vencimiento reflejen sus unidades restantes. Estos datos se conservan en `localStorage` y se actualizan entre pestañas del mismo navegador, pero no se sincronizan con un servidor ni con otros dispositivos. La app Expo ofrece recepción de lotes, selección de medios de pago simulados y alertas en el dashboard administrativo; su historial, alertas, códigos vinculados y stock se conservan durante la sesión actual. Desde ambas vistas se puede volver al acceso con “Salir” o “Cerrar sesión”. `assets/js/login.js` controla las interacciones y rutas por rol. `assets/js/main.js` carga los componentes HTML y luego inicializa las interacciones. `assets/js/navigation.js` gestiona la navegación entre el dashboard de compras y los módulos; la ruta seleccionada se conserva en el fragmento de la URL. `assets/js/purchasing.js` encapsula las interacciones de compras; `assets/js/tailwind.config.js` centraliza los tokens visuales. Los estilos base están en `assets/css/main.css`.

Cuando hay alertas activas, una campana animada y un aviso visible aparecen en las pantallas operativas web y Expo. El aviso prioriza la situación más urgente; al pulsar la campana se puede consultar la lista completa de productos por vencer o con stock bajo. La animación respeta la preferencia de movimiento reducido en navegadores.

Estado actualizado del POS web: el catálogo se consulta a la API, el código de barras se busca en PostgreSQL y las ventas se registran en el backend con el medio elegido. Tarjeta/Yape son registros manuales de demostración; el POS no verifica ni procesa esos pagos. “Ventas & Cajas” muestra el historial de la API. La app Expo, el módulo administrativo de inventario y sus alertas todavía trabajan con datos locales; no representan el stock sincronizado de PostgreSQL. Expo tiene configurada la URL LAN del backend en `expo.extra.apiBaseUrl`, pero la app móvil todavía no consume esa API.

## Ejecución local

Los módulos ES y la carga de componentes necesitan un servidor HTTP local; no abras `index.html` directamente con doble clic.

Desde la carpeta del proyecto, ejecuta:

```powershell
py -m http.server 8000
```

Luego abre <http://localhost:8000>. También puedes usar la extensión Live Server de Visual Studio Code.
La pantalla de acceso está disponible en <http://localhost:8000/login.html>.

La tipografía, los iconos y Tailwind CSS se cargan desde servicios externos, por lo que requieren conexión a Internet.

El acceso, los medios de pago, la recepción de lotes y el punto de venta son simulaciones del lado del cliente: no validan credenciales, no procesan pagos reales ni registran órdenes reales a proveedores. La selección de rol sirve para mostrar vistas distintas, no como control de seguridad de producción.

## Backend Spring Boot

El backend está en `backend/` y requiere Java 25, Maven y PostgreSQL. En pgAdmin, inicia el servidor local y crea **solo la base vacía** `mundialito_db` (Databases → Create → Database). No pegues scripts que borren tablas. Al iniciar Spring Boot, Flyway crea y versiona `productos`, `ventas` y `detalle_venta`, conservando los productos y ventas que ya existan. La migración V2 carga códigos de ejemplo compartidos para probar el lector; confírmalos contra el empaque real antes de usarlos en caja. Las migraciones posteriores adaptan los tipos y completan los campos requeridos de las tablas existentes.

En PowerShell, configura la contraseña de PostgreSQL y ejecuta el backend:

```powershell
$env:DB_PASSWORD="tu_contraseña"
$env:JAVA_HOME="C:\Program Files\Java\jdk-25"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
cd backend
mvn spring-boot:run
```

La conexión usa `DB_URL`, `DB_USERNAME` y `DB_PASSWORD`. Si la interfaz usa otro origen, agrégalo a `APP_CORS_ALLOWED_ORIGINS` como lista separada por comas. Flyway crea y versiona las tablas `productos`, `ventas` y `detalle_venta` al iniciar; Hibernate solo valida el esquema. Las migraciones conservan los productos y ventas existentes, agregan campos de categoría y código de barras, y compatibilizan los identificadores y campos requeridos.

En pgAdmin, selecciona `mundialito_db` y abre Query Tool para verificar las tablas después del primer inicio del backend; el panel Messages debe mostrar que Flyway aplicó las migraciones disponibles. La API ofrece:

- `GET/POST /api/productos`, `GET/PUT/DELETE /api/productos/{id}`. Los productos incluyen `codigoBarras` opcional y categoría.
- `GET /api/productos/codigo/{codigoBarras}` para resolver una lectura de escáner a un producto.
- `GET/POST /api/ventas` para consultar ventas y registrar ventas con `EFECTIVO`, `TARJETA` o `YAPE`; el servidor calcula precios y descuenta stock de góndola dentro de una transacción.

Para registrar una venta, envía `cajero`, `terminal`, `medioPago` (`"EFECTIVO"`, `"TARJETA"` o `"YAPE"`) e `items: [{"productoId": 1, "cantidad": 2}]`. Tarjeta y Yape solo guardan el medio declarado por el cajero: no se conectan con el proveedor, no validan ni procesan el cobro. Confirma el pago externamente antes de registrarlo. `PLIN` y otros medios todavía se rechazan.

La integración Culqi todavía no procesa pagos y las variables `CULQI_PUBLIC_KEY` y `CULQI_SECRET_KEY` no se usan. El POS web obtiene productos, busca códigos escaneados, registra ventas y el panel Ventas & Cajas consulta el historial del servidor. El registro de Tarjeta/Yape es manual y de demostración; no habilita cobros reales. No guardes ni envíes una llave secreta al navegador o al repositorio. Antes de activar pagos digitales hay que implementar y probar un flujo seguro de Checkout y confirmar el resultado con Culqi.

La API actual no tiene autenticación/autorización para producción: mantenla local mientras se integra un mecanismo de acceso seguro.
