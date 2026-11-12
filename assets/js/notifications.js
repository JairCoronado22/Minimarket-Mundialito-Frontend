import {
  calculateInventoryAlerts,
  getInventory,
  getStockReceipts,
} from "./inventory.js";

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

function getAlertSummary(alert) {
  if (alert.type === "expiration") {
    return `${alert.productName}: ${alert.message.toLowerCase()}`;
  }

  return alert.quantity === 0
    ? `${alert.productName}: producto agotado`
    : `${alert.productName}: quedan ${alert.quantity} unidades`;
}

export function initInventoryNotifications() {
  const toggleButtons = Array.from(
    document.querySelectorAll("[data-inventory-alert-toggle]"),
  );
  if (toggleButtons.length === 0) {
    return;
  }

  const widget = document.createElement("aside");
  widget.className = "inventory-notification-widget";
  widget.hidden = true;
  widget.innerHTML = `
    <button class="inventory-notification-summary" type="button" aria-expanded="false" aria-controls="inventory-notification-list">
      <span class="material-symbols-outlined inventory-notification-widget-icon" aria-hidden="true">notifications_active</span>
      <span class="inventory-notification-summary-text" aria-live="polite"></span>
      <span class="inventory-notification-count"></span>
    </button>
    <div class="inventory-notification-list" id="inventory-notification-list" role="region" aria-label="Alertas de inventario" hidden></div>`;
  document.body.append(widget);

  const summaryButton = widget.querySelector(".inventory-notification-summary");
  const summaryText = widget.querySelector(".inventory-notification-summary-text");
  const countElement = widget.querySelector(".inventory-notification-count");
  const alertList = widget.querySelector(".inventory-notification-list");

  function toggleList() {
    const isExpanded = alertList.hidden;
    alertList.hidden = !isExpanded;
    summaryButton.setAttribute("aria-expanded", String(isExpanded));
    toggleButtons.forEach((button) =>
      button.setAttribute("aria-expanded", String(isExpanded)),
    );
  }

  summaryButton.addEventListener("click", toggleList);
  toggleButtons.forEach((button) => {
    button.addEventListener("click", toggleList);
  });

  function updateNotifications() {
    try {
      const alerts = calculateInventoryAlerts(getInventory(), getStockReceipts());
      const firstAlert = alerts[0];
      widget.hidden = alerts.length === 0;
      if (!firstAlert) {
        alertList.hidden = true;
        summaryButton.setAttribute("aria-expanded", "false");
        toggleButtons.forEach((button) => {
          button.disabled = true;
          button.setAttribute("aria-expanded", "false");
          button.setAttribute("aria-label", "Sin alertas de inventario");
          button.classList.remove("inventory-has-alerts");
          const icon = button.querySelector(".inventory-notification-icon");
          icon?.classList.remove("inventory-bell-ringing");
          const indicator = button.querySelector(
            ".inventory-notification-indicator",
          );
          if (indicator) indicator.hidden = true;
        });
        return;
      }

      const isCritical = firstAlert.severity === "critical";
      summaryButton.classList.toggle("inventory-critical-alert", isCritical);
      summaryText.textContent = getAlertSummary(firstAlert);
      countElement.textContent = String(alerts.length);
      countElement.setAttribute(
        "aria-label",
        `${alerts.length} alertas activas`,
      );
      alertList.innerHTML = alerts
        .map((alert) => {
          const detail =
            alert.type === "expiration"
              ? `Lote ${alert.lot} · ${alert.quantity} unidades · vence ${new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(`${alert.expiresAt}T00:00:00`))}`
              : `${alert.quantity} unidades disponibles`;
          return `
            <article class="inventory-notification-item ${alert.severity === "critical" ? "is-critical" : ""}">
              <span class="material-symbols-outlined" aria-hidden="true">${alert.type === "expiration" ? "event_busy" : "inventory_2"}</span>
              <span class="inventory-notification-item-copy">
                <strong>${escapeHtml(alert.productName)}</strong>
                <span>${escapeHtml(alert.message)} · ${escapeHtml(detail)}</span>
              </span>
              <span class="inventory-notification-severity">${alert.severity === "critical" ? "Urgente" : "Atención"}</span>
            </article>`;
        })
        .join("");

      toggleButtons.forEach((button) => {
        button.disabled = false;
        button.setAttribute(
          "aria-label",
          `${alerts.length} alertas de inventario activas. ${getAlertSummary(firstAlert)}`,
        );
        button.classList.add("inventory-has-alerts");
        const icon = button.querySelector(".inventory-notification-icon");
        icon?.classList.add("inventory-bell-ringing");
        const indicator = button.querySelector(
          ".inventory-notification-indicator",
        );
        if (indicator) {
          indicator.hidden = false;
          indicator.textContent =
            alerts.length > 99 ? "99+" : String(alerts.length);
          indicator.classList.remove("h-2.5", "w-2.5");
          indicator.classList.add(
            "flex",
            "min-w-4",
            "h-4",
            "items-center",
            "justify-center",
            "px-1",
            "text-[9px]",
            "font-bold",
            "text-white",
          );
        }
      });
    } catch (error) {
      console.error("No se pudieron actualizar las notificaciones:", error);
      widget.hidden = false;
      summaryText.textContent = "No se pudieron cargar las alertas de inventario.";
      countElement.textContent = "!";
      alertList.hidden = true;
      toggleButtons.forEach((button) => {
        button.disabled = false;
        button.setAttribute(
          "aria-label",
          "Error al cargar las alertas de inventario",
        );
      });
    }
  }

  window.addEventListener("retail-pulse-inventory-updated", updateNotifications);
  window.addEventListener(
    "retail-pulse-stock-receipts-updated",
    updateNotifications,
  );
  window.addEventListener("retail-pulse-sales-updated", updateNotifications);
  window.addEventListener("storage", (event) => {
    if (
      event.key === "retail-pulse-inventory" ||
      event.key === "retail-pulse-stock-receipts"
    ) {
      updateNotifications();
    }
  });
  updateNotifications();
}
