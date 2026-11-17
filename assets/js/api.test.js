import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addProductStock,
  configureApiBaseUrl,
  createSale,
  listProducts,
} from "./api.js";

const fetchMock = vi.fn();

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: vi.fn().mockResolvedValue(body),
  };
}

describe("API de productos y ventas", () => {
  beforeEach(() => {
    configureApiBaseUrl("https://backend.example.test/api");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("consulta los productos y adapta los campos del backend", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          id: 7,
          nombre: "Arroz",
          categoria: "Abarrotes",
          precio: "4.50",
          stockGondola: 12,
          codigoBarras: "123456",
        },
      ]),
    );

    await expect(listProducts()).resolves.toEqual([
      {
        id: "7",
        name: "Arroz",
        category: "Abarrotes",
        price: 4.5,
        icon: "grocery",
        stock: 12,
        barcode: "123456",
      },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.test/api/productos",
    );
  });

  it("registra ingresos como POST y adapta el producto actualizado", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 7,
        nombre: "Arroz",
        precio: 4.5,
        stockGondola: 15,
      }),
    );

    await expect(addProductStock("7", 3)).resolves.toMatchObject({
      id: "7",
      name: "Arroz",
      stock: 15,
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.test/api/productos/7/ingresos",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ cantidad: 3 }),
    });
  });

  it("envía una venta con el código de pago que espera el backend", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 19 }));

    await expect(
      createSale({
        cashier: "Cajero",
        terminal: "Caja 1",
        paymentMethod: "Yape",
        items: [{ product: { id: "7" }, quantity: 2 }],
      }),
    ).resolves.toEqual({ id: 19 });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.test/api/ventas",
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      cajero: "Cajero",
      terminal: "Caja 1",
      medioPago: "YAPE",
      items: [{ productoId: 7, cantidad: 2 }],
    });
  });

  it("rechaza cantidades inválidas sin llamar al backend", async () => {
    await expect(addProductStock("7", 0)).rejects.toThrow(
      "La cantidad recibida debe ser un entero mayor que cero.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
