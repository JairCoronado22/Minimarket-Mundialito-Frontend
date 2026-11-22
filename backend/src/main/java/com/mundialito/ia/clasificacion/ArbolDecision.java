package com.mundialito.ia.clasificacion;

import java.util.ArrayList;
import java.util.List;

/**
 * Árbol de Decisión (ID3 simplificado) para clasificación binaria.
 *
 * Construye un árbol binario dividiendo por la característica y umbral
 * que maximizan la ganancia de información (reducción de entropía).
 */
public class ArbolDecision {

    private Nodo raiz;

    /**
     * Nodo del árbol de decisión.
     */
    static class Nodo {
        int caracteristicaIndex;
        double umbral;
        int clasePredeterminada; // si es hoja
        boolean esHoja;
        Nodo izquierda; // ≤ umbral
        Nodo derecha;   // > umbral
    }

    /**
     * Entrena el árbol de decisión.
     *
     * @param X matriz de características
     * @param y etiquetas binarias
     * @param maxProfundidad profundidad máxima del árbol
     * @return modelo entrenado
     */
    public static ArbolDecision entrenar(double[][] X, int[] y, int maxProfundidad) {
        if (X.length == 0) throw new IllegalArgumentException("No hay datos");
        ArbolDecision arbol = new ArbolDecision();
        List<Integer> indices = new ArrayList<>();
        for (int i = 0; i < X.length; i++) indices.add(i);
        arbol.raiz = construirArbol(X, y, indices, maxProfundidad);
        return arbol;
    }

    private static Nodo construirArbol(double[][] X, int[] y, List<Integer> indices, int profundidad) {
        Nodo nodo = new Nodo();

        // Contar clases
        int count0 = 0, count1 = 0;
        for (int idx : indices) {
            if (y[idx] == 1) count1++;
            else count0++;
        }

        // Casos base: hoja
        if (indices.size() <= 2 || profundidad <= 0 || count0 == 0 || count1 == 0) {
            nodo.esHoja = true;
            nodo.clasePredeterminada = count1 >= count0 ? 1 : 0;
            return nodo;
        }

        // Encontrar la mejor división
        int m = X[0].length;
        double mejorGanancia = -1;
        int mejorCaracteristica = 0;
        double mejorUmbral = 0;

        double entropiaPadre = entropia(count0, count1);

        for (int j = 0; j < m; j++) {
            // Valores únicos para umbral
            List<Double> valores = new ArrayList<>();
            for (int idx : indices) valores.add(X[idx][j]);
            valores.sort(Double::compareTo);

            for (int v = 0; v < valores.size() - 1; v++) {
                double umbral = (valores.get(v) + valores.get(v + 1)) / 2.0;

                int left0 = 0, left1 = 0, right0 = 0, right1 = 0;
                for (int idx : indices) {
                    if (X[idx][j] <= umbral) {
                        if (y[idx] == 1) left1++; else left0++;
                    } else {
                        if (y[idx] == 1) right1++; else right0++;
                    }
                }

                int leftTotal = left0 + left1;
                int rightTotal = right0 + right1;
                int total = leftTotal + rightTotal;

                if (leftTotal == 0 || rightTotal == 0) continue;

                double entropiaIzq = entropia(left0, left1);
                double entropiaDer = entropia(right0, right1);
                double entropiaHija = (double) leftTotal / total * entropiaIzq
                                   + (double) rightTotal / total * entropiaDer;
                double ganancia = entropiaPadre - entropiaHija;

                if (ganancia > mejorGanancia) {
                    mejorGanancia = ganancia;
                    mejorCaracteristica = j;
                    mejorUmbral = umbral;
                }
            }
        }

        if (mejorGanancia <= 0) {
            nodo.esHoja = true;
            nodo.clasePredeterminada = count1 >= count0 ? 1 : 0;
            return nodo;
        }

        nodo.caracteristicaIndex = mejorCaracteristica;
        nodo.umbral = mejorUmbral;

        List<Integer> izquierda = new ArrayList<>();
        List<Integer> derecha = new ArrayList<>();
        for (int idx : indices) {
            if (X[idx][mejorCaracteristica] <= mejorUmbral) izquierda.add(idx);
            else derecha.add(idx);
        }

        nodo.izquierda = construirArbol(X, y, izquierda, profundidad - 1);
        nodo.derecha = construirArbol(X, y, derecha, profundidad - 1);

        return nodo;
    }

    /**
     * Predice la clase de un punto.
     */
    public int predecir(double[] x) {
        return predecirNodo(raiz, x);
    }

    private static int predecirNodo(Nodo nodo, double[] x) {
        if (nodo.esHoja) return nodo.clasePredeterminada;
        if (x[nodo.caracteristicaIndex] <= nodo.umbral) {
            return predecirNodo(nodo.izquierda, x);
        } else {
            return predecirNodo(nodo.derecha, x);
        }
    }

    private static double entropia(int count0, int count1) {
        int total = count0 + count1;
        if (total == 0) return 0;
        double p0 = (double) count0 / total;
        double p1 = (double) count1 / total;
        double ent = 0;
        if (p0 > 0) ent -= p0 * Math.log(p0) / Math.log(2);
        if (p1 > 0) ent -= p1 * Math.log(p1) / Math.log(2);
        return ent;
    }
}
