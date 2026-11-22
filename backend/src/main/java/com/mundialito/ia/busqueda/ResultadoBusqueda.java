package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resultado de un algoritmo de búsqueda de reposición.
 */
public class ResultadoBusqueda {

    private final String algoritmo;
    private final List<ReposicionPaso> pasos;
    private final BigDecimal costoTotal;
    private final long nodosExpandidos;
    private final double tiempoMs;

    public ResultadoBusqueda(
            String algoritmo,
            List<ReposicionPaso> pasos,
            BigDecimal costoTotal,
            long nodosExpandidos,
            double tiempoMs) {
        this.algoritmo = algoritmo;
        this.pasos = pasos;
        this.costoTotal = costoTotal;
        this.nodosExpandidos = nodosExpandidos;
        this.tiempoMs = tiempoMs;
    }

    public String getAlgoritmo() {
        return algoritmo;
    }

    public List<ReposicionPaso> getPasos() {
        return pasos;
    }

    public BigDecimal getCostoTotal() {
        return costoTotal;
    }

    public long getNodosExpandidos() {
        return nodosExpandidos;
    }

    public double getTiempoMs() {
        return tiempoMs;
    }

    /**
     * Un paso individual en el plan de reposición generado por un algoritmo.
     */
    public static class ReposicionPaso {
        private final Long productoId;
        private final String nombreProducto;
        private final int cantidad;
        private final BigDecimal costo;
        private final int orden;

        public ReposicionPaso(Long productoId, String nombreProducto, int cantidad, BigDecimal costo, int orden) {
            this.productoId = productoId;
            this.nombreProducto = nombreProducto;
            this.cantidad = cantidad;
            this.costo = costo;
            this.orden = orden;
        }

        public Long getProductoId() {
            return productoId;
        }

        public String getNombreProducto() {
            return nombreProducto;
        }

        public int getCantidad() {
            return cantidad;
        }

        public BigDecimal getCosto() {
            return costo;
        }

        public int getOrden() {
            return orden;
        }
    }
}
