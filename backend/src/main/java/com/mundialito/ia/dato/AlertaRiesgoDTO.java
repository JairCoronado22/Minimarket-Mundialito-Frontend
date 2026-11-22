package com.mundialito.ia.dato;

/**
 * DTO con el resultado de clasificación de riesgo de un producto.
 */
public class AlertaRiesgoDTO {

    private Long productoId;
    private String nombreProducto;
    private String riesgo; // "ALTO", "MEDIO", "BAJO"
    private double probabilidadRiesgo;
    private int stockActual;
    private double demandaPromedio;
    private String motivo;

    public AlertaRiesgoDTO() {
    }

    public AlertaRiesgoDTO(
            Long productoId,
            String nombreProducto,
            String riesgo,
            double probabilidadRiesgo,
            int stockActual,
            double demandaPromedio,
            String motivo) {
        this.productoId = productoId;
        this.nombreProducto = nombreProducto;
        this.riesgo = riesgo;
        this.probabilidadRiesgo = probabilidadRiesgo;
        this.stockActual = stockActual;
        this.demandaPromedio = demandaPromedio;
        this.motivo = motivo;
    }

    public Long getProductoId() {
        return productoId;
    }

    public void setProductoId(Long productoId) {
        this.productoId = productoId;
    }

    public String getNombreProducto() {
        return nombreProducto;
    }

    public void setNombreProducto(String nombreProducto) {
        this.nombreProducto = nombreProducto;
    }

    public String getRiesgo() {
        return riesgo;
    }

    public void setRiesgo(String riesgo) {
        this.riesgo = riesgo;
    }

    public double getProbabilidadRiesgo() {
        return probabilidadRiesgo;
    }

    public void setProbabilidadRiesgo(double probabilidadRiesgo) {
        this.probabilidadRiesgo = probabilidadRiesgo;
    }

    public int getStockActual() {
        return stockActual;
    }

    public void setStockActual(int stockActual) {
        this.stockActual = stockActual;
    }

    public double getDemandaPromedio() {
        return demandaPromedio;
    }

    public void setDemandaPromedio(double demandaPromedio) {
        this.demandaPromedio = demandaPromedio;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }
}
