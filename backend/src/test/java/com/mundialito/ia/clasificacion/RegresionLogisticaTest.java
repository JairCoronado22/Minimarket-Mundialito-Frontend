package com.mundialito.ia.clasificacion;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RegresionLogisticaTest {

    @Test
    void clasificaDatosLinealmenteSeparables() {
        // Datos separables: x > 5 → clase 1
        double[][] X = {
                {1.0}, {2.0}, {3.0}, {4.0},
                {6.0}, {7.0}, {8.0}, {9.0}
        };
        int[] y = {0, 0, 0, 0, 1, 1, 1, 1};

        RegresionLogistica modelo = RegresionLogistica.entrenar(X, y, 0.1, 500);

        assertEquals(0, modelo.predecir(new double[]{2.0}));
        assertEquals(1, modelo.predecir(new double[]{8.0}));
    }

    @Test
    void probabilidadEntre0y1() {
        double[][] X = {{1.0}, {2.0}, {3.0}, {4.0}, {5.0}};
        int[] y = {0, 0, 1, 1, 1};

        RegresionLogistica modelo = RegresionLogistica.entrenar(X, y, 0.1, 200);

        double prob = modelo.predecirProbabilidad(new double[]{3.0});
        assertTrue(prob >= 0.0 && prob <= 1.0);
    }
}
