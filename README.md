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

`login.html` contiene la pantalla de acceso de demostración. La cuenta de cajero abre `pos.html`, una terminal de ventas separada del dashboard administrativo; la cuenta de administrador abre `index.html`. `assets/js/pos.js` controla la búsqueda de productos, el carrito, el stock y el cobro simulado, con selección de efectivo, tarjeta, Yape o Plin. El POS web conserva el simulador manual; la app Expo puede leer códigos de barras y QR con la cámara del celular y también ofrece el simulador manual. En Expo, los códigos existentes se consultan en el backend; los códigos no registrados pueden usarse temporalmente durante la sesión. La cámara requiere permiso y, en web, un contexto seguro (HTTPS o localhost). Cada venta cobrada se registra junto con su detalle, fecha, cajero, caja y medio de pago; `assets/js/sales.js` comparte el historial y los totales separados por medio de pago entre el POS y la sección “Ventas & Cajas” del panel administrativo. En “Inventario & Almacén”, `assets/js/inventory.js` permite registrar lotes recibidos con cantidad, proveedor y vencimiento; las recepciones actualizan el stock que consulta el POS. “Alertas Predictivas” muestra productos con 10 unidades o menos y lotes con existencias que vencen dentro de 30 días; los vencidos y los que vencen en 7 días o menos se marcan como urgentes. En el dashboard Expo, el resumen de alertas se complementa con las listas separadas de stock bajo y lotes vencidos/próximos a vencer. En la web antigua, los datos de los lotes se conservan en `localStorage`; no se sincronizan con otros dispositivos. La app Expo obtiene productos, historial de ventas y stock desde el backend; los datos de proveedor, lote y vencimiento, y los códigos vinculados manualmente, siguen siendo locales a la sesión. Desde ambas vistas se puede volver al acceso con “Salir” o “Cerrar sesión”. `assets/js/login.js` controla las interacciones y rutas por rol. `assets/js/main.js` carga los componentes HTML y luego inicializa las interacciones. `assets/js/navigation.js` gestiona la navegación entre el dashboard de compras y los módulos; la ruta seleccionada se conserva en el fragmento de la URL. `assets/js/purchasing.js` encapsula las interacciones de compras; `assets/js/tailwind.config.js` centraliza los tokens visuales. Los estilos base están en `assets/css/main.css`.

Cuando hay alertas activas, una campana animada y un aviso visible aparecen en las pantallas operativas web y Expo. El aviso prioriza la situación más urgente; al pulsar la campana se puede consultar la lista completa de productos por vencer o con stock bajo. La animación respeta la preferencia de movimiento reducido en navegadores.

Estado actualizado: el POS web y la interfaz Expo consultan productos y ventas en el backend, y registran ventas que descuentan el stock en una transacción. “Inventario & Almacén” y las alertas de stock bajo consultan el backend; las recepciones suman stock mediante `POST /api/productos/{id}/ingresos`. Los datos de proveedor, lote y vencimiento todavía son locales, por lo que las alertas de vencimiento no se sincronizan entre dispositivos. Tarjeta/Yape son registros manuales; el sistema no verifica ni procesa esos pagos.

## Ejecución local

Los módulos ES y la carga de componentes necesitan un servidor HTTP local; no abras `index.html` directamente con doble clic.

Desde la carpeta del proyecto, ejecuta:

```powershell
py -m http.server 8000
```

Luego abre <http://localhost:8000>. También puedes usar la extensión Live Server de Visual Studio Code.
La pantalla de acceso está disponible en <http://localhost:8000/login.html>.

La tipografía, los iconos y Tailwind CSS se cargan desde servicios externos, por lo que requieren conexión a Internet.

La selección de rol solo muestra vistas distintas y no valida credenciales ni protege los datos. Los medios de pago no se procesan en línea ni se verifican; los datos de proveedor, lote y vencimiento de Expo tampoco se guardan en el backend.

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

### Conectar a Supabase

`application.properties` ya toma la conexión de las variables de entorno. Para usar la base Supabase de este proyecto en PowerShell, configura la URL JDBC con SSL y escribe la contraseña de forma oculta cuando se solicite:

```powershell
$env:DB_URL="jdbc:postgresql://db.vieisxllgzyemhrxjghs.supabase.co:5432/postgres?sslmode=require"
$env:DB_USERNAME="postgres"
$securePassword = Read-Host "Contraseña de la base Supabase" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
$env:JAVA_HOME="C:\Program Files\Java\jdk-25"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
cd backend
mvn spring-boot:run
```

Estas variables solo se configuran para la sesión actual de PowerShell; no guardes la contraseña en `application.properties`, el repositorio ni el historial de comandos. Al iniciar, Flyway ejecuta migraciones que modifican el esquema y agregan productos de demostración. Usa una base vacía o haz una copia de seguridad y revisa las migraciones antes de conectarte a una base con datos importantes.

### Despliegue del backend en Render

El backend incluye [backend/Dockerfile](./backend/Dockerfile), compatible con Java 25. En Render, crea un servicio Web usando Docker y establece `backend` como Root Directory. Configura `DB_URL` (URL JDBC de Supabase con `sslmode=require`), `DB_USERNAME` y `DB_PASSWORD` en Environment; guarda la contraseña como variable secreta de Render, no en el repositorio. La aplicación escucha en el puerto asignado por Render mediante `PORT`. Flyway aplica las migraciones durante el arranque, así que verifica que la base esté vacía o respaldada antes del primer despliegue.

### Publicar la interfaz Expo en Render

Para publicar la interfaz móvil/web actual de Expo (y no la página HTML antigua de la raíz), configura el Static Site con la raíz del repositorio, Build Command `npm ci && npm run lint && npm test && npm run build:web` y Publish Directory `dist`. Así Render valida el frontend antes de publicar. `app.json` configura `expo.extra.apiBaseUrl` con la URL del backend; la app usa esa API para cargar productos y ventas, registrar ventas e ingresar stock.

El workflow [`.github/workflows/ci-backend.yml`](./.github/workflows/ci-backend.yml) ejecuta las pruebas Maven con Java 25 y valida el frontend (lint, pruebas de API y export web) en cada pull request hacia `master` y cada push a esa rama. Para impedir que se fusione un pull request con checks fallidos, configura ambos jobs como verificaciones requeridas en las reglas de protección de `master` en GitHub.

En pgAdmin, selecciona `mundialito_db` y abre Query Tool para verificar las tablas después del primer inicio del backend; el panel Messages debe mostrar que Flyway aplicó las migraciones disponibles. La API ofrece:

- `GET/POST /api/productos`, `GET/PUT/DELETE /api/productos/{id}`. Los productos incluyen `codigoBarras` opcional y categoría.
- `POST /api/productos/{id}/ingresos` con `{"cantidad": 5}` para aumentar el stock de forma transaccional.
- `GET /api/productos/codigo/{codigoBarras}` para resolver una lectura de escáner a un producto.
- `GET/POST /api/ventas` para consultar ventas y registrar ventas con `EFECTIVO`, `TARJETA` o `YAPE`; el servidor calcula precios y descuenta stock de góndola dentro de una transacción.

Para registrar una venta, envía `cajero`, `terminal`, `medioPago` (`"EFECTIVO"`, `"TARJETA"` o `"YAPE"`) e `items: [{"productoId": 1, "cantidad": 2}]`. Tarjeta y Yape solo guardan el medio declarado por el cajero: no se conectan con el proveedor, no validan ni procesan el cobro. Confirma el pago externamente antes de registrarlo. `PLIN` y otros medios todavía se rechazan.

La integración Culqi todavía no procesa pagos y las variables `CULQI_PUBLIC_KEY` y `CULQI_SECRET_KEY` no se usan. El POS web obtiene productos, busca códigos escaneados, registra ventas y el panel Ventas & Cajas consulta el historial del servidor. El registro de Tarjeta/Yape es manual y de demostración; no habilita cobros reales. No guardes ni envíes una llave secreta al navegador o al repositorio. Antes de activar pagos digitales hay que implementar y probar un flujo seguro de Checkout y confirmar el resultado con Culqi.

La API actual no tiene autenticación/autorización para producción: mantenla local mientras se integra un mecanismo de acceso seguro.

## Módulo de IA

El backend incluye un módulo de IA (`com.mundialito.ia`) que implementa algoritmos de búsqueda, regresión y clasificación para apoyar la gestión del minimarket. Los algoritmos se implementan en Java puro, sin dependencias externas de Machine Learning.

### APIs disponibles

- **`GET /api/ia/reposicion`** — Plan de reposición de stock usando 4 algoritmos de búsqueda (BFS, DFS, A*, Hill Climbing). Parámetros opcionales: `stockUmbral` (default 15), `stockMinimo` (default 30), `diasHistorial` (default 30). Devuelve la comparación de los 4 algoritmos con costos, nodos expandidos y tiempo de ejecución.

- **`GET /api/ia/demanda/{productoId}`** — Predicción de demanda de un producto usando regresión lineal y polinomial. Parámetro opcional: `diasHistorial` (default 30). Devuelve la predicción, intervalo de confianza, MAE y RMSE.

- **`GET /api/ia/riesgo`** — Clasificación de riesgo de todos los productos usando 5 modelos (Regresión Logística, SVM, KNN, Árbol de Decisión, AdaBoost). Devuelve alertas ordenadas por nivel de riesgo (ALTO, MEDIO, BAJO).

- **`GET /api/ia/comparar`** — Comparación de los 5 modelos de clasificación con métricas de precisión, recall y F1 Score.

### Algoritmos implementados

**Búsqueda:** BFS, DFS, A* (con heurística de urgencia), Hill Climbing — para planificación de reposición de stock.

**Regresión:** Regresión lineal (mínimos cuadrados) y polinomial (grado configurable) — para predicción de demanda.

**Clasificación:** Regresión Logística, SVM (kernel lineal), KNN (distancia euclidiana), Árbol de Decisión (ID3 con entropía), AdaBoost (ensemble de stumps) — para clasificación de riesgo de stock.

### Base de datos

La migración V5 crea la tabla `ventas_diarias` que agrupa las ventas por producto y día, alimentando los modelos de IA. Se pobla automáticamente con datos históricos desde `detalle_venta` y `ventas`.
