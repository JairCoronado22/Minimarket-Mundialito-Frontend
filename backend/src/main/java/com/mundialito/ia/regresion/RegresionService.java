package com.mundialito.ia.regresion;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.mundialito.producto.Producto;
import com.mundialito.producto.ProductoRepository;
import com.mundialito.ia.dato.PrediccionDemandaDTO;
import com.mundialito.ia.venta.VentasDiarias;
import com.mundialito.ia.venta.VentasDiariasRepository;

/**
 * Servicio de regresión para predicción de demanda de productos.
 *
 * Usa datos históricos de ventas_diarias para entrenar modelos de
 * regresión lineal y polinomial, y predice la demanda futura.
 */
@Service
public class RegresionService {

    private final ProductoRepository productoRepository;
    private final VentasDiariasRepository ventasDiariasRepository;

    public RegresionService(
            ProductoRepository productoRepository,
            VentasDiariasRepository ventasDiariasRepository) {
        this.productoRepository = productoRepository;
        this.ventasDiariasRepository = ventasDiariasRepository;
    }

    /**
     * Predice la demanda de un producto usando regresión lineal y polinomial.
     *
     * @param productoId    ID del producto
     * @param diasHistorial días de historial para entrenar (default 30)
     * @return DTO con la predicción y métricas de ambos modelos
     */
    public PrediccionDemandaDTO predecirDemanda(Long productoId, int diasHistorial) {
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado: " + productoId));

        LocalDate hoy = LocalDate.now();
        LocalDate inicio = hoy.minusDays(diasHistorial);
        List<VentasDiarias> historial = ventasDiariasRepository
                .findByProductoIdAndFechaBetweenOrderByFechaAsc(productoId, inicio, hoy);

        if (historial.isEmpty()) {
            return new PrediccionDemandaDTO(
                    productoId, producto.getNombre(), 0.0, 0.0, 0.0,
                    0.0, 0.0, "Sin datos", diasHistorial);
        }

        // Convertir a arrays numéricos: x = día secuencial, y = cantidad vendida
        int n = historial.size();
        double[] x = new double[n];
        double[] y = new double[n];
        for (int i = 0; i < n; i++) {
            x[i] = i; // día 0, 1, 2, ...
            y[i] = historial.get(i).getCantidadVendida();
        }

        // Entrenar regresión lineal
        RegresionLineal lineal = RegresionLineal.entrenar(x, y);
        double prediccionLineal = lineal.predecir(n); // siguiente día
        double maeLineal = lineal.calcularMAE(x, y);
        double rmseLineal = lineal.calcularRMSE(x, y);

        // Entrenar regresión polinomial (grado 2) si hay suficientes datos
        double prediccionPolinomial = 0;
        double maePolinomial = 0;
        double rmsePolinomial = 0;
        String modeloMejor = "Lineal";

        if (n >= 3) {
            RegresionPolinomial polinomial = RegresionPolinomial.entrenar(x, y, 2);
            prediccionPolinomial = polinomial.predecir(n);
            maePolinomial = polinomial.calcularMAE(x, y);
            rmsePolinomial = polinomial.calcularRMSE(x, y);

            // Elegir el modelo con menor MAE
            if (maePolinomial < maeLineal) {
                modeloMejor = "Polinomial";
            }
        }

        double prediccionFinal = modeloMejor.equals("Polinomial") ? prediccionPolinomial : prediccionLineal;
        double maeFinal = modeloMejor.equals("Polinomial") ? maePolinomial : maeLineal;
        double rmseFinal = modeloMejor.equals("Polinomial") ? rmsePolinomial : rmseLineal;

        // Intervalo de confianza simple: predicción ± 2*RMSE
        double intervaloInferior = Math.max(0, prediccionFinal - 2 * rmseFinal);
        double intervaloSuperior = prediccionFinal + 2 * rmseFinal;

        return new PrediccionDemandaDTO(
                productoId,
                producto.getNombre(),
                Math.round(prediccionFinal * 100.0) / 100.0,
                Math.round(intervaloInferior * 100.0) / 100.0,
                Math.round(intervaloSuperior * 100.0) / 100.0,
                Math.round(maeFinal * 10000.0) / 10000.0,
                Math.round(rmseFinal * 10000.0) / 10000.0,
                modeloMejor,
                diasHistorial);
    }

    /**
     * Predice la demanda con valores por defecto.
     */
    public PrediccionDemandaDTO predecirDemanda(Long productoId) {
        return predecirDemanda(productoId, 30);
    }
}
