import { API_BASE_URL } from "./api.js";

// ---------------------------------------------------------------------------
// API calls to the IA backend
// ---------------------------------------------------------------------------

async function fetchIA(path) {
  const response = await fetch(`${API_BASE_URL}/ia${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Error al cargar datos de IA: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchReposicion(stockUmbral, stockMinimo, diasHistorial) {
  return fetchIA(`/reposicion?stockUmbral=${stockUmbral}&stockMinimo=${stockMinimo}&diasHistorial=${diasHistorial}`);
}

export async function fetchRiesgo() {
  return fetchIA("/riesgo");
}

export async function fetchComparar() {
  return fetchIA("/comparar");
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function badge(text, colorClass) {
  return `<span class="inline-flex items-center rounded-full bg-${colorClass}-container px-2.5 py-0.5 text-xs font-medium text-on-${colorClass}">${text}</span>`;
}

function card(title, icon, content) {
  return `
    <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg shadow-sm">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-symbols-outlined text-primary">${icon}</span>
        <h3 class="font-headline-sm text-headline-sm text-on-surface">${title}</h3>
      </div>
      ${content}
    </div>`;
}

function statBox(label, value, sub) {
  return `
    <div class="rounded-lg bg-surface-container-higher p-3 text-center">
      <p class="text-xs text-on-surface-variant">${label}</p>
      <p class="text-xl font-bold text-on-surface">${value}</p>
      ${sub ? `<p class="text-xs text-on-surface-variant">${sub}</p>` : ""}
    </div>`;
}

// ---------------------------------------------------------------------------
// Tab system
// ---------------------------------------------------------------------------

function renderTabs(activeTab) {
  const tabs = [
    { id: "riesgo", label: "Riesgo de Stock", icon: "warning" },
    { id: "reposicion", label: "Plan de Reposición", icon: "inventory_2" },
    { id: "metricas", label: "Métricas de Modelos", icon: "analytics" },
  ];
  return `
    <div class="flex flex-wrap gap-2" role="tablist">
      ${tabs.map(t => `
        <button class="ia-tab flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
          ${t.id === activeTab
            ? "bg-primary text-on-primary"
            : "bg-surface-container-higher text-on-surface-variant hover:bg-surface-container-highest"}"
          data-tab="${t.id}" role="tab" aria-selected="${t.id === activeTab}">
          <span class="material-symbols-outlined text-sm">${t.icon}</span>
          ${t.label}
        </button>
      `).join("")}
    </div>`;
}

// ---------------------------------------------------------------------------
// Tab 1 – Riesgo de Stock
// ---------------------------------------------------------------------------

async function renderRiesgoTab() {
  return `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-on-surface-variant">Clasificación de riesgo usando 5 modelos de IA (Regresión Logística, SVM, KNN, Árbol de Decisión, AdaBoost)</p>
        <button id="ia-refresh-riesgo" class="flex items-center gap-1 rounded-lg bg-primary-container px-3 py-1.5 text-sm font-medium text-on-primary-container hover:opacity-90">
          <span class="material-symbols-outlined text-sm">refresh</span>
          Actualizar
        </button>
      </div>
      <div class="grid gap-3">
        <div class="animate-pulse rounded-xl bg-surface-container-lowest p-6 text-center text-on-surface-variant">
          Cargando clasificación de riesgo...
        </div>
      </div>
    </div>`;
}

async function loadRiesgoData(container) {
  try {
    const alertas = await fetchRiesgo();
    if (!alertas || alertas.length === 0) {
      container.innerHTML = `
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">info</span>
          <p class="text-on-surface-variant">No hay datos suficientes para clasificar el riesgo. Registra más ventas para alimentar los modelos.</p>
        </div>`;
      return;
    }

    const alto = alertas.filter(a => a.riesgo === "ALTO");
    const medio = alertas.filter(a => a.riesgo === "MEDIO");
    const bajo = alertas.filter(a => a.riesgo === "BAJO");

    let html = `
      <div class="grid gap-3 sm:grid-cols-3">
        ${statBox("Riesgo Alto", alto.length, "Requiere acción inmediata")}
        ${statBox("Riesgo Medio", medio.length, "Monitoreo cercano")}
        ${statBox("Riesgo Bajo", bajo.length, "Sin acción requerida")}
      </div>
      <div class="flex flex-col gap-3">`;

    // Show ALTO first, then MEDIO, then BAJO
    const order = [...alto, ...medio, ...bajo];
    for (const a of order) {
      const color = a.riesgo === "ALTO" ? "error" : a.riesgo === "MEDIO" ? "warning" : "success";
      const icon = a.riesgo === "ALTO" ? "error" : a.riesgo === "MEDIO" ? "warning_amber" : "check_circle";
      html += `
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-${color}-container text-on-${color}">${icon}</span>
              <div>
                <h4 class="font-semibold text-on-surface">${a.nombreProducto}</h4>
                <p class="text-sm text-on-surface-variant">Stock: ${a.stockActual} | Demanda promedio: ${a.demandaPromedio?.toFixed(1) ?? "N/A"}</p>
              </div>
            </div>
            ${badge(a.riesgo, color)}
          </div>
          ${a.motivo ? `<p class="mt-2 text-xs text-on-surface-variant">${a.motivo}</p>` : ""}
          ${a.probabilidadRiesgo !== undefined ? `
            <div class="mt-2 w-full rounded-full bg-surface-container-higher h-1.5">
              <div class="h-1.5 rounded-full bg-${color}-container" style="width: ${Math.round(a.probabilidadRiesgo * 100)}%"></div>
            </div>
            <p class="mt-1 text-xs text-on-surface-variant">Probabilidad: ${Math.round(a.probabilidadRiesgo * 100)}%</p>
          ` : ""}
        </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    console.error("Error cargando riesgo:", error);
    container.innerHTML = `
      <div class="rounded-xl border border-error-container bg-error-container p-4 text-on-error-container">
        <p>No se pudo cargar la clasificación de riesgo: ${error.message}</p>
      </div>`;
  }
}

// ---------------------------------------------------------------------------
// Tab 2 – Plan de Reposición (Búsqueda)
// ---------------------------------------------------------------------------

async function renderReposicionTab() {
  return `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-on-surface-variant">Comparación de 4 algoritmos de búsqueda: BFS, DFS, A* y Hill Climbing</p>
        <button id="ia-refresh-reposicion" class="flex items-center gap-1 rounded-lg bg-primary-container px-3 py-1.5 text-sm font-medium text-on-primary-container hover:opacity-90">
          <span class="material-symbols-outlined text-sm">refresh</span>
          Actualizar
        </button>
      </div>
      <div class="animate-pulse rounded-xl bg-surface-container-lowest p-6 text-center text-on-surface-variant">
        Cargando planes de reposición...
      </div>
    </div>`;
}

async function loadReposicionData(container) {
  try {
    const data = await fetchReposicion(15, 30, 30);
    if (!data) {
      container.innerHTML = `<p class="text-on-surface-variant">No se pudo cargar el plan de reposición.</p>`;
      return;
    }

    const algorithms = [
      { key: "bfs", name: "BFS (Breadth-First Search)", desc: "Búsqueda en anchura – secuencia mínima de reposiciones" },
      { key: "dfs", name: "DFS (Depth-First Search)", desc: "Búsqueda en profundidad – explora todas las combinaciones" },
      { key: "aStar", name: "A* (A-Star)", desc: "Búsqueda heurística – ruta óptima con menor costo" },
      { key: "hillClimbing", name: "Hill Climbing", desc: "Ascensión de colinas – mejora incremental del plan" },
    ];

    let html = `<div class="grid gap-4 md:grid-cols-2">`;
    for (const algo of algorithms) {
      const r = data[algo.key];
      if (!r) continue;
      const pasos = r.pasos || [];
      html += `
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-on-surface">${algo.name}</h4>
            ${badge(`${r.costoTotal?.toFixed(2) ?? 0}`, "primary")}
          </div>
          <p class="text-xs text-on-surface-variant mb-2">${algo.desc}</p>
          <div class="grid grid-cols-3 gap-2 mb-3">
            ${statBox("Costo", r.costoTotal?.toFixed(2) ?? "0", "")}
            ${statBox("Nodos", r.nodosExpandidos ?? "0", "expandidos")}
            ${statBox("Tiempo", `${(r.tiempoMs ?? 0).toFixed(2)}ms`, "")}
          </div>
          ${pasos.length > 0 ? `
            <div class="max-h-40 overflow-y-auto rounded-lg bg-surface-container-higher p-2">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-on-surface-variant">
                    <th class="text-left py-1">#</th>
                    <th class="text-left py-1">Producto</th>
                    <th class="text-right py-1">Cantidad</th>
                    <th class="text-right py-1">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  ${pasos.map(p => `
                    <tr class="border-t border-outline-variant">
                      <td class="py-1">${p.orden}</td>
                      <td class="py-1">${p.nombreProducto}</td>
                      <td class="text-right py-1">${p.cantidad}</td>
                      <td class="text-right py-1">${p.costo?.toFixed(2)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : `<p class="text-xs text-on-surface-variant text-center py-4">No se requieren reposiciones</p>`}
        </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    console.error("Error cargando reposición:", error);
    container.innerHTML = `
      <div class="rounded-xl border border-error-container bg-error-container p-4 text-on-error-container">
        <p>No se pudo cargar el plan de reposición: ${error.message}</p>
      </div>`;
  }
}

// ---------------------------------------------------------------------------
// Tab 3 – Métricas de Modelos
// ---------------------------------------------------------------------------

async function renderMetricasTab() {
  return `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-on-surface-variant">Comparación de métricas entre los 5 modelos de clasificación</p>
        <button id="ia-refresh-metricas" class="flex items-center gap-1 rounded-lg bg-primary-container px-3 py-1.5 text-sm font-medium text-on-primary-container hover:opacity-90">
          <span class="material-symbols-outlined text-sm">refresh</span>
          Actualizar
        </button>
      </div>
      <div class="animate-pulse rounded-xl bg-surface-container-lowest p-6 text-center text-on-surface-variant">
        Cargando métricas de modelos...
      </div>
    </div>`;
}

async function loadMetricasData(container) {
  try {
    const metricas = await fetchComparar();
    if (!metricas || metricas.length === 0) {
      container.innerHTML = `
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">info</span>
          <p class="text-on-surface-variant">No hay datos suficientes para calcular métricas. Registra más ventas para alimentar los modelos.</p>
        </div>`;
      return;
    }

    let html = `
      <div class="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface-container-higher text-on-surface">
              <th class="text-left px-4 py-3">Modelo</th>
              <th class="text-center px-4 py-3">Precisión</th>
              <th class="text-center px-4 py-3">Recall</th>
              <th class="text-center px-4 py-3">F1 Score</th>
              <th class="text-center px-4 py-3">Verdaderos Positivos</th>
              <th class="text-center px-4 py-3">Falsos Positivos</th>
              <th class="text-center px-4 py-3">Falsos Negativos</th>
            </tr>
          </thead>
          <tbody>`;

    for (const m of metricas) {
      const f1Val = m.f1Score ?? 0;
      const f1Color = f1Val >= 0.8 ? "success" : f1Val >= 0.5 ? "warning" : "error";
      html += `
        <tr class="border-t border-outline-variant hover:bg-surface-container-highest">
          <td class="px-4 py-3 font-medium text-on-surface">${m.modelo}</td>
          <td class="text-center px-4 py-3">${m.precision !== undefined ? (m.precision * 100).toFixed(1) + "%" : "N/A"}</td>
          <td class="text-center px-4 py-3">${m.recall !== undefined ? (m.recall * 100).toFixed(1) + "%" : "N/A"}</td>
          <td class="text-center px-4 py-3">
            ${badge(m.f1Score !== undefined ? m.f1Score.toFixed(3) : "N/A", f1Color)}
          </td>
          <td class="text-center px-4 py-3">${m.verdaderosPositivos ?? "N/A"}</td>
          <td class="text-center px-4 py-3">${m.falsosPositivos ?? "N/A"}</td>
          <td class="text-center px-4 py-3">${m.falsosNegativos ?? "N/A"}</td>
        </tr>`;
    }

    html += `
          </tbody>
        </table>
      </div>
      <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <h4 class="font-semibold text-on-surface mb-2">Interpretación</h4>
        <ul class="text-sm text-on-surface-variant space-y-1">
          <li><strong>Precisión:</strong> Proporción de predicciones positivas que son correctas.</li>
          <li><strong>Recall:</strong> Proporción de casos positivos reales que se detectaron.</li>
          <li><strong>F1 Score:</strong> Media armónica de precisión y recall. Mayor es mejor.</li>
          <li><strong>AdaBoost (Ensemble):</strong> Combina múltiples clasificadores débiles para mejorar la precisión general frente a modelos individuales.</li>
        </ul>
      </div>`;

    container.innerHTML = html;
  } catch (error) {
    console.error("Error cargando métricas:", error);
    container.innerHTML = `
      <div class="rounded-xl border border-error-container bg-error-container p-4 text-on-error-container">
        <p>No se pudieron cargar las métricas: ${error.message}</p>
      </div>`;
  }
}

// ---------------------------------------------------------------------------
// Main render function – called by navigation.js
// ---------------------------------------------------------------------------

let currentTab = "riesgo";

const tabRenderers = {
  riesgo: renderRiesgoTab,
  reposicion: renderReposicionTab,
  metricas: renderMetricasTab,
};

const tabLoaders = {
  riesgo: loadRiesgoData,
  reposicion: loadReposicionData,
  metricas: loadMetricasData,
};

export function renderIAModule(moduleView) {
  const header = `
    <section class="flex flex-col gap-space-lg p-margin-lg" aria-labelledby="ia-module-title">
      <header class="flex flex-col gap-2">
        <p class="font-label-md text-label-md font-semibold text-primary">Módulo IA</p>
        <h1 id="ia-module-title" class="font-headline-xl text-headline-xl text-on-surface">Inteligencia Artificial Predictiva</h1>
        <p class="max-w-2xl font-body-md text-body-md text-on-surface-variant">
          Algoritmos de búsqueda, regresión y clasificación para la gestión inteligente del minimarket.
          Los datos provienen directamente del sistema de ventas en tiempo real.
        </p>
      </header>
      ${renderTabs(currentTab)}
      <div id="ia-tab-content" class="min-h-[200px]"></div>
    </section>`;

  moduleView.innerHTML = header;

  // Tab switching
  const tabContent = moduleView.querySelector("#ia-tab-content");
  moduleView.querySelectorAll(".ia-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      currentTab = btn.dataset.tab;
      moduleView.querySelectorAll(".ia-tab").forEach(b => {
        b.classList.remove("bg-primary", "text-on-primary");
        b.classList.add("bg-surface-container-higher", "text-on-surface-variant");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.remove("bg-surface-container-higher", "text-on-surface-variant");
      btn.classList.add("bg-primary", "text-on-primary");
      btn.setAttribute("aria-selected", "true");
      switchTab(tabContent);
    });
  });

  // Initial load
  switchTab(tabContent);
}

async function switchTab(container) {
  const renderer = tabRenderers[currentTab];
  const loader = tabLoaders[currentTab];
  if (!renderer) return;

  container.innerHTML = await renderer();

  // Refresh buttons
  const refreshBtn = container.querySelector(`#ia-refresh-${currentTab}`);
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => switchTab(container));
  }

  // Auto-load data for tabs with loaders
  if (loader) {
    await loader(container);
  }
}
