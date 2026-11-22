package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.mundialito.producto.Producto;
import com.mundialito.producto.ProductoRepository;
import com.mundialito.ia.venta.VentasDiarias;
import com.mundialito.ia.venta.VentasDiariasRepository;

/**
 * Servicio que orquesta los 4 algoritmos de búsqueda para planificación
 * de reposición de stock.
 *
 * Identifica los productos con stock bajo, calcula la demanda promedio
 * histórica desde ventas_diarias, y ejecuta BFS, DFS, A* y Hill Climbing
 * para generar planes de reposición comparables.
 */
@Service
public class BusquedaService {

    private final ProductoRepository productoRepository;
    private final VentasDiariasRepository ventasDiariasRepository;

    private final BusquedaIA bfs;
    private final BusquedaIA dfs;
    private final BusquedaIA aStar;
    private final BusquedaIA hillClimbing;

    public BusquedaService(
            ProductoRepository productoRepository,
            VentasDiariasRepository ventasDiariasRepository) {
        this.productoRepository = productoRepository;
        this.ventasDiariasRepository = ventasDiariasRepository;
        this.bfs = new BFSBusqueda();
        this.dfs = new DFSBusqueda();
        this.aStar = new AStarBusqueda();
        this.hillClimbing = new HillClimbingBusqueda();
    }

    /**
     * Genera planes de reposición usando los 4 algoritmos de búsqueda.
     *
     * @param stockUmbral stock máximo considerado como "bajo" (default 15)
     * @param stockMinimo stock deseado para cada producto (default 30)
     * @param diasHistorial días de historial para calcular demanda promedio (default 30)
     * @return lista de resultados, uno por algoritmo
     */
    public List<ResultadoBusqueda> generarPlanesReposicion(
            int stockUmbral, int stockMinimo, int diasHistorial) {

        // Obtener productos con stock bajo
        List<Producto> productosBajoStock = productoRepository
                .findAllByStockGondolaLessThanEqual(stockUmbral);

        if (productosBajoStock.isEmpty()) {
            List<ResultadoBusqueda> vacios = new ArrayList<>();
            for (BusquedaIA algoritmo : List.of(bfs, dfs, aStar, hillClimbing)) {
                vacios.add(new ResultadoBusqueda(algoritmo.nombre(), List.of(),
                        BigDecimal.ZERO, 0, 0.0));
            }
            return vacios;
        }

        // Calcular demanda promedio por producto
        LocalDate hoy = LocalDate.now();
        LocalDate inicio = hoy.minusDays(diasHistorial);
        List<VentasDiarias> historial = ventasDiariasRepository
                .findByFechaBetween(inicio, hoy);

        Map<Long, Double> demandaPromedioMap = historial.stream()
                .collect(Collectors.groupingBy(
                        VentasDiarias::getProductoId,
                        Collectors.averagingInt(VentasDiarias::getCantidadVendida)));

        // Construir estados de reposición
        List<EstadoReposicion> estados = productosBajoStock.stream()
                .map(p -> new EstadoReposicion(
                        p.getId(),
                        p.getNombre(),
                        p.getStockGondola(),
                        p.getStockAlmacen(),
                        p.getPrecio(),
                        demandaPromedioMap.getOrDefault(p.getId(), 0.0),
                        stockMinimo))
                .collect(Collectors.toList());

        // Ejecar los 4 algoritmos
        return List.of(
                bfs.buscar(estados, stockMinimo),
                dfs.buscar(estados, stockMinimo),
                aStar.buscar(estados, stockMinimo),
                hillClimbing.buscar(estados, stockMinimo));
    }

    /**
     * Genera planes de reposición con valores por defecto.
     */
    public List<ResultadoBusqueda> generarPlanesReposicion() {
        return generarPlanesReposicion(15, 30, 30);
    }
}
