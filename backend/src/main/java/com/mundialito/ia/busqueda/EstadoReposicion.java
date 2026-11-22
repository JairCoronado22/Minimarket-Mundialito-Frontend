package com.mundialito.ia.busqueda;

import java.math.BigDecimal;

/**
 * Representa un estado en el espacio de búsqueda para planificación de reposición de stock.
 * Cada estado corresponde a un producto con su stock actual y la demanda promedio histórica.
 */
public class EstadoReposicion {

    private final Long productoId;
    private final String nombreProducto;
    private final int stockActual;
    private final int stockAlmacen;
    private final BigDecimal precio;
    private final double demandaPromedio;
    private final int stockDeseado;

    public EstadoReposicion(
            Long productoId,
            String nombreProducto,
            int stockActual,
            int stockAlmacen,
            BigDecimal precio,
            double demandaPromedio,
            int stockDeseado) {
        this.productoId = productoId;
        this.nombreProducto = nombreProducto;
        this.stockActual = stockActual;
        this.stockAlmacen = stockAlmacen;
        this.precio = precio;
        this.demandaPromedio = demandaPromedio;
        this.stockDeseado = stockDeseado;
    }

    public Long getProductoId() {
        return productoId;
    }

    public String getNombreProducto() {
        return nombreProducto;
    }

    public int getStockActual() {
        return stockActual;
    }

    public int getStockAlmacen() {
        return stockAlmacen;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public double getDemandaPromedio() {
        return demandaPromedio;
    }

    public int getStockDeseado() {
        return stockDeseado;
    }

    /**
     * Calcula la cantidad que se debe reponer para alcanzar el stock deseado.
     */
    public int getCantidadReposicion() {
        int deficit = stockDeseado - stockActual;
        return Math.max(0, deficit);
    }

    /**
     * Calcula el costo de reposición para alcanzar el stock deseado.
     */
    public BigDecimal getCostoReposicion() {
        return BigDecimal.valueOf(getCantidadReposicion()).multiply(precio);
    }

    /**
     * Calcula la urgencia del producto: relación entre stock actual y demanda promedio.
     * Un valor menor indica mayor urgencia.
     */
    public double getUrgencia() {
        if (demandaPromedio <= 0) {
            return stockActual;
        }
        return (double) stockActual / demandaPromedio;
    }
}
