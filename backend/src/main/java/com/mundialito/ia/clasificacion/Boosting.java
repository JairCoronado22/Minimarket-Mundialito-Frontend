package com.mundialito.ia.clasificacion;

/**
 * AdaBoost ensemble para clasificación binaria.
 *
 * Combina múltiples clasificadores débiles (árboles de decisión de profundidad 1)
 * ponderando cada uno según su precisión. Los clasificadores posteriores se
 * enfocan en las muestras que los anteriores clasificaron mal.
 *
 * La predicción final es: sign(Σ αᵢ * hᵢ(x))
 * donde αᵢ es el peso del clasificador i y hᵢ es su predicción.
 */
public class Boosting {

    private final ClasificadorDebil[] clasificadores;
    private final double[] pesos;

    /**
     * Clasificador débil: árbol de decisión de profundidad 1 (stump).
     */
    static class ClasificadorDebil {
        int caracteristicaIndex;
        double umbral;
        int direccion; // 1 si ≥ umbral → clase 1, -1 si < umbral → clase 1

        public int predecir(double[] x) {
            boolean cond = x[caracteristicaIndex] >= umbral;
            return (cond && direccion == 1) || (!cond && direccion == -1) ? 1 : 0;
        }
    }

    /**
     * Entrena el ensemble AdaBoost.
     *
     * @param X matriz de características
     * @param y etiquetas binarias
     * @param numClasificadores número de clasificadores débiles
     * @return modelo entrenado
     */
    public static Boosting entrenar(double[][] X, int[] y, int numClasificadores) {
        int n = X.length;
        if (n == 0) throw new IllegalArgumentException("No hay datos");

        ClasificadorDebil[] clasificadores = new ClasificadorDebil[numClasificadores];
        double[] alfas = new double[numClasificadores];
        double[] pesosMuestra = new double[n];

        // Inicializar pesos uniformes
        for (int i = 0; i < n; i++) pesosMuestra[i] = 1.0 / n;

        for (int t = 0; t < numClasificadores; t++) {
            // Encontrar el mejor stump
            int m = X[0].length;
            double mejorError = Double.MAX_VALUE;
            int mejorCaracteristica = 0;
            double mejorUmbral = 0;
            int mejorDireccion = 1;

            for (int j = 0; j < m; j++) {
                // Valores únicos para umbral
                java.util.List<Double> valores = new java.util.ArrayList<>();
                for (int i = 0; i < n; i++) valores.add(X[i][j]);
                valores.sort(Double::compareTo);

                for (int v = 0; v < valores.size() - 1; v++) {
                    double umbral = (valores.get(v) + valores.get(v + 1)) / 2.0;

                    for (int dir = -1; dir <= 1; dir += 2) {
                        double error = 0;
                        for (int i = 0; i < n; i++) {
                            boolean cond = X[i][j] >= umbral;
                            int pred = (cond && dir == 1) || (!cond && dir == -1) ? 1 : 0;
                            if (pred != y[i]) {
                                error += pesosMuestra[i];
                            }
                        }

                        if (error < mejorError) {
                            mejorError = error;
                            mejorCaracteristica = j;
                            mejorUmbral = umbral;
                            mejorDireccion = dir;
                        }
                    }
                }
            }

            // Crear clasificador débil
            ClasificadorDebil stump = new ClasificadorDebil();
            stump.caracteristicaIndex = mejorCaracteristica;
            stump.umbral = mejorUmbral;
            stump.direccion = mejorDireccion;
            clasificadores[t] = stump;

            // Calcular alpha
            mejorError = Math.max(mejorError, 1e-10);
            mejorError = Math.min(mejorError, 1.0 - 1e-10);
            alfas[t] = 0.5 * Math.log((1.0 - mejorError) / mejorError);

            // Actualizar pesos de muestras
            double sumaPesos = 0;
            for (int i = 0; i < n; i++) {
                int pred = clasificadores[t].predecir(X[i]);
                if (pred != y[i]) {
                    pesosMuestra[i] *= Math.exp(alfas[t]);
                } else {
                    pesosMuestra[i] *= Math.exp(-alfas[t]);
                }
                sumaPesos += pesosMuestra[i];
            }
            for (int i = 0; i < n; i++) pesosMuestra[i] /= sumaPesos;
        }

        return new Boosting(clasificadores, alfas);
    }

    private Boosting(ClasificadorDebil[] clasificadores, double[] alfas) {
        this.clasificadores = clasificadores;
        this.pesos = alfas;
    }

    /**
     * Predice la clase usando votación ponderada.
     */
    public int predecir(double[] x) {
        double suma = 0;
        for (int t = 0; t < clasificadores.length; t++) {
            int pred = clasificadores[t].predecir(x);
            suma += pesos[t] * (pred == 1 ? 1.0 : -1.0);
        }
        return suma >= 0 ? 1 : 0;
    }

    /**
     * Predice la "probabilidad" basada en la suma ponderada normalizada.
     */
    public double predecirProbabilidad(double[] x) {
        double suma = 0;
        for (int t = 0; t < clasificadores.length; t++) {
            int pred = clasificadores[t].predecir(x);
            suma += pesos[t] * (pred == 1 ? 1.0 : -1.0);
        }
        // Normalizar con sigmoide
        return 1.0 / (1.0 + Math.exp(-2 * suma));
    }

    public int getNumClasificadores() {
        return clasificadores.length;
    }
}
