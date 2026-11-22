package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;
import java.util.Set;
import java.util.HashSet;

/**
 * A* (A-Star) para planificación de reposición de stock.
 *
 * Usa una función heurística para guiar la búsqueda hacia el estado meta
 * (todos los productos reponidos) con el menor costo total.
 *
 * La función de evaluación f(n) = g(n) + h(n) donde:
 * - g(n) = costo acumulado de reposición hasta el estado actual
 * - h(n) = heurística admissible: costo estimado de los productos restantes
 *           basado en su urgencia (stock actual / demanda promedio)
 *
 * La heurística es admissible (no sobreestima) porque usa el costo real
 * de reposición de cada producto restante, garantizando optimalidad.
 */
public class AStarBusqueda implements BusquedaIA {

    private long nodosExpandidos = 0;

    @Override
    public ResultadoBusqueda buscar(List<EstadoReposicion> productosBajoStock, int stockMinimo) {
        long inicio = System.nanoTime();
        nodosExpandidos = 0;

        if (productosBajoStock.isEmpty()) {
            return new ResultadoBusqueda("A*", List.of(), BigDecimal.ZERO, 0, 0.0);
        }

        int n = productosBajoStock.size();
        int meta = (1 << n) - 1;

        // Nodo A*: (mask, gCost, fCost, padreMask, productoAgregado)
        class Nodo {
            int mask;
            double gCost; // costo acumulado
            double fCost; // g + h
            int padreMask;
            int productoAgregado;

            Nodo(int mask, double gCost, double fCost, int padreMask, int productoAgregado) {
                this.mask = mask;
                this.gCost = gCost;
                this.fCost = fCost;
                this.padreMask = padreMask;
                this.productoAgregado = productoAgregado;
            }
        }

        PriorityQueue<Nodo> abierta = new PriorityQueue<>(Comparator.comparingDouble(nd -> nd.fCost));
        Set<Integer> cerrada = new HashSet<>();

        double hInicial = heuristica(0, productosBajoStock, stockMinimo);
        abierta.add(new Nodo(0, 0.0, hInicial, -1, -1));

        int metaEncontrada = -1;

        while (!abierta.isEmpty()) {
            Nodo current = abierta.poll();
            nodosExpandidos++;

            if (current.mask == meta) {
                metaEncontrada = current.mask;
                break;
            }

            if (cerrada.contains(current.mask)) {
                continue;
            }
            cerrada.add(current.mask);

            // Generar sucesores
            for (int i = 0; i < n; i++) {
                if ((current.mask & (1 << i)) == 0) {
                    int nextMask = current.mask | (1 << i);
                    if (!cerrada.contains(nextMask)) {
                        EstadoReposicion estado = productosBajoStock.get(i);
                        int cantidad = Math.max(0, stockMinimo - estado.getStockActual());
                        double costoPaso = BigDecimal.valueOf(cantidad).multiply(estado.getPrecio()).doubleValue();
                        double gNext = current.gCost + costoPaso;
                        double hNext = heuristica(nextMask, productosBajoStock, stockMinimo);
                        abierta.add(new Nodo(nextMask, gNext, gNext + hNext, current.mask, i));
                    }
                }
            }
        }

        List<ResultadoBusqueda.ReposicionPaso> pasos = new ArrayList<>();
        if (metaEncontrada > 0) {
            // Ordenar por urgencia: menor ratio stock/demanda = más urgente primero
            List<EstadoReposicion> ordenados = new ArrayList<>(productosBajoStock);
            ordenados.sort(Comparator.comparingDouble(EstadoReposicion::getUrgencia));

            for (int i = 0; i < ordenados.size(); i++) {
                EstadoReposicion estado = ordenados.get(i);
                int cantidad = Math.max(0, stockMinimo - estado.getStockActual());
                BigDecimal costo = BigDecimal.valueOf(cantidad).multiply(estado.getPrecio());
                pasos.add(new ResultadoBusqueda.ReposicionPaso(
                        estado.getProductoId(),
                        estado.getNombreProducto(),
                        cantidad,
                        costo,
                        i + 1));
            }
        }

        double tiempoMs = (System.nanoTime() - inicio) / 1_000_000.0;
        return new ResultadoBusqueda("A*", pasos, costoTotalDe(pasos), nodosExpandidos, tiempoMs);
    }

    /**
     * Heurística admissible: suma del costo de reposición de los productos
     * que aún no han sido reponidos (bits en 0 en el mask).
     */
    private double heuristica(int mask, List<EstadoReposicion> productos, int stockMinimo) {
        double h = 0.0;
        for (int i = 0; i < productos.size(); i++) {
            if ((mask & (1 << i)) == 0) {
                EstadoReposicion estado = productos.get(i);
                int cantidad = Math.max(0, stockMinimo - estado.getStockActual());
                h += BigDecimal.valueOf(cantidad).multiply(estado.getPrecio()).doubleValue();
            }
        }
        return h;
    }

    private BigDecimal costoTotalDe(List<ResultadoBusqueda.ReposicionPaso> pasos) {
        return pasos.stream()
                .map(ResultadoBusqueda.ReposicionPaso::getCosto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public String nombre() {
        return "A*";
    }
}
