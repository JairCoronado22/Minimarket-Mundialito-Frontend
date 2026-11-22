package com.mundialito.ia.regresion;

/**
 * Regresión polinomial para modelar relaciones no lineales.
 *
 * Ajusta un polinomio de grado configurable:
 *   y = c0 + c1*x + c2*x² + ... + cn*xⁿ
 *
 * Usa mínimos cuadrados con la matriz de Vandermonde para resolver
 * el sistema de ecuaciones lineales.
 */
public class RegresionPolinomial {

    private final double[] coeficientes; // c0, c1, c2, ..., cn
    private final int grado;

    private RegresionPolinomial(double[] coeficientes, int grado) {
        this.coeficientes = coeficientes;
        this.grado = grado;
    }

    /**
     * Entrena el modelo polinomial con datos históricos.
     *
     * @param x     valores independientes
     * @param y     valores dependientes
     * @param grado grado del polinomio (1=lineal, 2=cuadrático, 3=cúbico)
     * @return modelo entrenado
     */
    public static RegresionPolinomial entrenar(double[] x, double[] y, int grado) {
        if (x.length != y.length || x.length < grado + 1) {
            throw new IllegalArgumentException(
                    "Se necesitan al menos " + (grado + 1) + " puntos para grado " + grado);
        }

        int n = x.length;
        int m = grado + 1; // número de coeficientes

        // Construir matriz de Vandermonde A (n x m)
        double[][] A = new double[n][m];
        for (int i = 0; i < n; i++) {
            A[i][0] = 1.0;
            for (int j = 1; j < m; j++) {
                A[i][j] = A[i][j - 1] * x[i];
            }
        }

        // Resolver por mínimos cuadrados: (A^T * A) * c = A^T * y
        double[][] AtA = multiplicarTranspuestaxA(A, A, m, m, n);
        double[] AtY = multiplicarTranspuestaXVector(A, y, m, n);

        double[] coeficientes = resolverSistema(AtA, AtY, m);

        return new RegresionPolinomial(coeficientes, grado);
    }

    /**
     * Predice el valor de y para un dado x.
     */
    public double predecir(double x) {
        double resultado = coeficientes[0];
        double xPotencia = 1.0;
        for (int i = 1; i < coeficientes.length; i++) {
            xPotencia *= x;
            resultado += coeficientes[i] * xPotencia;
        }
        return resultado;
    }

    /**
     * Calcula el MAE contra datos de validación.
     */
    public double calcularMAE(double[] x, double[] y) {
        double suma = 0;
        for (int i = 0; i < x.length; i++) {
            suma += Math.abs(y[i] - predecir(x[i]));
        }
        return suma / x.length;
    }

    /**
     * Calcula el RMSE contra datos de validación.
     */
    public double calcularRMSE(double[] x, double[] y) {
        double suma = 0;
        for (int i = 0; i < x.length; i++) {
            double error = y[i] - predecir(x[i]);
            suma += error * error;
        }
        return Math.sqrt(suma / x.length);
    }

    private static double[][] multiplicarTranspuestaxA(double[][] A, double[][] B, int rows, int cols, int inner) {
        double[][] result = new double[rows][cols];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                double suma = 0;
                for (int k = 0; k < inner; k++) {
                    suma += A[k][i] * B[k][j];
                }
                result[i][j] = suma;
            }
        }
        return result;
    }

    private static double[] multiplicarTranspuestaXVector(double[][] A, double[] v, int rows, int inner) {
        double[] result = new double[rows];
        for (int i = 0; i < rows; i++) {
            double suma = 0;
            for (int k = 0; k < inner; k++) {
                suma += A[k][i] * v[k];
            }
            result[i] = suma;
        }
        return result;
    }

    /**
     * Resuelve el sistema lineal Ax = b usando eliminación gaussiana.
     */
    private static double[] resolverSistema(double[][] A, double[] b, int n) {
        // Construir matriz aumentada
        double[][] aug = new double[n][n + 1];
        for (int i = 0; i < n; i++) {
            System.arraycopy(A[i], 0, aug[i], 0, n);
            aug[i][n] = b[i];
        }

        // Eliminación gaussiana con pivote parcial
        for (int col = 0; col < n; col++) {
            // Encontrar pivote
            int maxRow = col;
            double maxVal = Math.abs(aug[col][col]);
            for (int row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > maxVal) {
                    maxVal = Math.abs(aug[row][col]);
                    maxRow = row;
                }
            }

            // Intercambiar filas
            double[] temp = aug[col];
            aug[col] = aug[maxRow];
            aug[maxRow] = temp;

            if (Math.abs(aug[col][col]) < 1e-12) {
                continue; // Columna singular
            }

            // Eliminar columna
            for (int row = col + 1; row < n; row++) {
                double factor = aug[row][col] / aug[col][col];
                for (int j = col; j <= n; j++) {
                    aug[row][j] -= factor * aug[col][j];
                }
            }
        }

        // Sustitución hacia atrás
        double[] x = new double[n];
        for (int i = n - 1; i >= 0; i--) {
            double suma = aug[i][n];
            for (int j = i + 1; j < n; j++) {
                suma -= aug[i][j] * x[j];
            }
            if (Math.abs(aug[i][i]) > 1e-12) {
                x[i] = suma / aug[i][i];
            }
        }

        return x;
    }

    public double[] getCoeficientes() {
        return coeficientes.clone();
    }

    public int getGrado() {
        return grado;
    }
}
