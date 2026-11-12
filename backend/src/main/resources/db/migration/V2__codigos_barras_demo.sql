UPDATE productos
SET codigo_barras = '7750123000111'
WHERE nombre = 'Aceite Primor 1L'
  AND codigo_barras IS NULL
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750123000111');

UPDATE productos
SET codigo_barras = '7750123000222'
WHERE nombre = 'Leche Gloria Evaporada'
  AND codigo_barras IS NULL
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750123000222');

UPDATE productos
SET codigo_barras = '7750123000333'
WHERE nombre = 'Fideos Don Vittorio 500g'
  AND codigo_barras IS NULL
  AND NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750123000333');

INSERT INTO productos (codigo_barras, nombre, categoria, precio, stock_gondola, stock_almacen)
SELECT '7750123000444', 'Arroz Costeño 750g', 'Abarrotes', 4.50, 18, 36
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750123000444')
  AND NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Arroz Costeño 750g');

INSERT INTO productos (codigo_barras, nombre, categoria, precio, stock_gondola, stock_almacen)
SELECT '7750123000555', 'Bebida Gaseosa Inca Kola 1.5L', 'Bebidas', 7.00, 10, 25
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo_barras = '7750123000555')
  AND NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Bebida Gaseosa Inca Kola 1.5L');
