export const INVENTORY_STORAGE_KEY = "retail-pulse-inventory";
const RECEIPTS_STORAGE_KEY = "retail-pulse-stock-receipts";

const defaultInventory = [
  { id: "aceite-primor", name: "Aceite Primor Premium 900ml", category: "Abarrotes", price: 10.9, icon: "grocery", stock: 18 },
  { id: "arroz-costeno", name: "Arroz Costeño Extra 1kg", category: "Abarrotes", price: 5.8, icon: "lunch_dining", stock: 24 },
  { id: "galletas-casino", name: "Galletas Casino Menta x6", category: "Abarrotes", price: 3.2, icon: "cookie", stock: 12 },
  { id: "coca-cola", name: "Coca-Cola 500ml", category: "Bebidas", price: 3.5, icon: "local_drink", stock: 20 },
  { id: "leche-gloria", name: "Leche Gloria Entera 400g", category: "Lácteos", price: 3.85, icon: "nutrition", stock: 24 },
  { id: "detergente-ariel", name: "Detergente Ariel Doble Poder 500g", category: "Limpieza", price: 8.5, icon: "soap", stock: 10 },
];

function isInventoryItem(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.category === "string" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.icon === "string" &&
    Number.isInteger(item.stock) &&
    item.stock >= 0
  );
}

function isReceipt(receipt) {
  return (
    receipt !== null &&
    typeof receipt === "object" &&
    typeof receipt.id === "string" &&
    typeof receipt.productId === "string" &&
    typeof receipt.supplier === "string" &&
    Number.isInteger(receipt.quantity) &&
    receipt.quantity > 0 &&
    typeof receipt.lot === "string" &&
    typeof receipt.expiresAt === "string" &&
    Number.isFinite(Date.parse(receipt.expiresAt)) &&
    (receipt.remainingQuantity === undefined ||
      (Number.isInteger(receipt.remainingQuantity) &&
        receipt.remainingQuantity >= 0 &&
        receipt.remainingQuantity <= receipt.quantity)) &&
    typeof receipt.receivedAt === "string" &&
    Number.isFinite(Date.parse(receipt.receivedAt))
  );
}

function readStoredArray(key, validate, label) {
  const storedValue = localStorage.getItem(key);
  if (storedValue === null) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(storedValue);
  } catch (error) {
    throw new Error(`Los datos de ${label} están dañados y no se pueden leer.`, {
      cause: error,
    });
  }

  if (!Array.isArray(parsed) || !parsed.every(validate)) {
    throw new Error(`Los datos de ${label} contienen información inválida.`);
  }

  return parsed;
}

export function getInventory() {
  return readStoredArray(INVENTORY_STORAGE_KEY, isInventoryItem, "inventario") ??
    defaultInventory.map((item) => ({ ...item }));
}

export function getStockReceipts() {
  return readStoredArray(RECEIPTS_STORAGE_KEY, isReceipt, "recepciones") ?? [];
}

function getRemainingQuantity(receipt) {
  return receipt.remainingQuantity ?? receipt.quantity;
}

function localDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntilExpiration(expiresAt, today = new Date()) {
  const [year, month, day] = expiresAt.split("-").map(Number);
  const expirationDate = new Date(year, month - 1, day);
  return Math.floor(
    (expirationDate.getTime() - localDate(today).getTime()) / 86400000,
  );
}

export function calculateInventoryAlerts(inventory, receipts, today = new Date()) {
  const alerts = inventory
    .filter((product) => product.stock <= 10)
    .map((product) => ({
      id: `stock-${product.id}`,
      type: "stock",
      severity: product.stock === 0 ? "critical" : "warning",
      productName: product.name,
      quantity: product.stock,
      message:
        product.stock === 0
          ? "Producto agotado"
          : `Quedan ${product.stock} unidades; se recomienda reponer`,
    }));

  receipts.forEach((receipt) => {
    const remainingQuantity = getRemainingQuantity(receipt);
    if (remainingQuantity === 0) {
      return;
    }

    const product = inventory.find((item) => item.id === receipt.productId);
    const daysLeft = daysUntilExpiration(receipt.expiresAt, today);
    if (daysLeft < 0) {
      alerts.push({
        id: `expired-${receipt.id}`,
        type: "expiration",
        severity: "critical",
        productName: product?.name ?? "Producto",
        quantity: remainingQuantity,
        lot: receipt.lot,
        expiresAt: receipt.expiresAt,
        message: `Lote vencido hace ${Math.abs(daysLeft)} días`,
      });
    } else if (daysLeft <= 30) {
      alerts.push({
        id: `expiring-${receipt.id}`,
        type: "expiration",
        severity: daysLeft <= 7 ? "critical" : "warning",
        productName: product?.name ?? "Producto",
        quantity: remainingQuantity,
        lot: receipt.lot,
        expiresAt: receipt.expiresAt,
        message:
          daysLeft === 0
            ? "El lote vence hoy"
            : `El lote vence en ${daysLeft} días`,
      });
    }
  });

  return alerts.sort((first, second) => {
    const severityOrder = { critical: 0, warning: 1 };
    return severityOrder[first.severity] - severityOrder[second.severity];
  });
}

function saveInventory(inventory) {
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  window.dispatchEvent(new Event("retail-pulse-inventory-updated"));
}

export function registerStockReceipt({
  productId,
  supplier,
  quantity,
  lot,
  expiresAt,
}) {
  const cleanSupplier = supplier.trim();
  const cleanLot = lot.trim();
  const expirationDate = new Date(`${expiresAt}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Ingresa una cantidad entera mayor que cero.");
  }
  if (!cleanSupplier) {
    throw new Error("Ingresa el nombre del proveedor.");
  }
  if (!cleanLot) {
    throw new Error("Ingresa el número de lote.");
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ||
    Number.isNaN(expirationDate.getTime()) ||
    expirationDate.toISOString().slice(0, 10) !== expiresAt ||
    expirationDate < today
  ) {
    throw new Error("Ingresa una fecha de vencimiento válida que no haya pasado.");
  }

  const inventory = getInventory();
  const product = inventory.find((item) => item.id === productId);
  if (!product) {
    throw new Error("El producto seleccionado ya no existe en el inventario.");
  }

  const receipts = getStockReceipts();
  const receipt = {
    id: `R-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId,
    supplier: cleanSupplier,
    quantity,
    remainingQuantity: quantity,
    lot: cleanLot,
    expiresAt,
    receivedAt: new Date().toISOString(),
  };
  const updatedInventory = inventory.map((item) =>
    item.id === productId ? { ...item, stock: item.stock + quantity } : item,
  );
  const previousInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
  const previousReceipts = localStorage.getItem(RECEIPTS_STORAGE_KEY);

  try {
    localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify([...receipts, receipt]));
    saveInventory(updatedInventory);
    window.dispatchEvent(new Event("retail-pulse-stock-receipts-updated"));
  } catch (error) {
    if (previousReceipts === null) {
      localStorage.removeItem(RECEIPTS_STORAGE_KEY);
    } else {
      localStorage.setItem(RECEIPTS_STORAGE_KEY, previousReceipts);
    }
    if (previousInventory === null) {
      localStorage.removeItem(INVENTORY_STORAGE_KEY);
    } else {
      localStorage.setItem(INVENTORY_STORAGE_KEY, previousInventory);
    }
    throw error;
  }

  return receipt;
}

export function deductInventoryForSale(items) {
  const inventory = getInventory();
  const quantitiesByProduct = new Map();
  items.forEach((item) => {
    quantitiesByProduct.set(
      item.id,
      (quantitiesByProduct.get(item.id) ?? 0) + item.quantity,
    );
  });

  quantitiesByProduct.forEach((quantity, productId) => {
    const product = inventory.find((item) => item.id === productId);
    if (!product || product.stock < quantity) {
      throw new Error(
        `No hay stock suficiente de ${product?.name ?? productId}. Actualiza el inventario e inténtalo de nuevo.`,
      );
    }
  });

  const updatedInventory = inventory.map((item) => {
    const soldQuantity = quantitiesByProduct.get(item.id) ?? 0;
    return soldQuantity > 0
      ? { ...item, stock: item.stock - soldQuantity }
      : item;
  });
  const receipts = getStockReceipts();
  const updatedReceipts = receipts.map((receipt) => ({ ...receipt }));
  const receiptsByProduct = new Map();
  updatedReceipts.forEach((receipt, index) => {
    const productReceipts = receiptsByProduct.get(receipt.productId) ?? [];
    productReceipts.push(index);
    receiptsByProduct.set(receipt.productId, productReceipts);
  });

  quantitiesByProduct.forEach((quantity, productId) => {
    let remainingToDeduct = quantity;
    const receiptIndexes = receiptsByProduct.get(productId) ?? [];
    receiptIndexes.sort(
      (first, second) =>
        Date.parse(updatedReceipts[first].receivedAt) -
        Date.parse(updatedReceipts[second].receivedAt),
    );

    receiptIndexes.forEach((index) => {
      if (remainingToDeduct === 0) {
        return;
      }

      const receipt = updatedReceipts[index];
      const receiptRemaining = getRemainingQuantity(receipt);
      const deducted = Math.min(receiptRemaining, remainingToDeduct);
      receipt.remainingQuantity = receiptRemaining - deducted;
      remainingToDeduct -= deducted;
    });
  });

  const previousInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
  const previousReceipts = localStorage.getItem(RECEIPTS_STORAGE_KEY);
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(updatedInventory));
    if (receipts.length > 0) {
      localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(updatedReceipts));
    }
  } catch (error) {
    if (previousInventory === null) {
      localStorage.removeItem(INVENTORY_STORAGE_KEY);
    } else {
      localStorage.setItem(INVENTORY_STORAGE_KEY, previousInventory);
    }
    if (previousReceipts === null) {
      localStorage.removeItem(RECEIPTS_STORAGE_KEY);
    } else {
      localStorage.setItem(RECEIPTS_STORAGE_KEY, previousReceipts);
    }
    throw error;
  }
  window.dispatchEvent(new Event("retail-pulse-inventory-updated"));
  if (receipts.length > 0) {
    window.dispatchEvent(new Event("retail-pulse-stock-receipts-updated"));
  }
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

function formatDate(date) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(
    new Date(`${date}T00:00:00`),
  );
}

export function renderInventoryModule(container) {
  let inventory;
  let receipts;
  try {
    inventory = getInventory();
    receipts = getStockReceipts().sort(
      (first, second) => Date.parse(second.receivedAt) - Date.parse(first.receivedAt),
    );
  } catch (error) {
    console.error("No se pudo cargar el inventario:", error);
    container.innerHTML = `
      <section class="flex flex-col gap-space-lg p-margin-lg" aria-labelledby="module-title">
        <header>
          <p class="font-label-md text-label-md font-semibold text-primary">Retail Pulse</p>
          <h1 id="module-title" class="font-headline-xl text-headline-xl text-on-surface">Inventario &amp; Almacén</h1>
        </header>
        <p class="rounded-xl bg-error-container p-space-lg text-on-error-container" role="alert">
          No se pudo cargar el inventario: ${escapeHtml(error.message)}
        </p>
      </section>`;
    return;
  }

  export function renderPredictiveAlertsModule(container) {
    let alerts;
    try {
      alerts = calculateInventoryAlerts(getInventory(), getStockReceipts());
    } catch (error) {
      console.error("No se pudieron calcular las alertas de inventario:", error);
      container.innerHTML = `
        <section class="flex flex-col gap-space-lg p-margin-lg" aria-labelledby="module-title">
          <header>
            <p class="font-label-md text-label-md font-semibold text-primary">Retail Pulse</p>
            <h1 id="module-title" class="font-headline-xl text-headline-xl text-on-surface">Alertas Predictivas</h1>
          </header>
          <p class="rounded-xl bg-error-container p-space-lg text-on-error-container" role="alert">
            No se pudieron calcular las alertas: ${escapeHtml(error.message)}
          </p>
        </section>`;
      return;
    }

    const criticalCount = alerts.filter(
      (alert) => alert.severity === "critical",
    ).length;
    const warningCount = alerts.length - criticalCount;
    const alertCards = alerts.length
      ? alerts
          .map((alert) => {
            const isCritical = alert.severity === "critical";
            const details =
              alert.type === "expiration"
                ? `Lote ${escapeHtml(alert.lot)} · ${alert.quantity} unidades · vence ${escapeHtml(formatDate(alert.expiresAt))}`
                : `${alert.quantity} unidades disponibles`;

            return `
              <article class="flex gap-space-md rounded-xl border ${isCritical ? "border-error bg-error-container text-on-error-container" : "border-outline-variant bg-surface-container-lowest text-on-surface"} p-space-lg shadow-sm">
                <span class="material-symbols-outlined mt-0.5 text-[24px]">${alert.type === "expiration" ? "event_busy" : "inventory_2"}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center justify-between gap-space-xs">
                    <h2 class="font-headline-sm text-headline-sm">${escapeHtml(alert.productName)}</h2>
                    <span class="rounded-full ${isCritical ? "bg-error text-on-error" : "bg-secondary-container text-on-secondary-container"} px-space-sm py-1 font-label-sm text-label-sm font-bold">${isCritical ? "Urgente" : "Atención"}</span>
                  </div>
                  <p class="mt-1 font-label-md text-label-md font-semibold">${escapeHtml(alert.message)}</p>
                  <p class="mt-1 font-body-sm text-body-sm">${details}</p>
                </div>
              </article>`;
          })
          .join("")
      : `
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg text-center shadow-sm">
          <span class="material-symbols-outlined text-[36px] text-tertiary">task_alt</span>
          <h2 class="mt-2 font-headline-sm text-headline-sm">Todo en orden</h2>
          <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">No hay productos con stock bajo ni lotes próximos a vencer.</p>
        </div>`;

    container.innerHTML = `
      <section class="flex flex-col gap-space-lg p-margin-lg" aria-labelledby="module-title">
        <header class="flex flex-col gap-2">
          <p class="font-label-md text-label-md font-semibold text-primary">Seguimiento de inventario</p>
          <h1 id="module-title" class="font-headline-xl text-headline-xl text-on-surface">Alertas Predictivas</h1>
          <p class="max-w-2xl font-body-md text-body-md text-on-surface-variant">Avisos calculados a partir del stock actual y los lotes recibidos. Se alerta por stock de 10 unidades o menos y por lotes que vencen dentro de 30 días o ya vencieron.</p>
        </header>
        <div class="grid gap-space-md sm:grid-cols-3">
          <article class="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <p class="font-label-md text-label-md text-on-surface-variant">Alertas activas</p>
            <p class="mt-2 font-headline-lg text-headline-lg font-bold text-on-surface">${alerts.length}</p>
          </article>
          <article class="rounded-xl bg-error-container p-space-lg text-on-error-container shadow-sm">
            <p class="font-label-md text-label-md">Urgentes</p>
            <p class="mt-2 font-headline-lg text-headline-lg font-bold">${criticalCount}</p>
          </article>
          <article class="rounded-xl bg-secondary-container p-space-lg text-on-secondary-container shadow-sm">
            <p class="font-label-md text-label-md">Atención</p>
            <p class="mt-2 font-headline-lg text-headline-lg font-bold">${warningCount}</p>
          </article>
        </div>
        <div class="grid gap-space-md xl:grid-cols-2">${alertCards}</div>
        <p class="font-body-sm text-body-sm text-on-surface-variant">Las alertas se actualizan al registrar ventas o recepciones de lotes. Los vencimientos se calculan por fecha calendario local.</p>
      </section>`;
  }

  const inventoryRows = inventory
    .map(
      (product) => `
        <tr class="border-t border-outline-variant align-top">
          <th class="px-space-md py-space-sm text-left font-label-md font-semibold" scope="row">
            ${escapeHtml(product.name)}
            <span class="mt-1 block font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(product.category)}</span>
          </th>
          <td class="whitespace-nowrap px-space-md py-space-sm font-headline-sm font-bold">${product.stock} unidades</td>
          <td class="px-space-md py-space-sm">
            <button class="rounded-lg bg-primary px-space-md py-2 font-label-sm text-label-sm font-semibold text-on-primary" data-open-receipt="${escapeHtml(product.id)}" type="button">
              Registrar ingreso
            </button>
          </td>
        </tr>`,
    )
    .join("");
  const receiptRows = receipts.length
    ? receipts
        .map((receipt) => {
          const product = inventory.find((item) => item.id === receipt.productId);
          return `
            <tr class="border-t border-outline-variant align-top">
              <td class="px-space-md py-space-sm">${escapeHtml(product?.name ?? "Producto")}</td>
              <td class="px-space-md py-space-sm">${receipt.quantity}</td>
              <td class="px-space-md py-space-sm">${escapeHtml(receipt.lot)}</td>
              <td class="px-space-md py-space-sm">${escapeHtml(receipt.supplier)}</td>
              <td class="px-space-md py-space-sm">${escapeHtml(formatDate(receipt.expiresAt))}</td>
              <td class="px-space-md py-space-sm">${escapeHtml(formatDate(receipt.receivedAt.slice(0, 10)))}</td>
            </tr>`;
        })
        .join("")
    : `
      <tr>
        <td class="px-space-md py-space-lg text-center text-on-surface-variant" colspan="6">
          Aún no hay lotes recibidos. Registra un ingreso para actualizar el inventario.
        </td>
      </tr>`;

  container.innerHTML = `
    <section class="flex flex-col gap-space-lg p-margin-lg" aria-labelledby="module-title">
      <header class="flex flex-col gap-2">
        <p class="font-label-md text-label-md font-semibold text-primary">Productos y recepción de proveedores</p>
        <h1 id="module-title" class="font-headline-xl text-headline-xl text-on-surface">Inventario &amp; Almacén</h1>
        <p class="max-w-2xl font-body-md text-body-md text-on-surface-variant">Registra cada lote recibido para sumar unidades al producto y conservar su proveedor, lote y vencimiento.</p>
      </header>
      <section class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm" aria-labelledby="inventory-products-title">
        <div class="border-b border-outline-variant p-space-lg">
          <h2 id="inventory-products-title" class="font-headline-sm text-headline-sm">Productos</h2>
          <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">Selecciona un producto para confirmar la recepción de un lote.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[650px] text-left font-body-sm text-body-sm">
            <thead class="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
              <tr><th class="px-space-md py-space-sm font-semibold" scope="col">Producto</th><th class="px-space-md py-space-sm font-semibold" scope="col">Stock actual</th><th class="px-space-md py-space-sm font-semibold" scope="col">Acción</th></tr>
            </thead>
            <tbody>${inventoryRows}</tbody>
          </table>
        </div>
      </section>
      <div id="receipt-form-mount"></div>
      <section class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm" aria-labelledby="receipts-title">
        <div class="border-b border-outline-variant p-space-lg">
          <h2 id="receipts-title" class="font-headline-sm text-headline-sm">Lotes recibidos</h2>
          <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">Trazabilidad de los ingresos confirmados.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[850px] text-left font-body-sm text-body-sm">
            <thead class="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant">
              <tr>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Producto</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Cantidad</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Lote</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Proveedor</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Vencimiento</th>
                <th class="px-space-md py-space-sm font-semibold" scope="col">Recepción</th>
              </tr>
            </thead>
            <tbody>${receiptRows}</tbody>
          </table>
        </div>
      </section>
      <p class="font-body-sm text-body-sm text-on-surface-variant">Modo demostración: inventario y lotes se guardan en este navegador; no se sincronizan con un servidor.</p>
    </section>`;

  const formMount = container.querySelector("#receipt-form-mount");
  container.querySelectorAll("[data-open-receipt]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = inventory.find((item) => item.id === button.dataset.openReceipt);
      if (!product) {
        return;
      }

      formMount.innerHTML = `
        <section class="rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg shadow-sm" aria-labelledby="receipt-form-title">
          <h2 id="receipt-form-title" class="font-headline-sm text-headline-sm">Recibir lote: ${escapeHtml(product.name)}</h2>
          <p class="mt-1 font-body-sm text-body-sm text-on-surface-variant">Completa cantidad, proveedor, lote y fecha de vencimiento antes de confirmar.</p>
          <form class="mt-space-md grid gap-space-md sm:grid-cols-2" id="stock-receipt-form" novalidate>
            <label class="flex flex-col gap-1 font-label-sm text-label-sm font-semibold">Cantidad recibida
              <input class="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm font-body-md text-body-md" name="quantity" min="1" step="1" type="number" required />
            </label>
            <label class="flex flex-col gap-1 font-label-sm text-label-sm font-semibold">Proveedor
              <input class="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm font-body-md text-body-md" name="supplier" maxlength="100" type="text" required />
            </label>
            <label class="flex flex-col gap-1 font-label-sm text-label-sm font-semibold">Número de lote
              <input class="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm font-body-md text-body-md" name="lot" maxlength="60" type="text" required />
            </label>
            <label class="flex flex-col gap-1 font-label-sm text-label-sm font-semibold">Fecha de vencimiento
              <input class="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm font-body-md text-body-md" name="expiresAt" type="date" required />
            </label>
            <p class="hidden rounded-lg bg-error-container p-space-sm text-on-error-container sm:col-span-2" id="receipt-form-error" role="alert"></p>
            <div class="flex flex-wrap gap-space-sm sm:col-span-2">
              <button class="rounded-lg bg-primary px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary" type="submit">Confirmar recepción</button>
              <button class="rounded-lg bg-surface-container-low px-space-md py-2 font-label-md text-label-md font-semibold text-on-surface" data-cancel-receipt type="button">Cancelar</button>
            </div>
          </form>
        </section>`;

      const form = formMount.querySelector("#stock-receipt-form");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = new FormData(form);
        const error = form.querySelector("#receipt-form-error");
        try {
          const receipt = registerStockReceipt({
            productId: product.id,
            quantity: Number(values.get("quantity")),
            supplier: String(values.get("supplier") ?? ""),
            lot: String(values.get("lot") ?? ""),
            expiresAt: String(values.get("expiresAt") ?? ""),
          });
          renderInventoryModule(container);
          const status = document.createElement("p");
          status.className = "rounded-lg bg-tertiary-container p-space-md text-on-tertiary-container";
          status.setAttribute("role", "status");
          status.textContent = `Recepción confirmada: ${receipt.quantity} unidades de ${product.name}, lote ${receipt.lot}.`;
          container.querySelector("section[aria-labelledby='module-title']")?.prepend(status);
        } catch (receiptError) {
          console.error("No se pudo confirmar la recepción del lote:", receiptError);
          error.textContent = receiptError.message;
          error.classList.remove("hidden");
        }
      });
      form.querySelector("[data-cancel-receipt]").addEventListener("click", () => {
        formMount.replaceChildren();
      });
    });
  });
}
