if (sessionStorage.getItem("retail-pulse-role") !== "cajero") {
  window.location.replace("login.html");
} else {
  const products = [
    { id: "aceite-primor", name: "Aceite Primor Premium 900ml", category: "Abarrotes", price: 10.9, icon: "grocery" },
    { id: "arroz-costeno", name: "Arroz Costeño Extra 1kg", category: "Abarrotes", price: 5.8, icon: "lunch_dining" },
    { id: "galletas-casino", name: "Galletas Casino Menta x6", category: "Abarrotes", price: 3.2, icon: "cookie" },
    { id: "coca-cola", name: "Coca-Cola 500ml", category: "Bebidas", price: 3.5, icon: "local_drink" },
    { id: "leche-gloria", name: "Leche Gloria Entera 400g", category: "Lácteos", price: 3.85, icon: "nutrition" },
    { id: "detergente-ariel", name: "Detergente Ariel Doble Poder 500g", category: "Limpieza", price: 8.5, icon: "soap" },
  ];
  const cart = new Map();
  const productGrid = document.querySelector("#productGrid");
  const cartItems = document.querySelector("#cartItems");
  const emptyCart = document.querySelector("#emptyCart");
  const cartSubtotal = document.querySelector("#cartSubtotal");
  const cartTotal = document.querySelector("#cartTotal");
  const chargeButton = document.querySelector("#chargeButton");
  const saleStatus = document.querySelector("#saleStatus");
  const productSearch = document.querySelector("#productSearch");
  let selectedCategory = "Todos";

  function formatCurrency(amount) {
    return `S/ ${amount.toFixed(2)}`;
  }

  function renderProducts() {
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
                <span class="font-label-sm text-label-sm text-on-surface-variant">${product.category}</span>
                <h2 class="mt-1 min-h-10 font-label-lg text-label-lg text-on-surface">${product.name}</h2>
                <div class="mt-space-md flex items-center justify-between gap-space-xs">
                  <span class="font-headline-sm text-headline-sm font-bold">${formatCurrency(product.price)}</span>
                  <button class="rounded-lg bg-primary px-space-md py-2 font-label-md text-label-md font-semibold text-on-primary hover:bg-primary-container" data-add-product="${product.id}" type="button">Agregar</button>
                </div>
              </article>`,
          )
          .join("")
      : '<p class="col-span-full rounded-xl bg-surface-container-lowest p-space-lg text-center text-on-surface-variant">No encontramos productos con esa búsqueda.</p>';
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
              <p class="truncate font-label-md text-label-md font-semibold">${product.name}</p>
              <p class="font-body-sm text-body-sm text-on-surface-variant">${formatCurrency(product.price)} c/u</p>
            </div>
            <div class="flex shrink-0 items-center gap-space-xs">
              <button aria-label="Quitar una unidad de ${product.name}" class="flex h-8 w-8 items-center justify-center rounded bg-surface-container-lowest" data-cart-action="decrease" data-product-id="${product.id}" type="button">−</button>
              <span class="min-w-5 text-center font-label-md text-label-md">${quantity}</span>
              <button aria-label="Agregar una unidad de ${product.name}" class="flex h-8 w-8 items-center justify-center rounded bg-surface-container-lowest" data-cart-action="increase" data-product-id="${product.id}" type="button">+</button>
            </div>
          </li>`,
      )
      .join("");

    emptyCart.classList.toggle("hidden", entries.length > 0);
    cartSubtotal.textContent = formatCurrency(total);
    cartTotal.textContent = formatCurrency(total);
    chargeButton.disabled = entries.length === 0;
  }

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

    const current = cart.get(product.id);
    cart.set(product.id, { product, quantity: (current?.quantity ?? 0) + 1 });
    saleStatus.textContent = `${product.name} agregado a la venta.`;
    renderCart();
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

  document.querySelector("#clearCartButton").addEventListener("click", () => {
    cart.clear();
    saleStatus.textContent = "Venta vaciada.";
    renderCart();
  });

  chargeButton.addEventListener("click", () => {
    if (cart.size === 0) {
      return;
    }

    const saleTotal = Array.from(cart.values()).reduce(
      (sum, { product, quantity }) => sum + product.price * quantity,
      0,
    );
    cart.clear();
    renderCart();
    saleStatus.textContent = `Venta de ${formatCurrency(saleTotal)} cobrada en efectivo (demo).`;
  });

  document.querySelector("#logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("retail-pulse-role");
    window.location.assign("login.html");
  });

  renderProducts();
  renderCart();
}
