package com.mundialito.ia.venta;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ventas_diarias")
public class VentasDiarias {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "producto_id", nullable = false)
    private Long productoId;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "cantidad_vendida", nullable = false)
    private Integer cantidadVendida;

    @Column(name = "total_ingreso", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalIngreso;

    public VentasDiarias() {
    }

    public Long getId() {
        return id;
    }

    public Long getProductoId() {
        return productoId;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public Integer getCantidadVendida() {
        return cantidadVendida;
    }

    public BigDecimal getTotalIngreso() {
        return totalIngreso;
    }
}
