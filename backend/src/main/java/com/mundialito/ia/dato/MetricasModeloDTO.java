package com.mundialito.ia.dato;

/**
 * DTO con las métricas de evaluación de un modelo de clasificación.
 */
public class MetricasModeloDTO {

    private String modelo;
    private double precision;
    private double recall;
    private double f1Score;
    private int verdaderosPositivos;
    private int falsosPositivos;
    private int falsosNegativos;
    private int verdaderosNegativos;

    public MetricasModeloDTO() {
    }

    public MetricasModeloDTO(
            String modelo,
            double precision,
            double recall,
            double f1Score,
            int verdaderosPositivos,
            int falsosPositivos,
            int falsosNegativos,
            int verdaderosNegativos) {
        this.modelo = modelo;
        this.precision = precision;
        this.recall = recall;
        this.f1Score = f1Score;
        this.verdaderosPositivos = verdaderosPositivos;
        this.falsosPositivos = falsosPositivos;
        this.falsosNegativos = falsosNegativos;
        this.verdaderosNegativos = verdaderosNegativos;
    }

    public String getModelo() {
        return modelo;
    }

    public void setModelo(String modelo) {
        this.modelo = modelo;
    }

    public double getPrecision() {
        return precision;
    }

    public void setPrecision(double precision) {
        this.precision = precision;
    }

    public double getRecall() {
        return recall;
    }

    public void setRecall(double recall) {
        this.recall = recall;
    }

    public double getF1Score() {
        return f1Score;
    }

    public void setF1Score(double f1Score) {
        this.f1Score = f1Score;
    }

    public int getVerdaderosPositivos() {
        return verdaderosPositivos;
    }

    public void setVerdaderosPositivos(int verdaderosPositivos) {
        this.verdaderosPositivos = verdaderosPositivos;
    }

    public int getFalsosPositivos() {
        return falsosPositivos;
    }

    public void setFalsosPositivos(int falsosPositivos) {
        this.falsosPositivos = falsosPositivos;
    }

    public int getFalsosNegativos() {
        return falsosNegativos;
    }

    public void setFalsosNegativos(int falsosNegativos) {
        this.falsosNegativos = falsosNegativos;
    }

    public int getVerdaderosNegativos() {
        return verdaderosNegativos;
    }

    public void setVerdaderosNegativos(int verdaderosNegativos) {
        this.verdaderosNegativos = verdaderosNegativos;
    }
}
