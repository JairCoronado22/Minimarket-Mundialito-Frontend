package com.mundialito.ia.regresion;

/**
 * Regresión lineal simple usando el método de mínimos cuadrados.
 *
 * Ajusta una línea y = a + b*x a un conjunto de puntos (x, y).
 * Los coeficientes se calculan como:
 *   b = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
 *   a = (Σy - b*Σx) / n
 */
public class RegresionLineal {

    private final double a; // intercepto
    private final double b; // pendiente

    private RegresionLineal(double a, double b) {
        this.a = a;
        this.b = b;
    }

    /**
     * Entrena el modelo con datos históricos.
     *
     * @param x valores independientes (ej: día secuencial)
     * @param y valores dependientes (ej: cantidad vendida)
     * @return modelo entrenado
     * @throws IllegalArgumentException si hay menos de 2 puntos
     */
    public static RegresionLineal entrenar(double[] x, double[] y) {
        if (x.length != y.length || x.length < 2) {
            throw new IllegalArgumentException("Se necesitan al menos 2 puntos de datos");
        }

        int n = x.length;
        double sumaX = 0, sumaY = 0, sumaXY = 0, sumaX2 = 0;

        for (int i = 0; i < n; i++) {
            sumaX += x[i];
            sumaY += y[i];
            sumaXY += x[i] * y[i];
            sumaX2 += x[i] * x[i];
        }

        double denominador = n * sumaX2 - sumaX * sumaX;
        if (Math.abs(denominador) < 1e-10) {
            // Datos degenerados: devolver línea horizontal con promedio de y
            return new RegresionLineal(sumaY / n, 0.0);
        }

        double b = (n * sumaXY - sumaX * sumaY) / denominador;
        double a = (sumaY - b * sumaX) / n;

        return new RegresionLineal(a, b);
    }

    /**
     * Predice el valor de y para un dado x.
     */
    public double predecir(double x) {
        return a + b * x;
    }

    /**
     * Calcula el MAE (Mean Absolute Error) contra datos de validación.
     */
    public double calcularMAE(double[] x, double[] y) {
        double suma = 0;
        for (int i = 0; i < x.length; i++) {
            suma += Math.abs(y[i] - predecir(x[i]));
        }
        return suma / x.length;
    }

    /**
     * Calcula el RMSE (Root Mean Square Error) contra datos de validación.
     */
    public double calcularRMSE(double[] x, double[] y) {
        double suma = 0;
        for (int i = 0; i < x.length; i++) {
            double error = y[i] - predecir(x[i]);
            suma += error * error;
        }
        return Math.sqrt(suma / x.length);
    }

    public double getA() {
        return a;
    }

    public double getB() {
        return b;
    }
}
