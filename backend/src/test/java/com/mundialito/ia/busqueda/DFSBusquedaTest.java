package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DFSBusquedaTest {

    @Test
    void dfsEncuentraSolucionConTresProductos() {
        List<EstadoReposicion> productos = List.of(
                new EstadoReposicion(1L, "Producto A", 3, 10, new BigDecimal("5.00"), 2.0, 15),
                new EstadoReposicion(2L, "Producto B", 5, 8, new BigDecimal("3.00"), 3.0, 15),
                new EstadoReposicion(3L, "Producto C", 1, 20, new BigDecimal("7.00"), 1.5, 15)
        );

        DFSBusqueda dfs = new DFSBusqueda();
        ResultadoBusqueda resultado = dfs.buscar(productos, 15);

        assertEquals("DFS", resultado.getAlgoritmo());
        assertEquals(3, resultado.getPasos().size());
        assertTrue(resultado.getNodosExpandidos() > 0);
    }

    @Test
    void dfsConListaVacia() {
        DFSBusqueda dfs = new DFSBusqueda();
        ResultadoBusqueda resultado = dfs.buscar(List.of(), 15);

        assertTrue(resultado.getPasos().isEmpty());
    }
}
