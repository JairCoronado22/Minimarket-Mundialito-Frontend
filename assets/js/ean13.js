export function calculateEan13CheckDigit(base) {
  if (!/^\d{12}$/.test(base)) {
    throw new Error("El código base EAN-13 debe tener 12 dígitos numéricos.");
  }

  const sum = Array.from(base, (digit, index) =>
    Number(digit) * (index % 2 === 0 ? 1 : 3),
  ).reduce((total, value) => total + value, 0);

  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(barcode) {
  if (typeof barcode !== "string" || !/^\d{13}$/.test(barcode)) {
    return false;
  }

  return Number(barcode[12]) === calculateEan13CheckDigit(barcode.slice(0, 12));
}

export function generateNextEan13(existingBarcodes = []) {
  const used = new Set(existingBarcodes.map((barcode) => String(barcode)));
  const highestSequence = existingBarcodes.reduce((highest, barcode) => {
    if (typeof barcode !== "string" || !/^775\d{9}\d$/.test(barcode)) {
      return highest;
    }

    return Math.max(highest, Number(barcode.slice(3, 12)));
  }, 0);

  for (let offset = 1; offset <= 999999999; offset += 1) {
    const sequence = ((highestSequence + offset - 1) % 999999999) + 1;
    const base = `775${String(sequence).padStart(9, "0")}`;
    const barcode = `${base}${calculateEan13CheckDigit(base)}`;
    if (!used.has(barcode)) return barcode;
  }

  throw new Error("No hay correlativos EAN-13 disponibles.");
}