import { deductInventoryForSale, INVENTORY_STORAGE_KEY } from "./inventory.js";
import { listSales } from "./api.js";

const SALES_STORAGE_KEY = "retail-pulse-sales";
const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Yape", "Plin"];
let latestSalesRequest = 0;

function isValidSale(sale) {
  return (
    sale !== null &&
    typeof sale === "object" &&
    typeof sale.id === "string" &&
    typeof sale.soldAt === "string" &&
    Number.isFinite(Date.parse(sale.soldAt)) &&
    typeof sale.cashier === "string" &&
    typeof sale.terminal === "string" &&
    PAYMENT_METHODS.includes(sale.paymentMethod) &&
    Number.isFinite(sale.total) &&
    sale.total >= 0 &&
    Array.isArray(sale.items) &&
    sale.items.length > 0 &&
    sale.items.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.category === "string" &&
        Number.isFinite(item.price) &&
        item.price >= 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    )
  );
}

export function getSales() {
  const savedSales = localStorage.getItem(SALES_STORAGE_KEY);
  if (savedSales === null) {
    return [];
  }

  let sales;
  try {
    sales = JSON.parse(savedSales);
  } catch (error) {
    throw new Error("El historial de ventas está dañado y no se puede leer.", {
      cause: error,
    });
  }

  if (!Array.isArray(sales) || !sales.every(isValidSale)) {
    throw new Error("El historial de ventas contiene datos inválidos.");
  }

  return sales;
}

export function recordSale(sale) {
  if (!isValidSale(sale)) {
    throw new Error("No se puede registrar una venta con datos inválidos.");
  }

  const sales = getSales();
  sales.push(sale);
  const previousInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
  deductInventoryForSale(sale.items);
  try {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
  } catch (error) {
    try {
      if (previousInventory === null) {
        localStorage.removeItem(INVENTORY_STORAGE_KEY);
      } else {
        localStorage.setItem(INVENTORY_STORAGE_KEY, previousInventory);
      }
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "No se pudo guardar la venta ni restaurar el inventario.",
      );
    }
    throw error;
  }
  window.dispatchEvent(new Event("retail-pulse-sales-updated"));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function formatCurrency(amount) {
  return `S/ ${amount.toFixed(2)}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderSalesError(container, error) {
  console.error("No se pudo cargar el historial de ventas:", error);
  container.innerHTML = `
    <section class="flex flex-col gap-space-lg p-margin-lg" aria-labelledby="module-title">
      <header>
        <p class="font-label-md text-label-md font-semibold text-primary">Retail Pulse</p>
        <h1 id="module-title" class="font-headline-xl text-headline-xl text-on-surface">Ventas &amp; Cajas</h1>
      </header>
      <p class="rounded-xl bg-error-container p-space-lg text-on-error-container" role="alert">
        No se pudo leer el historial de ventas: ${escapeHtml(error.message)}
      </p>
    </section>`;
}

export async function renderSalesModule(container) {
  const requestId = ++latestSalesRequest;
  let sales;
  try {
    sales = (await listSales()).sort(
      (first, second) => Date.parse(second.soldAt) - Date.parse(first.soldAt),
    );
  } catch (error) {
    if (requestId === latestSalesRequest && container.dataset.route === "ventas-cajas") {
      renderSalesError(container, error);
    }
    return;
  }
  if (
    requestId !== latestSalesRequest ||
    container.dataset.route !== "ventas-cajas"
  ) {
    return;
  }

  const today = localDateKey(new Date());
  const todaysSales = sales.filter(
    (sale) => localDateKey(new Date(sale.soldAt)) === today,
  );
  const todaysTotal = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
  const paymentTotals = PAYMENT_METHODS.map((method) => {
    const methodSales = todaysSales.filter(
      (sale) => sale.paymentMethod === method,
    );
    return {
      method,
      count: methodSales.length,
      total: methodSales.reduce((sum, sale) => sum + sale.total, 0),
    };
  });
  const rows = sales.length
    ? sales
        .map((sale) => {
          const items = sale.items
            .map(
              (item) =>
                `${escapeHtml(item.name)} <span class="text-on-surface-variant">× ${item.quantity}</span>`,
            )
            .join(", ");

          return `
            <tr class="border-t border-outline-variant align-top">
              <td class="whitespace-nowrap px-space-md py-space-sm text-on-surface-variant">${escapeHtml(formatDate(sale.soldAt))}</td>
              <td class="whitespace-nowrap px-space-md py-space-sm font-label-md font-semibold">${escapeHtml(sale.cashier)}</td>
              <td class="whitespace-nowrap px-space-md py-space-sm">${escapeHtml(sale.terminal)}</td>
              <td class="min-w-48 px-space-md py-space-sm">${items}</td>
              <td class="whitespace-nowrap px-space-md py-space-sm">${escapeHtml(sale.paymentMethod)}</td>
              <td class="whitespace-nowrap px-space-md py-space-sm text-right font-label-md font-bold">${formatCurrency(sale.total)}</td>
            </tr>`;
        })
        .join("")
    : `
      <tr>
        <td class="px-space-md py-space-lg text-center text-on-surface-variant" colspan="6">
          Aún no hay ventas registradas. Cuando el cajero cobre una venta en el POS, aparecerá aquí.
        </td>
      </tr>`;

  container.innerHTML = `
    <section class="flex flex-col gap-space-lg p-margin-lg" aria-labelledby="module-title">
      <header class="flex flex-col gap-2">
        <p class="font-label-md text-label-md font-semibold text-primary">Operación del punto de venta</p>
        <h1 id="module-title" class="font-headline-xl text-headline-xl text-on-surface">Ventas &amp; Cajas</h1>
        <p class="max-w-2xl font-body-md text-body-md text-on-surface-variant">Ventas guardadas en PostgreSQL desde las terminales conectadas al backend.</p>
      </header>
      <div class="grid gap-space-md sm:grid-cols-3">
        <article class="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <p class="font-label-md text-label-md text-on-surface-variant">Ventas de hoy</p>
          <p class="mt-2 font-headline-lg text-headline-lg font-bold text-on-surface">${todaysSales.length}</p>
        </article>
        <article class="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <p class="font-label-md text-label-md text-on-surface-variant">Recaudación de hoy</p>
          <p class="mt-2 font-headline-lg text-headline-lg font-bold text-primary">${formatCurrency(todaysTotal)}</p>
        </article>
        <article class="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <p class="font-label-md text-label-md text-on-surface-variant">Ventas registradas</p>
          <p class="mt-2 font-headline-lg text-headline-lg font-bold text-on-surface">${sales.length}</p>
        </article>
      </div>
      <section aria-labelledby="payment-totals-title">
        <h2 id="payment-totals-title" class="mb-space-sm font-headline-sm text-headline-sm">Recaudación de hoy por medio de pago</h2>
        <div class="grid gap-space-md sm:grid-cols-2 xl:grid-cols-4">
          ${paymentTotals
            .map(
              ({ method, count, total }) => `
                <article class="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                  <p class="font-label-md text-label-md text-on-surface-variant">${method}</p>
                  <p class="mt-2 font-headline-sm text-headline-sm font-bold text-primary">${formatCurrency(total)}</p>
                  <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">${count} ${count === 1 ? "venta" : "ventas"}</p>
                </article>`,
            )
            .join("")}
        </div>
      </section>
      <section class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm" aria-labelledby="sales-history-title">
        <div class="border-b border-outline-variant p-space-lg">
          <h2 id="sales-history-title" class="font-headline-sm text-headline-sm">Historial de ventas</h2>
          <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">Detalle de productos, cajero, caja, medio de pago e importe.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-left font-body-sm text-body-sm">
            <thead class="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
              <tr>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Fecha y hora</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Cajero</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Caja</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Productos</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Pago</th>
                <th class="px-space-md py-space-sm text-right font-semibold" scope="col">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
      <p class="font-body-sm text-body-sm text-on-surface-variant">Este historial refleja las ventas registradas por el backend. Tarjeta y Yape son métodos declarados manualmente; no se verifican ni procesan pagos digitales.</p>
    </section>`;
}
