package com.mundialito.ia.clasificacion;

/**
 * Regresión logística para clasificación binaria.
 *
 * Usa la función sigmoide y gradiente descendente para aprender
 * los pesos que separan dos clases (riesgo alto vs riesgo bajo).
 *
 * P(y=1|x) = σ(w₀ + w₁*x₁ + w₂*x₂ + ...)
 * donde σ(z) = 1 / (1 + e^(-z))
 */
public class RegresionLogistica {

    private final double[] pesos;
    private final int numCaracteristicas;

    private RegresionLogistica(double[] pesos) {
        this.pesos = pesos;
        this.numCaracteristicas = pesos.length - 1; // -1 para el bias
    }

    /**
     * Entrena el modelo con gradiente descendente.
     *
     * @param X matriz de características (muestras x características)
     * @param y etiquetas binarias (0 o 1)
     * @param learningRate tasa de aprendizaje
     * @param iteraciones número de iteraciones de entrenamiento
     * @return modelo entrenado
     */
    public static RegresionLogistica entrenar(
            double[][] X, int[] y, double learningRate, int iteraciones) {
        int n = X.length;
        if (n == 0) throw new IllegalArgumentException("No hay datos de entrenamiento");
        int m = X[0].length;

        double[] pesos = new double[m + 1]; // +1 para el bias

        for (int iter = 0; iter < iteraciones; iter++) {
            double[] gradiente = new double[m + 1];

            for (int i = 0; i < n; i++) {
                double predicion = sigmoide(pesos, X[i]);
                double error = predicion - y[i];

                gradiente[0] += error; // bias
                for (int j = 0; j < m; j++) {
                    gradiente[j + 1] += error * X[i][j];
                }
            }

            // Actualizar pesos
            pesos[0] -= learningRate * gradiente[0] / n;
            for (int j = 0; j < m; j++) {
                pesos[j + 1] -= learningRate * gradiente[j + 1] / n;
            }
        }

        return new RegresionLogistica(pesos);
    }

    /**
     * Predice la probabilidad de clase 1.
     */
    public double predecirProbabilidad(double[] x) {
        return sigmoide(pesos, x);
    }

    /**
     * Predice la clase (0 o 1) con umbral 0.5.
     */
    public int predecir(double[] x) {
        return predecirProbabilidad(x) >= 0.5 ? 1 : 0;
    }

    private static double sigmoide(double[] pesos, double[] x) {
        double z = pesos[0]; // bias
        for (int j = 0; j < x.length && j < pesos.length - 1; j++) {
            z += pesos[j + 1] * x[j];
        }
        // Limitar para evitar overflow
        z = Math.max(-500, Math.min(500, z));
        return 1.0 / (1.0 + Math.exp(-z));
    }

    public int getNumCaracteristicas() {
        return numCaracteristicas;
    }
}
