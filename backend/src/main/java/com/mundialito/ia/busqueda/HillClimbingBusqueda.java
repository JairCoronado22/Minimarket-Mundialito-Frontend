package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Hill Climbing (Ascensión de Colinas) para planificación de reposición de stock.
 *
 * Comienza con un plan inicial (orden aleatorio de productos) y lo mejora
 * incrementalmente intercambiando pares de productos adyacentes en el orden
 * de reposición. Acepta un cambio solo si reduce el costo total ponderado
 * por urgencia.
 *
 * La función de evaluación del plan es el costo total de reposición ponderado
 * por la urgencia de cada producto: productos más urgentes se reponen primero.
 *
 * No garantiza optimalidad global (puede quedar en óptimo local), pero es
 * eficiente en tiempo y memoria para espacios de búsqueda grandes.
 */
public class HillClimbingBusqueda implements BusquedaIA {

    private static final int MAX_ITERACIONES = 1000;
    private long nodosExpandidos = 0;

    @Override
    public ResultadoBusqueda buscar(List<EstadoReposicion> productosBajoStock, int stockMinimo) {
        long inicio = System.nanoTime();
        nodosExpandidos = 0;

        if (productosBajoStock.isEmpty()) {
            return new ResultadoBusqueda("Hill Climbing", List.of(), BigDecimal.ZERO, 0, 0.0);
        }

        // Estado inicial: ordenar por urgencia (más urgente primero)
        List<Integer> ordenActual = new ArrayList<>();
        for (int i = 0; i < productosBajoStock.size(); i++) {
            ordenActual.add(i);
        }
        // Ordenar por urgencia ascendente (menor urgencia = más urgente)
        ordenActual.sort(Comparator.comparingDouble(i -> productosBajoStock.get(i).getUrgencia()));

        nodosExpandidos++;
        double costoActual = evaluar(ordenActual, productosBajoStock, stockMinimo);

        // Hill Climbing: intentar intercambiar pares adyacentes
        boolean mejora = true;
        int iteraciones = 0;
        while (mejora && iteraciones < MAX_ITERACIONES) {
            mejora = false;
            iteraciones++;

            for (int i = 0; i < ordenActual.size() - 1; i++) {
                // Generar vecino: intercambiar i y i+1
                List<Integer> vecino = new ArrayList<>(ordenActual);
                Collections.swap(vecino, i, i + 1);
                nodosExpandidos++;

                double costoVecino = evaluar(vecino, productosBajoStock, stockMinimo);
                if (costoVecino < costoActual) {
                    costoActual = costoVecino;
                    ordenActual = vecino;
                    mejora = true;
                }
            }
        }

        // Construir pasos de reposición
        List<ResultadoBusqueda.ReposicionPaso> pasos = new ArrayList<>();
        for (int i = 0; i < ordenActual.size(); i++) {
            int idx = ordenActual.get(i);
            EstadoReposicion estado = productosBajoStock.get(idx);
            int cantidad = Math.max(0, stockMinimo - estado.getStockActual());
            BigDecimal costo = BigDecimal.valueOf(cantidad).multiply(estado.getPrecio());
            pasos.add(new ResultadoBusqueda.ReposicionPaso(
                    estado.getProductoId(),
                    estado.getNombreProducto(),
                    cantidad,
                    costo,
                    i + 1));
        }

        double tiempoMs = (System.nanoTime() - inicio) / 1_000_000.0;
        return new ResultadoBusqueda("Hill Climbing", pasos, costoTotalDe(pasos), nodosExpandidos, tiempoMs);
    }

    /**
     * Evalúa un plan de reposición: costo total ponderado por posición.
     * Productos más urgentes en posiciones tempranas reducen el score.
     */
    private double evaluar(List<Integer> orden, List<EstadoReposicion> productos, int stockMinimo) {
        double score = 0.0;
        for (int i = 0; i < orden.size(); i++) {
            EstadoReposicion estado = productos.get(orden.get(i));
            int cantidad = Math.max(0, stockMinimo - estado.getStockActual());
            double costo = BigDecimal.valueOf(cantidad).multiply(estado.getPrecio()).doubleValue();
            // Ponderar por posición: productos en posiciones tempranas tienen menor peso
            // pero mayor urgencia debería estar primero
            double urgencia = estado.getUrgencia();
            // Score: costo * (posición + 1) / (urgencia + 1)
            // Menor score = mejor plan
            score += costo * (i + 1) / (urgencia + 0.001);
        }
        return score;
    }

    private BigDecimal costoTotalDe(List<ResultadoBusqueda.ReposicionPaso> pasos) {
        return pasos.stream()
                .map(ResultadoBusqueda.ReposicionPaso::getCosto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public String nombre() {
        return "Hill Climbing";
    }
}
