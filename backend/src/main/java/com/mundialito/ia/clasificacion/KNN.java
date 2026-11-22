package com.mundialito.ia.clasificacion;

import java.util.Arrays;
import java.util.Comparator;
import java.util.IntSummaryStatistics;

/**
 * K-Nearest Neighbors (KNN) para clasificación binaria.
 *
 * Clasifica un punto basándose en la votación mayoritaria de sus k vecinos
 * más cercanos, usando distancia euclidiana.
 */
public class KNN {

    private final double[][] entrenamientoX;
    private final int[] entrenamientoY;
    private final int k;

    public KNN(double[][] X, int[] y, int k) {
        if (X.length != y.length) {
            throw new IllegalArgumentException("X e y deben tener el mismo tamaño");
        }
        this.entrenamientoX = X;
        this.entrenamientoY = y;
        this.k = k;
    }

    /**
     * Predice la clase de un punto usando votación mayoritaria de k vecinos.
     */
    public int predecir(double[] x) {
        int n = entrenamientoX.length;
        double[] distancias = new double[n];

        for (int i = 0; i < n; i++) {
            distancias[i] = distanciaEuclidiana(x, entrenamientoX[i]);
        }

        // Encontrar los k más cercanos sin ordenar completamente
        Integer[] indices = new Integer[n];
        for (int i = 0; i < n; i++) indices[i] = i;
        Arrays.sort(indices, Comparator.comparingDouble(i -> distancias[i]));

        // Votación mayoritaria
        int votos0 = 0, votos1 = 0;
        int limite = Math.min(k, n);
        for (int i = 0; i < limite; i++) {
            int idx = indices[i];
            if (entrenamientoY[idx] == 1) votos1++;
            else votos0++;
        }

        return votos1 >= votos0 ? 1 : 0;
    }

    /**
     * Predice la "probabilidad" como proporción de votos de clase 1 entre k vecinos.
     */
    public double predecirProbabilidad(double[] x) {
        int n = entrenamientoX.length;
        double[] distancias = new double[n];

        for (int i = 0; i < n; i++) {
            distancias[i] = distanciaEuclidiana(x, entrenamientoX[i]);
        }

        Integer[] indices = new Integer[n];
        for (int i = 0; i < n; i++) indices[i] = i;
        Arrays.sort(indices, Comparator.comparingDouble(i -> distancias[i]));

        int votos1 = 0;
        int limite = Math.min(k, n);
        for (int i = 0; i < limite; i++) {
            if (entrenamientoY[indices[i]] == 1) votos1++;
        }

        return (double) votos1 / limite;
    }

    private static double distanciaEuclidiana(double[] a, double[] b) {
        double suma = 0;
        for (int i = 0; i < a.length && i < b.length; i++) {
            double diff = a[i] - b[i];
            suma += diff * diff;
        }
        return Math.sqrt(suma);
    }

    public int getK() {
        return k;
    }
}
