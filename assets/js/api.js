const configuredBaseUrl =
  window.MUNDIALITO_API_URL || "http://localhost:8080/api";

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(
      `No se pudo conectar con el backend en ${API_BASE_URL}. Verifica que Spring Boot esté iniciado y que CORS permita este origen.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body.detail || body.message || body.error || message;
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export function mapProduct(product) {
  return {
    id: String(product.id),
    name: product.nombre,
    category: product.categoria || "Abarrotes",
    price: Number(product.precio),
    icon: "grocery",
    stock: Number(product.stockGondola),
    barcode: product.codigoBarras || "",
  };
}

export async function listProducts() {
  const products = await request("/productos");
  if (!Array.isArray(products)) {
    throw new Error("La API devolvió una lista de productos inválida.");
  }
  return products.map(mapProduct);
}

export async function findProductByBarcode(barcode) {
  const product = await request(
    `/productos/codigo/${encodeURIComponent(barcode)}`,
  );
  return mapProduct(product);
}

export async function createSale({ cashier, terminal, paymentMethod, items }) {
  if (paymentMethod !== "Efectivo") {
    throw new Error("Este medio de pago aún no está habilitado en el backend.");
  }
  const payload = {
    cajero: cashier,
    terminal,
    medioPago: "EFECTIVO",
    items: items.map(({ product, quantity }) => {
      const productoId = Number(product.id);
      if (!Number.isSafeInteger(productoId) || productoId <= 0) {
        throw new Error("El producto tiene un identificador inválido.");
      }
      return { productoId, cantidad: quantity };
    }),
  };
  return request("/ventas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listSales() {
  const sales = await request("/ventas");
  if (!Array.isArray(sales)) {
    throw new Error("La API devolvió un historial de ventas inválido.");
  }
  return sales.map((sale) => ({
    id: sale.id,
    soldAt: sale.fecha,
    cashier: sale.cajero,
    terminal: sale.terminal,
    paymentMethod: sale.medioPago === "EFECTIVO" ? "Efectivo" : sale.medioPago,
    total: Number(sale.total),
    items: sale.items.map((item) => ({
      id: String(item.productoId),
      name: item.nombreProducto,
      category: "",
      price: Number(item.precioUnitario),
      quantity: item.cantidad,
    })),
  }));
}
