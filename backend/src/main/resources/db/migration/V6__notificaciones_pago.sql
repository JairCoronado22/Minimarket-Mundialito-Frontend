-- V6: Tabla para almacenar notificaciones de pago recibidas desde MacroDroid (Yape webhook)

CREATE TABLE notificaciones_pago (
    id SERIAL PRIMARY KEY,
    mensaje_raw VARCHAR(500) NOT NULL,
    remitente VARCHAR(120),
    monto NUMERIC(10, 2),
    fecha_notificacion TIMESTAMP WITH TIME ZONE NOT NULL,
    procesada BOOLEAN NOT NULL DEFAULT FALSE
);
