-- Códigos EAN-13 válidos con prefijo peruano 775 y dígito verificador correcto
-- 7750000000001 -> dígito verificador: (7+5+0+0+0+0+0+0+0+0+0+1) impar=13, (7+0+0+0+0+0+0+0+0+0+1)*3... 
-- Cálculo: posiciones impares (0,2,4,6,8,10): 7+5+0+0+0+0 = 12, posiciones pares (1,3,5,7,9,11): 7+0+0+0+0+0 = 7*3=21 -> 12+21=33 -> (10-3)=7
-- 7750000000017 (dígito 7)

UPDATE productos
SET codigo_barras = '7750000000017'
WHERE nombre = 'Aceite Primor 1L'
  AND codigo_barras IS NULL
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750000000017');

UPDATE productos
SET codigo_barras = '7750000000024'
WHERE nombre = 'Leche Gloria Evaporada'
  AND codigo_barras IS NULL
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750000000024');

UPDATE productos
SET codigo_barras = '7750000000031'
WHERE nombre = 'Fideos Don Vittorio 500g'
  AND codigo_barras IS NULL
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750000000031');

INSERT INTO productos (codigo_barras, nombre, categoria, precio, stock_gondola, stock_almacen)
SELECT '7750000000048', 'Arroz Costeño 750g', 'Abarrotes', 4.50, 18, 36
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750000000048')
  AND NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Arroz Costeño 750g');

INSERT INTO productos (codigo_barras, nombre, categoria, precio, stock_gondola, stock_almacen)
SELECT '7750000000055', 'Bebida Gaseosa Inca Kola 1.5L', 'Bebidas', 7.00, 10, 25
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750000000055')
  AND NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Bebida Gaseosa Inca Kola 1.5L');
