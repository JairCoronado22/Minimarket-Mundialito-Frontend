package com.mundialito.ia.regresion;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RegresionPolinomialTest {

    @Test
    void polinomialGrado2ConDatosCuadraticos() {
        // y = x²
        double[] x = {1, 2, 3, 4, 5};
        double[] y = {1, 4, 9, 16, 25};

        RegresionPolinomial modelo = RegresionPolinomial.entrenar(x, y, 2);

        assertEquals(1.0, modelo.predecir(1), 0.1);
        assertEquals(4.0, modelo.predecir(2), 0.1);
        assertEquals(9.0, modelo.predecir(3), 0.1);
        assertEquals(0.0, modelo.calcularMAE(x, y), 0.1);
    }

    @Test
    void polinomialGrado1EsLineal() {
        // y = 3x + 2
        double[] x = {1, 2, 3, 4, 5};
        double[] y = {5, 8, 11, 14, 17};

        RegresionPolinomial modelo = RegresionPolinomial.entrenar(x, y, 1);

        assertEquals(5.0, modelo.predecir(1), 0.1);
        assertEquals(20.0, modelo.predecir(6), 0.1);
    }

    @Test
    void polinomialCapturaPatronNoLineal() {
        double[] x = {1, 2, 3, 4, 5, 6, 7};
        double[] y = {2, 5, 10, 17, 26, 37, 50}; // y = x² + 1

        RegresionPolinomial modelo = RegresionPolinomial.entrenar(x, y, 2);

        assertTrue(modelo.calcularMAE(x, y) < 0.5);
    }
}
