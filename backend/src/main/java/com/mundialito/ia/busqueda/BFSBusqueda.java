package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Set;
import java.util.HashSet;

/**
 * Breadth-First Search (BFS) para planificación de reposición de stock.
 *
 * Explora el espacio de estados en anchura, donde cada estado representa
 * un subconjunto de productos ya reponidos. Encuentra la secuencia mínima
 * de reposiciones (menor número de pasos) para alcanzar el stock deseado.
 *
 * El espacio de estados se modela como un bitmask donde cada bit indica
 * si un producto ha sido reponido. BFS garantiza encontrar la solución
 * con el menor número de pasos.
 */
public class BFSBusqueda implements BusquedaIA {

    private long nodosExpandidos = 0;

    @Override
    public ResultadoBusqueda buscar(List<EstadoReposicion> productosBajoStock, int stockMinimo) {
        long inicio = System.nanoTime();
        nodosExpandidos = 0;

        if (productosBajoStock.isEmpty()) {
            return new ResultadoBusqueda("BFS", List.of(), BigDecimal.ZERO, 0, 0.0);
        }

        int n = productosBajoStock.size();
        int meta = (1 << n) - 1; // todos los productos reponidos

        // BFS: cola de (mask, lista de pasos)
        Queue<int[]> cola = new LinkedList<>();
        cola.add(new int[]{0}); // mask inicial: ningún producto reponido
        Set<Integer> visitados = new HashSet<>();
        visitados.add(0);

        // Padre para reconstruir el camino: padre[mask] = mask anterior
        int[] padre = new int[1 << n];
        int[] productoAgregado = new int[1 << n]; // índice del producto agregado para llegar a este mask
        java.util.Arrays.fill(padre, -1);

        int metaEncontrada = -1;

        while (!cola.isEmpty()) {
            int currentMask = cola.poll()[0];
            nodosExpandidos++;

            if (currentMask == meta) {
                metaEncontrada = currentMask;
                break;
            }

            // Generar sucesores: agregar un producto no reponido
            for (int i = 0; i < n; i++) {
                if ((currentMask & (1 << i)) == 0) {
                    int nextMask = currentMask | (1 << i);
                    if (!visitados.contains(nextMask)) {
                        visitados.add(nextMask);
                        padre[nextMask] = currentMask;
                        productoAgregado[nextMask] = i;
                        cola.add(new int[]{nextMask});
                    }
                }
            }
        }

        List<ResultadoBusqueda.ReposicionPaso> pasos = new ArrayList<>();
        if (metaEncontrada > 0) {
            // Reconstruir camino desde la meta
            List<Integer> camino = new ArrayList<>();
            int mask = metaEncontrada;
            while (padre[mask] >= 0) {
                camino.add(productoAgregado[mask]);
                mask = padre[mask];
            }
            java.util.Collections.reverse(camino);

            BigDecimal costoTotal = BigDecimal.ZERO;
            for (int i = 0; i < camino.size(); i++) {
                int idx = camino.get(i);
                EstadoReposicion estado = productosBajoStock.get(idx);
                int cantidad = Math.max(0, stockMinimo - estado.getStockActual());
                BigDecimal costo = BigDecimal.valueOf(cantidad).multiply(estado.getPrecio());
                costoTotal = costoTotal.add(costo);
                pasos.add(new ResultadoBusqueda.ReposicionPaso(
                        estado.getProductoId(),
                        estado.getNombreProducto(),
                        cantidad,
                        costo,
                        i + 1));
            }
        }

        double tiempoMs = (System.nanoTime() - inicio) / 1_000_000.0;
        return new ResultadoBusqueda("BFS", pasos, costoTotalDe(pasos), nodosExpandidos, tiempoMs);
    }

    private BigDecimal costoTotalDe(List<ResultadoBusqueda.ReposicionPaso> pasos) {
        return pasos.stream()
                .map(ResultadoBusqueda.ReposicionPaso::getCosto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public String nombre() {
        return "BFS";
    }
}
