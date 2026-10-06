const modules = {
  "ventas-cajas": {
    title: "Ventas & Cajas",
    description:
      "Consulta la actividad de ventas y el estado de las cajas del negocio.",
    areas: [
      ["point_of_sale", "Operación de cajas", "Apertura, cierre y seguimiento de cajas."],
      ["receipt_long", "Ventas", "Consulta de ventas y comprobantes."],
      ["payments", "Medios de pago", "Revisión de pagos y movimientos."],
    ],
  },
  "inventario-almacen": {
    title: "Inventario & Almacén",
    description:
      "Gestiona existencias, movimientos y organización del almacén.",
    areas: [
      ["inventory_2", "Existencias", "Consulta del inventario disponible."],
      ["swap_horiz", "Movimientos", "Entradas, salidas y ajustes de stock."],
      ["warehouse", "Almacenes", "Control de ubicaciones y almacenamiento."],
    ],
  },
  "alertas-predictivas": {
    title: "Alertas Predictivas",
    description:
      "Revisa avisos de quiebre, reposición y cambios relevantes del inventario.",
    areas: [
      ["crisis_alert", "Quiebres de stock", "Productos con riesgo de quedarse sin existencias."],
      ["schedule", "Reposición próxima", "Artículos que requieren seguimiento."],
      ["insights", "Tendencias", "Señales detectadas en el comportamiento de ventas."],
    ],
  },
  reportes: {
    title: "Reportes",
    description:
      "Encuentra resúmenes para revisar el desempeño de la operación.",
    areas: [
      ["bar_chart", "Ventas", "Resúmenes de actividad comercial."],
      ["inventory", "Inventario", "Informes de existencias y rotación."],
      ["shopping_cart", "Compras", "Seguimiento de órdenes y reposición."],
    ],
  },
  configuracion: {
    title: "Configuración",
    description:
      "Administra las preferencias generales de Retail Pulse.",
    areas: [
      ["storefront", "Datos del negocio", "Información de la tienda y sus cajas."],
      ["group", "Usuarios y roles", "Accesos y responsabilidades del equipo."],
      ["tune", "Preferencias", "Opciones de funcionamiento de la aplicación."],
    ],
  },
};

function renderModule(moduleView, module) {
  moduleView.innerHTML = `
    <section class="flex flex-col gap-space-lg p-margin-lg" aria-labelledby="module-title">
      <header class="flex flex-col gap-2">
        <p class="font-label-md text-label-md font-semibold text-primary">Retail Pulse</p>
        <h1 id="module-title" class="font-headline-xl text-headline-xl text-on-surface">${module.title}</h1>
        <p class="max-w-2xl font-body-md text-body-md text-on-surface-variant">${module.description}</p>
      </header>
      <div class="grid gap-space-md md:grid-cols-2 xl:grid-cols-3">
        ${module.areas
          .map(
            ([icon, title, description]) => `
              <article class="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                <span class="material-symbols-outlined mb-space-md flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container text-on-primary">${icon}</span>
                <h2 class="font-headline-sm text-headline-sm text-on-surface">${title}</h2>
                <p class="mt-2 font-body-sm text-body-sm text-on-surface-variant">${description}</p>
              </article>`,
          )
          .join("")}
      </div>
      <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg" role="status">
        <p class="font-label-lg text-label-lg text-on-surface">Vista del módulo</p>
        <p class="mt-1 font-body-md text-body-md text-on-surface-variant">La navegación está activa. Los datos y operaciones de esta sección aún no están conectados.</p>
      </div>
    </section>`;
}

export function initDashboardNavigation() {
  const sidebarNav = document.querySelector("#sidebar-mount nav");
  const dashboardOverview = document.querySelector(
    "#purchasing-overview-mount",
  );
  const restockSuggestions = document.querySelector(
    "#restock-suggestions-mount",
  );
  const moduleView = document.querySelector("#module-view-mount");
  const activeClasses =
    sidebarNav?.dataset.activeClasses?.split(/\s+/).filter(Boolean) ?? [];

  if (!sidebarNav || !dashboardOverview || !restockSuggestions || !moduleView) {
    throw new Error("No se encontraron los elementos necesarios para navegar.");
  }

  const links = Array.from(sidebarNav.querySelectorAll("a[data-path]"));
  links.forEach((link) => {
    link.href = `#${link.dataset.path}`;
  });

  function renderCurrentRoute() {
    const requestedRoute = window.location.hash.slice(1);
    const route = requestedRoute || "dashboard";
    const module = modules[route];
    const isPurchasingDashboard =
      route === "dashboard" || route === "proveedores-compras";

    if (!isPurchasingDashboard && !module) {
      window.history.replaceState(null, "", "#dashboard");
      return renderCurrentRoute();
    }

    dashboardOverview.classList.toggle("hidden", !isPurchasingDashboard);
    restockSuggestions.classList.toggle("hidden", !isPurchasingDashboard);
    moduleView.classList.toggle("hidden", isPurchasingDashboard);

    if (module) {
      renderModule(moduleView, module);
    }

    links.forEach((link) => {
      const isActive = link.dataset.path === route;
      link.classList.remove(...activeClasses);
      link.removeAttribute("aria-current");
      if (isActive) {
        link.classList.add(...activeClasses);
        link.setAttribute("aria-current", "page");
      }
    });
  }

  window.addEventListener("hashchange", renderCurrentRoute);
  renderCurrentRoute();
}
