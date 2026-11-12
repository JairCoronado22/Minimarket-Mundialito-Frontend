DO $$
DECLARE
    fk_name TEXT;
BEGIN
    FOR fk_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'detalle_venta'::regclass
          AND confrelid = 'productos'::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE detalle_venta DROP CONSTRAINT %I', fk_name);
    END LOOP;
END
$$;

ALTER TABLE productos
    ALTER COLUMN id TYPE BIGINT USING id::BIGINT;

DO $$
DECLARE
    sequence_name TEXT;
BEGIN
    sequence_name := pg_get_serial_sequence('productos', 'id');
    IF sequence_name IS NOT NULL THEN
        EXECUTE format('ALTER SEQUENCE %s AS BIGINT', sequence_name::regclass);
    END IF;
END
$$;

ALTER TABLE detalle_venta
    ALTER COLUMN producto_id TYPE BIGINT USING producto_id::BIGINT;

ALTER TABLE detalle_venta
    ADD CONSTRAINT fk_detalle_venta_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE RESTRICT;
