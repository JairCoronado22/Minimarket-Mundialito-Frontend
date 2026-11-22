package com.mundialito.ia.clasificacion;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ClasificadoresTest {

    @Test
    void svmClasificaDatosSeparables() {
        double[][] X = {
                {1.0}, {2.0}, {3.0}, {4.0},
                {6.0}, {7.0}, {8.0}, {9.0}
        };
        int[] y = {0, 0, 0, 0, 1, 1, 1, 1};

        SVM modelo = SVM.entrenar(X, y, 1.0, 0.01, 200);

        assertEquals(0, modelo.predecir(new double[]{2.0}));
        assertEquals(1, modelo.predecir(new double[]{8.0}));
    }

    @Test
    void knnClasificaConVecinos() {
        double[][] X = {
                {1.0}, {2.0}, {3.0},
                {8.0}, {9.0}, {10.0}
        };
        int[] y = {0, 0, 0, 1, 1, 1};

        KNN knn = new KNN(X, y, 3);

        assertEquals(0, knn.predecir(new double[]{2.5}));
        assertEquals(1, knn.predecir(new double[]{9.0}));
    }

    @Test
    void arbolDecisionClasificaCorrectamente() {
        double[][] X = {
                {1.0}, {2.0}, {3.0}, {4.0},
                {6.0}, {7.0}, {8.0}, {9.0}
        };
        int[] y = {0, 0, 0, 0, 1, 1, 1, 1};

        ArbolDecision arbol = ArbolDecision.entrenar(X, y, 5);

        assertEquals(0, arbol.predecir(new double[]{2.0}));
        assertEquals(1, arbol.predecir(new double[]{8.0}));
    }

    @Test
    void boostingMejoraConClasificadoresDebiles() {
        double[][] X = {
                {1.0}, {2.0}, {3.0}, {4.0},
                {6.0}, {7.0}, {8.0}, {9.0}
        };
        int[] y = {0, 0, 0, 0, 1, 1, 1, 1};

        Boosting boosting = Boosting.entrenar(X, y, 10);

        assertEquals(0, boosting.predecir(new double[]{2.0}));
        assertEquals(1, boosting.predecir(new double[]{8.0}));
    }
}
