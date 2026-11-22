package com.mundialito.ia.dato;

/**
 * DTO con el resultado de predicción de demanda de un producto.
 */
public class PrediccionDemandaDTO {

    private Long productoId;
    private String nombreProducto;
    private double demandaPredicha;
    private double intervaloInferior;
    private double intervaloSuperior;
    private double mae;
    private double rmse;
    private String modeloUsado;
    private int diasHistorial;

    public PrediccionDemandaDTO() {
    }

    public PrediccionDemandaDTO(
            Long productoId,
            String nombreProducto,
            double demandaPredicha,
            double intervaloInferior,
            double intervaloSuperior,
            double mae,
            double rmse,
            String modeloUsado,
            int diasHistorial) {
        this.productoId = productoId;
        this.nombreProducto = nombreProducto;
        this.demandaPredicha = demandaPredicha;
        this.intervaloInferior = intervaloInferior;
        this.intervaloSuperior = intervaloSuperior;
        this.mae = mae;
        this.rmse = rmse;
        this.modeloUsado = modeloUsado;
        this.diasHistorial = diasHistorial;
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

    public double getDemandaPredicha() {
        return demandaPredicha;
    }

    public void setDemandaPredicha(double demandaPredicha) {
        this.demandaPredicha = demandaPredicha;
    }

    public double getIntervaloInferior() {
        return intervaloInferior;
    }

    public void setIntervaloInferior(double intervaloInferior) {
        this.intervaloInferior = intervaloInferior;
    }

    public double getIntervaloSuperior() {
        return intervaloSuperior;
    }

    public void setIntervaloSuperior(double intervaloSuperior) {
        this.intervaloSuperior = intervaloSuperior;
    }

    public double getMae() {
        return mae;
    }

    public void setMae(double mae) {
        this.mae = mae;
    }

    public double getRmse() {
        return rmse;
    }

    public void setRmse(double rmse) {
        this.rmse = rmse;
    }

    public String getModeloUsado() {
        return modeloUsado;
    }

    public void setModeloUsado(String modeloUsado) {
        this.modeloUsado = modeloUsado;
    }

    public int getDiasHistorial() {
        return diasHistorial;
    }

    public void setDiasHistorial(int diasHistorial) {
        this.diasHistorial = diasHistorial;
    }
}
