package com.mundialito.ia.clasificacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.mundialito.producto.Producto;
import com.mundialito.producto.ProductoRepository;
import com.mundialito.ia.dato.AlertaRiesgoDTO;
import com.mundialito.ia.dato.MetricasModeloDTO;
import com.mundialito.ia.venta.VentasDiarias;
import com.mundialito.ia.venta.VentasDiariasRepository;

/**
 * Servicio de clasificación para riesgo de stock de productos.
 *
 * Entrena 5 clasificadores (Regresión Logística, SVM, KNN, Árbol de Decisión,
 * AdaBoost) para predecir si un producto tiene riesgo de stock bajo.
 *
 * Características usadas:
 * - stock normalizado (stockGondola / stockDeseado)
 * - demanda promedio normalizada
 * - ratio stock/demanda
 *
 * Etiqueta: 1 = riesgo (stock ≤ umbral), 0 = sin riesgo
 */
@Service
public class ClasificacionService {

    private final ProductoRepository productoRepository;
    private final VentasDiariasRepository ventasDiariasRepository;

    private static final int STOCK_UMBRAL = 15;
    private static final int STOCK_DESEADO = 30;

    public ClasificacionService(
            ProductoRepository productoRepository,
            VentasDiariasRepository ventasDiariasRepository) {
        this.productoRepository = productoRepository;
        this.ventasDiariasRepository = ventasDiariasRepository;
    }

    /**
     * Clasifica todos los productos y devuelve alertas de riesgo.
     *
     * @return lista de alertas con métricas de cada modelo
     */
    public List<AlertaRiesgoDTO> clasificarRiesgo() {
        List<Producto> productos = productoRepository.findAll();
        if (productos.isEmpty()) return List.of();

        // Calcular demanda promedio por producto
        LocalDate hoy = LocalDate.now();
        LocalDate inicio = hoy.minusDays(30);
        List<VentasDiarias> historial = ventasDiariasRepository.findByFechaBetween(inicio, hoy);

        Map<Long, Double> demandaPromedioMap = historial.stream()
                .collect(Collectors.groupingBy(
                        VentasDiarias::getProductoId,
                        Collectors.averagingInt(VentasDiarias::getCantidadVendida)));

        // Construir datos de entrenamiento
        double[][] X = new double[productos.size()][3];
        int[] y = new int[productos.size()];

        for (int i = 0; i < productos.size(); i++) {
            Producto p = productos.get(i);
            double demanda = demandaPromedioMap.getOrDefault(p.getId(), 0.0);
            double stockNorm = (double) p.getStockGondola() / STOCK_DESEADO;
            double demandaNorm = demanda / STOCK_DESEADO;
            double ratio = demanda > 0 ? (double) p.getStockGondola() / demanda : p.getStockGondola();

            X[i][0] = stockNorm;
            X[i][1] = demandaNorm;
            X[i][2] = ratio;

            // Etiqueta: riesgo si stock ≤ umbral
            y[i] = p.getStockGondola() <= STOCK_UMBRAL ? 1 : 0;
        }

        // Entrenar modelos
        RegresionLogistica logistica = RegresionLogistica.entrenar(X, y, 0.1, 200);
        SVM svm = SVM.entrenar(X, y, 1.0, 0.01, 100);
        KNN knn = new KNN(X, y, 5);
        ArbolDecision arbol = ArbolDecision.entrenar(X, y, 5);
        Boosting boosting = Boosting.entrenar(X, y, 10);

        // Clasificar cada producto y usar votación mayoritaria
        List<AlertaRiesgoDTO> alertas = new ArrayList<>();
        for (int i = 0; i < productos.size(); i++) {
            Producto p = productos.get(i);
            double demanda = demandaPromedioMap.getOrDefault(p.getId(), 0.0);

            int predLogistica = logistica.predecir(X[i]);
            int predSvm = svm.predecir(X[i]);
            int predKnn = knn.predecir(X[i]);
            int predArbol = arbol.predecir(X[i]);
            int predBoosting = boosting.predecir(X[i]);

            // Votación mayoritaria
            int votosRiesgo = predLogistica + predSvm + predKnn + predArbol + predBoosting;
            int claseFinal = votosRiesgo >= 3 ? 1 : 0;
            double probabilidad = (double) votosRiesgo / 5.0;

            String riesgo;
            String motivo;
            if (claseFinal == 1) {
                if (p.getStockGondola() == 0) {
                    riesgo = "ALTO";
                    motivo = "Stock agotado en góndola";
                } else if (demanda > 0 && p.getStockGondola() / demanda < 2) {
                    riesgo = "ALTO";
                    motivo = "Stock insuficiente para cubrir 2 días de demanda promedio";
                } else {
                    riesgo = "MEDIO";
                    motivo = "Stock bajo respecto al umbral de " + STOCK_UMBRAL + " unidades";
                }
            } else {
                riesgo = "BAJO";
                motivo = "Stock adecuado";
            }

            alertas.add(new AlertaRiesgoDTO(
                    p.getId(),
                    p.getNombre(),
                    riesgo,
                    Math.round(probabilidad * 100.0) / 100.0,
                    p.getStockGondola(),
                    Math.round(demanda * 100.0) / 100.0,
                    motivo));
        }

        // Ordenar por riesgo: ALTO primero, luego MEDIO, luego BAJO
        alertas.sort((a, b) -> {
            int ordenA = a.getRiesgo().equals("ALTO") ? 0 : a.getRiesgo().equals("MEDIO") ? 1 : 2;
            int ordenB = b.getRiesgo().equals("ALTO") ? 0 : b.getRiesgo().equals("MEDIO") ? 1 : 2;
            return Integer.compare(ordenA, ordenB);
        });

        return alertas;
    }

    /**
     * Calcula las métricas de cada modelo individual.
     */
    public List<MetricasModeloDTO> calcularMetricas() {
        List<Producto> productos = productoRepository.findAll();
        if (productos.size() < 5) return List.of();

        // Calcular demanda promedio
        LocalDate hoy = LocalDate.now();
        LocalDate inicio = hoy.minusDays(30);
        List<VentasDiarias> historial = ventasDiariasRepository.findByFechaBetween(inicio, hoy);

        Map<Long, Double> demandaPromedioMap = historial.stream()
                .collect(Collectors.groupingBy(
                        VentasDiarias::getProductoId,
                        Collectors.averagingInt(VentasDiarias::getCantidadVendida)));

        // Construir datos
        double[][] X = new double[productos.size()][3];
        int[] y = new int[productos.size()];

        for (int i = 0; i < productos.size(); i++) {
            Producto p = productos.get(i);
            double demanda = demandaPromedioMap.getOrDefault(p.getId(), 0.0);
            X[i][0] = (double) p.getStockGondola() / STOCK_DESEADO;
            X[i][1] = demanda / STOCK_DESEADO;
            X[i][2] = demanda > 0 ? (double) p.getStockGondola() / demanda : p.getStockGondola();
            y[i] = p.getStockGondola() <= STOCK_UMBRAL ? 1 : 0;
        }

        // Entrenar y evaluar cada modelo
        List<MetricasModeloDTO> metricas = new ArrayList<>();

        RegresionLogistica logistica = RegresionLogistica.entrenar(X, y, 0.1, 200);
        metricas.add(evaluarModelo("Regresión Logística", logistica::predecir, X, y));

        SVM svm = SVM.entrenar(X, y, 1.0, 0.01, 100);
        metricas.add(evaluarModelo("SVM", svm::predecir, X, y));

        KNN knn = new KNN(X, y, 5);
        metricas.add(evaluarModelo("KNN", knn::predecir, X, y));

        ArbolDecision arbol = ArbolDecision.entrenar(X, y, 5);
        metricas.add(evaluarModelo("Árbol de Decisión", arbol::predecir, X, y));

        Boosting boosting = Boosting.entrenar(X, y, 10);
        metricas.add(evaluarModelo("AdaBoost", boosting::predecir, X, y));

        return metricas;
    }

    private MetricasModeloDTO evaluarModelo(
            String nombre, java.util.function.Function<double[], Integer> predictor, double[][] X, int[] y) {
        int tp = 0, fp = 0, fn = 0, tn = 0;

        for (int i = 0; i < y.length; i++) {
            int pred = predictor.apply(X[i]);
            if (pred == 1 && y[i] == 1) tp++;
            else if (pred == 1 && y[i] == 0) fp++;
            else if (pred == 0 && y[i] == 1) fn++;
            else tn++;
        }

        double precision = fp + tp > 0 ? (double) tp / (tp + fp) : 0;
        double recall = tp + fn > 0 ? (double) tp / (tp + fn) : 0;
        double f1 = (precision + recall > 0)
                ? 2 * precision * recall / (precision + recall) : 0;

        return new MetricasModeloDTO(
                nombre,
                Math.round(precision * 10000.0) / 10000.0,
                Math.round(recall * 10000.0) / 10000.0,
                Math.round(f1 * 10000.0) / 10000.0,
                tp, fp, fn, tn);
    }
}
