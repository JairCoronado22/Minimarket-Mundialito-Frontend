-- Asigna códigos de barras a productos que aún no tienen uno
-- El backend genera el dígito verificador EAN-13 automáticamente al crear productos nuevos
-- Esta migración solo cubre productos existentes sin código

UPDATE productos
SET codigo_barras = CONCAT('7750000', LPAD(CAST(id AS VARCHAR), 5, '0'))
WHERE codigo_barras IS NULL OR codigo_barras = '';
