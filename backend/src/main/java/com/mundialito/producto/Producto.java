package com.mundialito.producto;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "productos")
public class Producto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 160)
    @Column(nullable = false, length = 160)
    private String nombre;

    @Size(max = 80)
    @Column(length = 80)
    private String categoria;

    @NotNull
    @DecimalMin("0.00")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Size(max = 64)
    @Column(name = "codigo_barras", length = 64, unique = true)
    private String codigoBarras;

    @NotNull
    @Min(0)
    @Column(name = "stock_gondola", nullable = false)
    private Integer stockGondola;

    @NotNull
    @Min(0)
    @Column(name = "stock_almacen", nullable = false)
    private Integer stockAlmacen;

    public Producto() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public void setPrecio(BigDecimal precio) {
        this.precio = precio;
    }

    public String getCodigoBarras() {
        return codigoBarras;
    }

    public void setCodigoBarras(String codigoBarras) {
        this.codigoBarras = codigoBarras == null || codigoBarras.isBlank()
                ? null
                : codigoBarras.trim();
    }

    public Integer getStockGondola() {
        return stockGondola;
    }

    public void setStockGondola(Integer stockGondola) {
        this.stockGondola = stockGondola;
    }

    public Integer getStockAlmacen() {
        return stockAlmacen;
    }

    public void setStockAlmacen(Integer stockAlmacen) {
        this.stockAlmacen = stockAlmacen;
    }
}
