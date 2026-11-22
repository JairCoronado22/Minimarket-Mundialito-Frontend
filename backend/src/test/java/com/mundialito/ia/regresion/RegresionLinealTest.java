package com.mundialito.ia.regresion;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RegresionLinealTest {

    @Test
    void regresionLinealConDatosLineales() {
        // y = 2x + 1
        double[] x = {1, 2, 3, 4, 5};
        double[] y = {3, 5, 7, 9, 11};

        RegresionLineal modelo = RegresionLineal.entrenar(x, y);

        assertEquals(1.0, modelo.getA(), 0.01);
        assertEquals(2.0, modelo.getB(), 0.01);
        assertEquals(13.0, modelo.predecir(6), 0.01);
        assertEquals(0.0, modelo.calcularMAE(x, y), 0.01);
        assertEquals(0.0, modelo.calcularRMSE(x, y), 0.01);
    }

    @Test
    void regresionLinealConRuido() {
        double[] x = {1, 2, 3, 4, 5};
        double[] y = {3.1, 4.9, 7.2, 8.8, 11.1};

        RegresionLineal modelo = RegresionLineal.entrenar(x, y);

        assertTrue(modelo.calcularMAE(x, y) < 0.2);
        assertTrue(modelo.calcularRMSE(x, y) < 0.2);
    }

    @Test
    void regresionLinealLanzaExcepcionConPocosDatos() {
        assertThrows(IllegalArgumentException.class, () ->
                RegresionLineal.entrenar(new double[]{1}, new double[]{2}));
    }
}
