package com.mundialito.ia.dato;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO que compara los resultados de los 4 algoritmos de búsqueda
 * para planificación de reposición de stock.
 */
public class ComparacionAlgoritmosDTO {

    private AlgoritmoResultadoDTO bfs;
    private AlgoritmoResultadoDTO dfs;
    private AlgoritmoResultadoDTO aStar;
    private AlgoritmoResultadoDTO hillClimbing;
    private String recomendacion;

    public ComparacionAlgoritmosDTO() {
    }

    public ComparacionAlgoritmosDTO(
            AlgoritmoResultadoDTO bfs,
            AlgoritmoResultadoDTO dfs,
            AlgoritmoResultadoDTO aStar,
            AlgoritmoResultadoDTO hillClimbing) {
        this.bfs = bfs;
        this.dfs = dfs;
        this.aStar = aStar;
        this.hillClimbing = hillClimbing;
        this.recomendacion = calcularRecomendacion();
    }

    private String calcularRecomendacion() {
        // Recomendar el algoritmo con menor costo total
        AlgoritmoResultadoDTO mejor = bfs;
        if (dfs.getCostoTotal().compareTo(mejor.getCostoTotal()) < 0) mejor = dfs;
        if (aStar.getCostoTotal().compareTo(mejor.getCostoTotal()) < 0) mejor = aStar;
        if (hillClimbing.getCostoTotal().compareTo(mejor.getCostoTotal()) < 0) mejor = hillClimbing;

        return mejor.getAlgoritmo() + " tiene el menor costo total de reposición: "
                + mejor.getCostoTotal() + " soles.";
    }

    public AlgoritmoResultadoDTO getBfs() {
        return bfs;
    }

    public void setBfs(AlgoritmoResultadoDTO bfs) {
        this.bfs = bfs;
    }

    public AlgoritmoResultadoDTO getDfs() {
        return dfs;
    }

    public void setDfs(AlgoritmoResultadoDTO dfs) {
        this.dfs = dfs;
    }

    public AlgoritmoResultadoDTO getAStar() {
        return aStar;
    }

    public void setAStar(AlgoritmoResultadoDTO aStar) {
        this.aStar = aStar;
    }

    public AlgoritmoResultadoDTO getHillClimbing() {
        return hillClimbing;
    }

    public void setHillClimbing(AlgoritmoResultadoDTO hillClimbing) {
        this.hillClimbing = hillClimbing;
    }

    public String getRecomendacion() {
        return recomendacion;
    }

    public void setRecomendacion(String recomendacion) {
        this.recomendacion = recomendacion;
    }

    /**
     * Resultado de un algoritmo individual.
     */
    public static class AlgoritmoResultadoDTO {
        private String algoritmo;
        private BigDecimal costoTotal;
        private long nodosExpandidos;
        private double tiempoMs;
        private List<PasoReposicionDTO> pasos;

        public AlgoritmoResultadoDTO() {
        }

        public AlgoritmoResultadoDTO(String algoritmo, BigDecimal costoTotal,
                long nodosExpandidos, double tiempoMs, List<PasoReposicionDTO> pasos) {
            this.algoritmo = algoritmo;
            this.costoTotal = costoTotal;
            this.nodosExpandidos = nodosExpandidos;
            this.tiempoMs = tiempoMs;
            this.pasos = pasos;
        }

        public String getAlgoritmo() {
            return algoritmo;
        }

        public void setAlgoritmo(String algoritmo) {
            this.algoritmo = algoritmo;
        }

        public BigDecimal getCostoTotal() {
            return costoTotal;
        }

        public void setCostoTotal(BigDecimal costoTotal) {
            this.costoTotal = costoTotal;
        }

        public long getNodosExpandidos() {
            return nodosExpandidos;
        }

        public void setNodosExpandidos(long nodosExpandidos) {
            this.nodosExpandidos = nodosExpandidos;
        }

        public double getTiempoMs() {
            return tiempoMs;
        }

        public void setTiempoMs(double tiempoMs) {
            this.tiempoMs = tiempoMs;
        }

        public List<PasoReposicionDTO> getPasos() {
            return pasos;
        }

        public void setPasos(List<PasoReposicionDTO> pasos) {
            this.pasos = pasos;
        }
    }

    /**
     * Un paso de reposición en el plan.
     */
    public static class PasoReposicionDTO {
        private Long productoId;
        private String nombreProducto;
        private int cantidad;
        private BigDecimal costo;
        private int orden;

        public PasoReposicionDTO() {
        }

        public PasoReposicionDTO(Long productoId, String nombreProducto,
                int cantidad, BigDecimal costo, int orden) {
            this.productoId = productoId;
            this.nombreProducto = nombreProducto;
            this.cantidad = cantidad;
            this.costo = costo;
            this.orden = orden;
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

        public int getCantidad() {
            return cantidad;
        }

        public void setCantidad(int cantidad) {
            this.cantidad = cantidad;
        }

        public BigDecimal getCosto() {
            return costo;
        }

        public void setCosto(BigDecimal costo) {
            this.costo = costo;
        }

        public int getOrden() {
            return orden;
        }

        public void setOrden(int orden) {
            this.orden = orden;
        }
    }
}
