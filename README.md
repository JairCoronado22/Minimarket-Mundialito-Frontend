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
        ├── pos.js
        ├── purchasing.js
        └── tailwind.config.js
```

`login.html` contiene la pantalla de acceso de demostración. La cuenta de cajero abre `pos.html`, una terminal de ventas separada del dashboard administrativo; la cuenta de administrador abre `index.html`. `assets/js/pos.js` controla la búsqueda de productos, el carrito y el cobro simulado. Desde ambas vistas se puede volver al acceso con “Salir” o “Cerrar sesión”. `assets/js/login.js` controla las interacciones y rutas por rol. `assets/js/main.js` carga los componentes HTML y luego inicializa las interacciones. `assets/js/navigation.js` gestiona la navegación entre el dashboard de compras y las vistas iniciales de los demás módulos; la ruta seleccionada se conserva en el fragmento de la URL. `assets/js/purchasing.js` encapsula las interacciones de compras; `assets/js/tailwind.config.js` centraliza los tokens visuales. Los estilos base están en `assets/css/main.css`.

## Ejecución local

Los módulos ES y la carga de componentes necesitan un servidor HTTP local; no abras `index.html` directamente con doble clic.

Desde la carpeta del proyecto, ejecuta:

```powershell
py -m http.server 8000
```

Luego abre <http://localhost:8000>. También puedes usar la extensión Live Server de Visual Studio Code.
La pantalla de acceso está disponible en <http://localhost:8000/login.html>.

La tipografía, los iconos y Tailwind CSS se cargan desde servicios externos, por lo que requieren conexión a Internet.

El acceso y el punto de venta son demostraciones del lado del cliente: no validan credenciales contra un servidor ni registran ventas reales. La selección de rol sirve para mostrar vistas distintas, no como control de seguridad de producción.
