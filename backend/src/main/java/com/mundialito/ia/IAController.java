package com.mundialito.ia;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mundialito.ia.busqueda.BusquedaService;
import com.mundialito.ia.busqueda.ResultadoBusqueda;
import com.mundialito.ia.busqueda.ResultadoBusqueda.ReposicionPaso;
import com.mundialito.ia.clasificacion.ClasificacionService;
import com.mundialito.ia.dato.AlertaRiesgoDTO;
import com.mundialito.ia.dato.ComparacionAlgoritmosDTO;
import com.mundialito.ia.dato.ComparacionAlgoritmosDTO.AlgoritmoResultadoDTO;
import com.mundialito.ia.dato.ComparacionAlgoritmosDTO.PasoReposicionDTO;
import com.mundialito.ia.dato.MetricasModeloDTO;
import com.mundialito.ia.dato.PrediccionDemandaDTO;
import com.mundialito.ia.regresion.RegresionService;

/**
 * Controller REST para las APIs de IA del minimarket.
 *
 * Endpoints:
 * - GET /api/ia/reposicion - Plan de reposición con 4 algoritmos de búsqueda
 * - GET /api/ia/demanda/{productoId} - Predicción de demanda por producto
 * - GET /api/ia/riesgo - Clasificación de riesgo de todos los productos
 * - GET /api/ia/comparar - Comparación de todos los modelos con métricas
 */
@RestController
@RequestMapping("/api/ia")
public class IAController {

    private final BusquedaService busquedaService;
    private final RegresionService regresionService;
    private final ClasificacionService clasificacionService;

    public IAController(
            BusquedaService busquedaService,
            RegresionService regresionService,
            ClasificacionService clasificacionService) {
        this.busquedaService = busquedaService;
        this.regresionService = regresionService;
        this.clasificacionService = clasificacionService;
    }

    /**
     * GET /api/ia/reposicion?stockUmbral=15&stockMinimo=30&diasHistorial=30
     *
     * Genera planes de reposición usando BFS, DFS, A* y Hill Climbing.
     */
    @GetMapping("/reposicion")
    public ResponseEntity<ComparacionAlgoritmosDTO> reposicion(
            @RequestParam(defaultValue = "15") int stockUmbral,
            @RequestParam(defaultValue = "30") int stockMinimo,
            @RequestParam(defaultValue = "30") int diasHistorial) {

        List<ResultadoBusqueda> resultados = busquedaService
                .generarPlanesReposicion(stockUmbral, stockMinimo, diasHistorial);

        // Convertir a DTOs
        AlgoritmoResultadoDTO bfsDto = aDTO(resultados.get(0));
        AlgoritmoResultadoDTO dfsDto = aDTO(resultados.get(1));
        AlgoritmoResultadoDTO aStarDto = aDTO(resultados.get(2));
        AlgoritmoResultadoDTO hcDto = aDTO(resultados.get(3));

        return ResponseEntity.ok(new ComparacionAlgoritmosDTO(bfsDto, dfsDto, aStarDto, hcDto));
    }

    /**
     * GET /api/ia/demanda/{productoId}?diasHistorial=30
     *
     * Predice la demanda de un producto usando regresión lineal y polinomial.
     */
    @GetMapping("/demanda/{productoId}")
    public ResponseEntity<PrediccionDemandaDTO> demanda(
            @PathVariable Long productoId,
            @RequestParam(defaultValue = "30") int diasHistorial) {

        PrediccionDemandaDTO dto = regresionService.predecirDemanda(productoId, diasHistorial);
        return ResponseEntity.ok(dto);
    }

    /**
     * GET /api/ia/riesgo
     *
     * Clasifica todos los productos por riesgo de stock usando 5 modelos.
     */
    @GetMapping("/riesgo")
    public ResponseEntity<List<AlertaRiesgoDTO>> riesgo() {
        List<AlertaRiesgoDTO> alertas = clasificacionService.clasificarRiesgo();
        return ResponseEntity.ok(alertas);
    }

    /**
     * GET /api/ia/comparar
     *
     * Compara todos los modelos de clasificación con métricas (precisión, recall, F1).
     */
    @GetMapping("/comparar")
    public ResponseEntity<List<MetricasModeloDTO>> comparar() {
        List<MetricasModeloDTO> metricas = clasificacionService.calcularMetricas();
        return ResponseEntity.ok(metricas);
    }

    private AlgoritmoResultadoDTO aDTO(ResultadoBusqueda r) {
        List<PasoReposicionDTO> pasos = r.getPasos().stream()
                .map(p -> new PasoReposicionDTO(
                        p.getProductoId(),
                        p.getNombreProducto(),
                        p.getCantidad(),
                        p.getCosto(),
                        p.getOrden()))
                .toList();
        return new AlgoritmoResultadoDTO(
                r.getAlgoritmo(),
                r.getCostoTotal(),
                r.getNodosExpandidos(),
                r.getTiempoMs(),
                pasos);
    }
}
