package com.mundialito.pagos;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "notificaciones_pago")
public class NotificacionPago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "mensaje_raw", nullable = false, length = 500)
    private String mensajeRaw;

    @Column(name = "remitente", length = 120)
    private String remitente;

    @Column(precision = 10, scale = 2)
    private BigDecimal monto;

    @Column(name = "fecha_notificacion", nullable = false)
    private OffsetDateTime fechaNotificacion;

    @Column(name = "procesada", nullable = false)
    private Boolean procesada;

    protected NotificacionPago() {
    }

    public NotificacionPago(String mensajeRaw, String remitente, BigDecimal monto,
            OffsetDateTime fechaNotificacion, Boolean procesada) {
        this.mensajeRaw = mensajeRaw;
        this.remitente = remitente;
        this.monto = monto;
        this.fechaNotificacion = fechaNotificacion;
        this.procesada = procesada;
    }

    public Integer getId() {
        return id;
    }

    public String getMensajeRaw() {
        return mensajeRaw;
    }

    public String getRemitente() {
        return remitente;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public OffsetDateTime getFechaNotificacion() {
        return fechaNotificacion;
    }

    public Boolean getProcesada() {
        return procesada;
    }

    public void setProcesada(Boolean procesada) {
        this.procesada = procesada;
    }
}
