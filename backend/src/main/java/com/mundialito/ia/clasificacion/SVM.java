package com.mundialito.ia.clasificacion;

/**
 * Support Vector Machine (SVM) con kernel lineal para clasificación binaria.
 *
 * Encuentra el hiperplano óptimo que maximiza el margen entre las dos clases.
 * Usa el algoritmo de gradiente descendente simplificado para aprender los pesos.
 *
 * La decisión se basa en: sign(w·x + b)
 */
public class SVM {

    private final double[] pesos;
    private final double bias;
    private final double c; // parámetro de regularización

    private SVM(double[] pesos, double bias, double c) {
        this.pesos = pesos;
        this.bias = bias;
        this.c = c;
    }

    /**
     * Entrena el SVM con gradiente descendente.
     *
     * @param X matriz de características
     * @param y etiquetas binarias (-1 o 1)
     * @param c parámetro de regularización (penalización por error)
     * @param learningRate tasa de aprendizaje
     * @param iteraciones número de iteraciones
     * @return modelo entrenado
     */
    public static SVM entrenar(
            double[][] X, int[] y, double c, double learningRate, int iteraciones) {
        int n = X.length;
        if (n == 0) throw new IllegalArgumentException("No hay datos de entrenamiento");
        int m = X[0].length;

        double[] pesos = new double[m];
        double bias = 0.0;

        for (int iter = 0; iter < iteraciones; iter++) {
            for (int i = 0; i < n; i++) {
                double decision = decisionFunction(pesos, bias, X[i]);
                int label = (y[i] == 0) ? -1 : 1; // convertir 0/1 a -1/1

                if (label * decision < 1.0) {
                    // Error de clasificación: actualizar pesos
                    for (int j = 0; j < m; j++) {
                        pesos[j] += learningRate * (label * X[i][j] - pesos[j]);
                    }
                    bias += learningRate * label;
                } else {
                    // Dentro del margen correcto: solo regularización
                    for (int j = 0; j < m; j++) {
                        pesos[j] -= learningRate * pesos[j];
                    }
                }
            }
        }

        return new SVM(pesos, bias, c);
    }

    /**
     * Predice la clase (0 o 1).
     */
    public int predecir(double[] x) {
        return decisionFunction(pesos, bias, x) >= 0 ? 1 : 0;
    }

    /**
     * Predice la "confianza" (valor de la función de decisión normalizado).
     */
    public double predecirConfianza(double[] x) {
        double decision = decisionFunction(pesos, bias, x);
        // Normalizar a [0, 1] usando sigmoide
        return 1.0 / (1.0 + Math.exp(-decision));
    }

    private static double decisionFunction(double[] pesos, double bias, double[] x) {
        double suma = bias;
        for (int j = 0; j < pesos.length && j < x.length; j++) {
            suma += pesos[j] * x[j];
        }
        return suma;
    }

    public double[] getPesos() {
        return pesos.clone();
    }

    public double getBias() {
        return bias;
    }
}
