package com.mundialito.ia.busqueda;

import java.util.List;

/**
 * Interfaz común para algoritmos de búsqueda de reposición de stock.
 * Cada algoritmo recibe los productos con stock bajo y devuelve un plan ordenado
 * de reposición que minimiza el costo o la urgencia.
 */
public interface BusquedaIA {

    /**
     * Ejecuta el algoritmo de búsqueda sobre los productos con stock bajo.
     *
     * @param productosBajoStock lista de estados de reposición (productos con stock ≤ umbral)
     * @param stockMinimo        stock deseado que cada producto debe alcanzar
     * @return resultado con los pasos de reposición ordenados y métricas del algoritmo
     */
    ResultadoBusqueda buscar(List<EstadoReposicion> productosBajoStock, int stockMinimo);

    /**
     * Nombre del algoritmo para identificación en los resultados.
     */
    String nombre();
}
