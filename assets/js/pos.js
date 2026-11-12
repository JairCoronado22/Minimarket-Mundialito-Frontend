import {
  ApiError,
  createSale,
  findProductByBarcode,
  listProducts,
} from "./api.js";
import { initInventoryNotifications } from "./notifications.js";

if (sessionStorage.getItem("retail-pulse-role") !== "cajero") {
  window.location.replace("login.html");
} else {
  let products = [];
  let isLoadingProducts = true;
  let isCharging = false;
  const cart = new Map();
  const productGrid = document.querySelector("#productGrid");
  const cartItems = document.querySelector("#cartItems");
  const emptyCart = document.querySelector("#emptyCart");
  const cartSubtotal = document.querySelector("#cartSubtotal");
  const cartTotal = document.querySelector("#cartTotal");
  const chargeButton = document.querySelector("#chargeButton");
  const saleStatus = document.querySelector("#saleStatus");
  const productSearch = document.querySelector("#productSearch");
  const scanProductSelect = document.querySelector("#scanProductSelect");
  const simulateScanButton = document.querySelector("#simulateScanButton");
  const barcodeForm = document.querySelector("#barcodeForm");
  const barcodeInput = document.querySelector("#barcodeInput");
  const paymentMethods = document.querySelector("#paymentMethods");
  let selectedPaymentMethod = "Efectivo";
  let selectedCategory = "Todos";

  function formatCurrency(amount) {
    return `S/ ${amount.toFixed(2)}`;
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

  function renderScanProducts() {
    const selectedId = scanProductSelect.value;
    scanProductSelect.replaceChildren(
      ...products.map((product) => {
        const quantityInCart = cart.get(product.id)?.quantity ?? 0;
        const availableQuantity = Math.max(0, product.stock - quantityInCart);
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent =
          availableQuantity === 0
            ? `${product.name} · Sin unidades disponibles`
            : `${product.name} · ${availableQuantity} disponibles`;
        option.disabled = availableQuantity === 0;
        return option;
      }),
    );

    if (
      products.some(
        (product) =>
          product.id === selectedId &&
          product.stock - (cart.get(product.id)?.quantity ?? 0) > 0,
      )
    ) {
      scanProductSelect.value = selectedId;
    }
    simulateScanButton.disabled = !products.some(
      (product) => product.stock - (cart.get(product.id)?.quantity ?? 0) > 0,
    );
  }

  function renderProducts() {
    if (isLoadingProducts) {
      productGrid.innerHTML =
        '<p class="col-span-full rounded-xl bg-surface-container-lowest p-space-lg text-center text-on-surface-variant">Cargando productos desde la base de datos...</p>';
      return;
    }

    const query = productSearch.value.trim().toLocaleLowerCase("es");
    const filteredProducts = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "Todos" || product.category === selectedCategory;
      const matchesQuery =
        !query || product.name.toLocaleLowerCase("es").includes(query);
      return matchesCategory && matchesQuery;
    });

    productGrid.innerHTML = filteredProducts.length
      ? filteredProducts
          .map(
            (product) => `
              <article class="flex flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                <div class="mb-space-md flex h-24 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                  <span class="material-symbols-outlined text-[40px]">${product.icon}</span>
                </div>
                <span class="font-label-sm text-label-sm text-on-surface-variant">${escapeHtml(product.category)}</span>
                <h2 class="mt-1 min-h-10 font-label-lg text-label-lg text-on-surface">${escapeHtml(product.name)}</h2>
                <div class="mt-space-md flex items-center justify-between gap-space-xs">
                  <span class="font-headline-sm text-headline-sm font-bold">${formatCurrency(product.price)}</span>
                  <button class="rounded-lg bg-primary px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50" data-add-product="${product.id}" ${product.stock === 0 ? "disabled" : ""} type="button">${product.stock === 0 ? "Sin stock" : "Agregar"}</button>
                </div>
              </article>`,
          )
          .join("")
      : '<p class="col-span-full rounded-xl bg-surface-container-lowest p-space-lg text-center text-on-surface-variant">No encontramos productos con esa búsqueda.</p>';
  }

  function addProductToCart(product, source = "manual") {
    const current = cart.get(product.id);
    const quantity = current?.quantity ?? 0;
    if (quantity >= product.stock) {
      saleStatus.textContent = `No hay más stock disponible de ${product.name}.`;
      return;
    }

    cart.set(product.id, { product, quantity: quantity + 1 });
    saleStatus.textContent =
      source === "scan"
        ? `${product.name} escaneado y agregado a la venta.`
        : `${product.name} agregado a la venta.`;
    renderCart();
  }

  function renderCart() {
    const entries = Array.from(cart.values());
    const total = entries.reduce(
      (sum, { product, quantity }) => sum + product.price * quantity,
      0,
    );

    cartItems.innerHTML = entries
      .map(
        ({ product, quantity }) => `
          <li class="flex items-center justify-between gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
            <div class="min-w-0">
              <p class="truncate font-label-md text-label-md font-semibold">${escapeHtml(product.name)}</p>
              <p class="font-body-sm text-body-sm text-on-surface-variant">${formatCurrency(product.price)} c/u</p>
            </div>
            <div class="flex shrink-0 items-center gap-space-xs">
              <button aria-label="Quitar una unidad de ${escapeHtml(product.name)}" class="flex h-8 w-8 items-center justify-center rounded bg-surface-container-lowest" data-cart-action="decrease" data-product-id="${product.id}" type="button">−</button>
              <span class="min-w-5 text-center font-label-md text-label-md">${quantity}</span>
              <button aria-label="Agregar una unidad de ${escapeHtml(product.name)}" class="flex h-8 w-8 items-center justify-center rounded bg-surface-container-lowest" data-cart-action="increase" data-product-id="${product.id}" type="button">+</button>
            </div>
          </li>`,
      )
      .join("");

    emptyCart.classList.toggle("hidden", entries.length > 0);
    cartSubtotal.textContent = formatCurrency(total);
    cartTotal.textContent = formatCurrency(total);
    chargeButton.disabled = entries.length === 0 || isCharging;
    renderScanProducts();
  }

  async function refreshProducts() {
    isLoadingProducts = true;
    renderProducts();
    try {
      products = await listProducts();
      isLoadingProducts = false;
      renderProducts();
      renderScanProducts();
      return true;
    } catch (error) {
      isLoadingProducts = false;
      productGrid.innerHTML = `
        <div class="col-span-full rounded-xl bg-error-container p-space-lg text-on-error-container" role="alert">
          <p>No se pudo cargar el catálogo de PostgreSQL: ${escapeHtml(error.message)}</p>
          <button class="mt-space-sm rounded-lg bg-surface-container-lowest px-space-md py-2 font-semibold" data-retry-products type="button">Volver a intentar</button>
        </div>`;
      saleStatus.textContent = "El POS requiere conexión con el backend.";
      renderScanProducts();
      return false;
    }
  }

  async function addScannedProduct(barcode) {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) {
      return;
    }

    try {
      const product = await findProductByBarcode(cleanBarcode);
      const currentProduct = products.find((item) => item.id === product.id);
      if (currentProduct) {
        Object.assign(currentProduct, product);
      } else {
        products.push(product);
      }
      addProductToCart(product, "scan");
      barcodeInput.value = "";
      barcodeInput.focus();
    } catch (error) {
      saleStatus.textContent =
        error instanceof ApiError && error.status === 404
          ? `No hay un producto registrado con el código ${cleanBarcode}. Regístralo en el catálogo antes de escanearlo.`
          : `No se pudo consultar el código: ${error.message}`;
    }
  }

  productGrid.addEventListener("click", (event) => {
    if (event.target.closest("[data-retry-products]")) {
      refreshProducts();
      return;
    }
  });

  productGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-product]");
    if (!button) {
      return;
    }

    const product = products.find(
      (candidate) => candidate.id === button.dataset.addProduct,
    );
    if (!product) {
      return;
    }

    addProductToCart(product);
  });

  simulateScanButton.addEventListener("click", () => {
    const product = products.find(
      (candidate) => candidate.id === scanProductSelect.value,
    );
    if (product) {
      addProductToCart(product, "scan");
    }
  });

  barcodeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addScannedProduct(barcodeInput.value);
  });

  cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) {
      return;
    }

    const entry = cart.get(button.dataset.productId);
    if (!entry) {
      return;
    }

    if (button.dataset.cartAction === "increase") {
      if (entry.quantity >= entry.product.stock) {
        saleStatus.textContent = `No hay más stock disponible de ${entry.product.name}.`;
        return;
      }
      entry.quantity += 1;
    } else if (entry.quantity > 1) {
      entry.quantity -= 1;
    } else {
      cart.delete(button.dataset.productId);
    }
    renderCart();
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      document.querySelectorAll("[data-category]").forEach((categoryButton) => {
        const isSelected = categoryButton === button;
        categoryButton.classList.toggle("bg-primary", isSelected);
        categoryButton.classList.toggle("text-on-primary", isSelected);
        categoryButton.classList.toggle("bg-surface-container-lowest", !isSelected);
        categoryButton.classList.toggle("text-on-surface-variant", !isSelected);
      });
      renderProducts();
    });
  });

  productSearch.addEventListener("input", renderProducts);
  paymentMethods.addEventListener("click", (event) => {
    const button = event.target.closest("[data-payment-method]");
    if (!button) {
      return;
    }

    selectedPaymentMethod = button.dataset.paymentMethod;
    paymentMethods.querySelectorAll("[data-payment-method]").forEach((option) => {
      const isSelected = option === button;
      option.classList.toggle("bg-primary", isSelected);
      option.classList.toggle("text-on-primary", isSelected);
      option.classList.toggle("bg-surface-container-low", !isSelected);
      option.classList.toggle("text-on-surface", !isSelected);
      option.setAttribute("aria-pressed", String(isSelected));
    });
  });

  document.querySelector("#clearCartButton").addEventListener("click", () => {
    cart.clear();
    saleStatus.textContent = "Venta vaciada.";
    renderCart();
  });

  chargeButton.addEventListener("click", async () => {
    if (cart.size === 0 || isCharging) {
      return;
    }

    const paymentMethod = selectedPaymentMethod;
    isCharging = true;
    renderCart();
    try {
      const sale = await createSale({
        cashier: "Rosa Quispe",
        terminal: localStorage.getItem("retail-pulse-terminal") || "Caja 01",
        paymentMethod,
        items: Array.from(cart.values()),
      });
      cart.clear();
      const productsRefreshed = await refreshProducts();
      renderCart();
      const paymentNotice = ["Tarjeta", "Yape"].includes(paymentMethod)
        ? " Esta demo no procesó ni verificó el pago."
        : "";
      saleStatus.textContent = productsRefreshed
        ? `Venta ${sale.id} registrada en PostgreSQL por ${formatCurrency(Number(sale.total))}.${paymentNotice}`
        : `Venta ${sale.id} registrada, pero no se pudo actualizar el catálogo. Vuelve a cargar los productos.${paymentNotice}`;
      window.dispatchEvent(new Event("retail-pulse-sales-updated"));
    } catch (error) {
      console.error("No se pudo registrar la venta:", error);
      saleStatus.textContent = `No se registró la venta: ${error.message}. El carrito se conservó.`;
      if (error instanceof ApiError && error.status === 409) {
        await refreshProducts();
        renderCart();
      }
    } finally {
      isCharging = false;
      renderCart();
    }
  });

  document.querySelector("#logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("retail-pulse-role");
    window.location.assign("login.html");
  });

  renderProducts();
  renderScanProducts();
  renderCart();
  initInventoryNotifications();
  refreshProducts();
}
