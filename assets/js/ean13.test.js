import { describe, expect, it } from "vitest";
import {
  calculateEan13CheckDigit,
  generateNextEan13,
  isValidEan13,
} from "./ean13.js";

describe("códigos EAN-13", () => {
  it("calcula el dígito verificador con el algoritmo Módulo 10", () => {
    expect(calculateEan13CheckDigit("775000000001")).toBe(4);
    expect(calculateEan13CheckDigit("400638133393")).toBe(1);
  });

  it("genera un correlativo peruano EAN-13 válido", () => {
    const barcode = generateNextEan13([]);

    expect(barcode).toBe("7750000000014");
    expect(isValidEan13(barcode)).toBe(true);
  });

  it("continúa después del mayor correlativo existente y evita códigos usados", () => {
    expect(generateNextEan13(["7750000000014", "7750000000038"])).toBe(
      "7750000000045",
    );
  });

  it("valida longitud, dígitos y dígito verificador", () => {
    expect(isValidEan13("4006381333931")).toBe(true);
    expect(isValidEan13("4006381333932")).toBe(false);
    expect(isValidEan13("400638133393")).toBe(false);
    expect(isValidEan13("40063813339a1")).toBe(false);
  });
});