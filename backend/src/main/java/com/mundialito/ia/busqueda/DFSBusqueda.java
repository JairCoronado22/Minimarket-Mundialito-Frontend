package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.Stack;

/**
 * Depth-First Search (DFS) para planificación de reposición de stock.
 *
 * Explora el espacio de estados en profundidad, priorizando la exploración
 * completa de una rama antes de retroceder. A diferencia de BFS, no garantiza
 * la solución con menor número de pasos, pero usa menos memoria.
 *
 * El espacio de estados se modela como un bitmask donde cada bit indica
 * si un producto ha sido reponido. DFS encuentra la primera solución completa
 * que alcanza todos los productos reponidos.
 */
public class DFSBusqueda implements BusquedaIA {

    private long nodosExpandidos = 0;

    @Override
    public ResultadoBusqueda buscar(List<EstadoReposicion> productosBajoStock, int stockMinimo) {
        long inicio = System.nanoTime();
        nodosExpandidos = 0;

        if (productosBajoStock.isEmpty()) {
            return new ResultadoBusqueda("DFS", List.of(), BigDecimal.ZERO, 0, 0.0);
        }

        int n = productosBajoStock.size();
        int meta = (1 << n) - 1; // todos los productos reponidos

        // DFS iterativo con pila de (mask, camino)
        Stack<int[]> pila = new Stack<>();
        Stack<List<Integer>> caminos = new Stack<>();
        pila.push(new int[]{0});
        caminos.push(new ArrayList<>());

        Set<Integer> visitados = new HashSet<>();

        int metaEncontrada = -1;
        List<Integer> mejorCamino = new ArrayList<>();

        while (!pila.isEmpty()) {
            int currentMask = pila.pop()[0];
            List<Integer> caminoActual = caminos.pop();
            nodosExpandidos++;

            if (currentMask == meta) {
                metaEncontrada = currentMask;
                mejorCamino = new ArrayList<>(caminoActual);
                break;
            }

            if (visitados.contains(currentMask)) {
                continue;
            }
            visitados.add(currentMask);

            // Generar sucesores en orden inverso para que DFS explore el primero primero
            for (int i = n - 1; i >= 0; i--) {
                if ((currentMask & (1 << i)) == 0) {
                    int nextMask = currentMask | (1 << i);
                    if (!visitados.contains(nextMask)) {
                        List<Integer> nuevoCamino = new ArrayList<>(caminoActual);
                        nuevoCamino.add(i);
                        pila.push(new int[]{nextMask});
                        caminos.add(nuevoCamino);
                    }
                }
            }
        }

        List<ResultadoBusqueda.ReposicionPaso> pasos = new ArrayList<>();
        if (metaEncontrada > 0) {
            BigDecimal costoTotal = BigDecimal.ZERO;
            for (int i = 0; i < mejorCamino.size(); i++) {
                int idx = mejorCamino.get(i);
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
        return new ResultadoBusqueda("DFS", pasos, costoTotalDe(pasos), nodosExpandidos, tiempoMs);
    }

    private BigDecimal costoTotalDe(List<ResultadoBusqueda.ReposicionPaso> pasos) {
        return pasos.stream()
                .map(ResultadoBusqueda.ReposicionPaso::getCosto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public String nombre() {
        return "DFS";
    }
}
