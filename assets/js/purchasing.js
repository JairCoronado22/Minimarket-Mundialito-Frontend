export function initPurchasingModule() {
  const suggestions = document.querySelector("#restock-suggestions-mount");
  const selectAll = suggestions?.querySelector("#selectAllCheckbox");
  const detailsToggle = suggestions?.querySelector("[data-table-details-toggle]");
  const suggestionTable = suggestions?.querySelector(".suggestion-table");
  const tableBody = suggestionTable?.tBodies[0];
  const providerFilter = suggestions?.querySelector("select");
  const searchField = document.querySelector(
    '#topbar-mount input[type="search"]',
  );
  let noticeTimer;

  function announce(message) {
    let notice = document.querySelector("#purchasing-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "purchasing-notice";
      notice.className =
        "fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg bg-on-surface px-4 py-3 text-sm text-surface shadow-lg";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      document.body.append(notice);
    }

    notice.textContent = message;
    notice.classList.remove("hidden");
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => notice.classList.add("hidden"), 4000);
  }

  function visibleRows() {
    return Array.from(tableBody?.querySelectorAll("tr") ?? []).filter(
      (row) => !row.hidden,
    );
  }

  function filterRows() {
    if (!tableBody) {
      return;
    }

    const provider = providerFilter?.value ?? "";
    const query = searchField?.value.trim().toLocaleLowerCase("es") ?? "";

    tableBody.querySelectorAll("tr").forEach((row) => {
      if (row.dataset.dismissed === "true") {
        row.hidden = true;
        return;
      }

      const providerMatches =
        !provider ||
        provider === "Todos los Proveedores" ||
        (row.cells[4]?.textContent ?? "").includes(provider);
      const searchMatches =
        !query || row.textContent?.toLocaleLowerCase("es").includes(query);
      row.hidden = !providerMatches || !searchMatches;
    });

    const rows = visibleRows();
    if (selectAll) {
      selectAll.checked =
        rows.length > 0 &&
        rows.every(
          (row) =>
            row.querySelector('input[type="checkbox"]')?.checked === true,
        );
    }
  }

  if (selectAll) {
    selectAll.addEventListener("change", (event) => {
      if (!(event.target instanceof HTMLInputElement)) {
        return;
      }

      visibleRows().forEach((row) => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = event.target.checked;
        }
      });
    });
  }

  providerFilter?.addEventListener("change", filterRows);
  searchField?.addEventListener("input", filterRows);

  if (detailsToggle && suggestionTable) {
    detailsToggle.addEventListener("click", () => {
      const isExpanded = suggestionTable.classList.toggle("show-details");
      detailsToggle.setAttribute("aria-expanded", String(isExpanded));
      const label = detailsToggle.querySelector("span:last-child");
      if (label) {
        label.textContent = isExpanded ? "Menos datos" : "Más datos";
      }
      detailsToggle.dataset.purchasingHandled = "true";
    });
  }

  suggestions?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    if (button.title === "Refrescar algoritmo con ventas POS") {
      button.dataset.purchasingHandled = "true";
      announce("La actualización requiere conexión con el sistema POS.");
      return;
    }

    if (button.textContent?.includes("Aprobar Seleccionados")) {
      button.dataset.purchasingHandled = "true";
      const selectedRows = visibleRows().filter(
        (row) => row.querySelector('input[type="checkbox"]')?.checked,
      );

      if (selectedRows.length === 0) {
        announce("Selecciona al menos un producto para aprobar.");
        return;
      }

      selectedRows.forEach((row) => {
        row.dataset.inDraft = "true";
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = false;
        }
      });
      if (selectAll) {
        selectAll.checked = false;
      }
      announce(
        `${selectedRows.length} sugerencia(s) agregada(s) al borrador de compra.`,
      );
      return;
    }

    const row = button.closest("tr");
    if (row && button.textContent?.trim() === "+") {
      button.dataset.purchasingHandled = "true";
      const quantity = button
        .closest("td")
        ?.querySelector('input[type="text"]');
      if (quantity instanceof HTMLInputElement) {
        const current = Number(quantity.value);
        quantity.value = String((Number.isFinite(current) ? current : 0) + 1);
      }
      return;
    }

    if (row && button.textContent?.trim() === "-") {
      button.dataset.purchasingHandled = "true";
      const quantity = button
        .closest("td")
        ?.querySelector('input[type="text"]');
      if (quantity instanceof HTMLInputElement) {
        const current = Number(quantity.value);
        quantity.value = String(
          Math.max(0, (Number.isFinite(current) ? current : 0) - 1),
        );
      }
      return;
    }

    if (row && /Aprobado|Sumado a la orden/.test(button.title)) {
      button.dataset.purchasingHandled = "true";
      row.dataset.inDraft = row.dataset.inDraft === "true" ? "false" : "true";
      announce(
        row.dataset.inDraft === "true"
          ? "Producto agregado al borrador de compra."
          : "Producto retirado del borrador de compra.",
      );
      return;
    }

    if (row && /Pausar|Descartar/.test(button.title)) {
      button.dataset.purchasingHandled = "true";
      row.dataset.dismissed = "true";
      row.hidden = true;
      filterRows();
      announce("La sugerencia se ocultó de esta vista.");
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest("button");
    if (
      !button ||
      !button.closest("#purchasing-overview-mount, #restock-suggestions-mount") ||
      button.dataset.purchasingHandled === "true" ||
      button.hasAttribute("aria-current")
    ) {
      return;
    }

    const label = button.textContent?.replace(/\s+/g, " ").trim();
    announce(
      label
        ? `${label}: esta acción aún no está conectada en esta demo.`
        : "Esta acción aún no está conectada en esta demo.",
    );
  });

  filterRows();
}
