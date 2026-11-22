package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BFSBusquedaTest {

    @Test
    void bfsEncuentraSolucionConTresProductos() {
        List<EstadoReposicion> productos = List.of(
                new EstadoReposicion(1L, "Producto A", 3, 10, new BigDecimal("5.00"), 2.0, 15),
                new EstadoReposicion(2L, "Producto B", 5, 8, new BigDecimal("3.00"), 3.0, 15),
                new EstadoReposicion(3L, "Producto C", 1, 20, new BigDecimal("7.00"), 1.5, 15)
        );

        BFSBusqueda bfs = new BFSBusqueda();
        ResultadoBusqueda resultado = bfs.buscar(productos, 15);

        assertEquals("BFS", resultado.getAlgoritmo());
        assertEquals(3, resultado.getPasos().size());
        assertTrue(resultado.getNodosExpandidos() > 0);
        assertTrue(resultado.getCostoTotal().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    void bfsConListaVacia() {
        BFSBusqueda bfs = new BFSBusqueda();
        ResultadoBusqueda resultado = bfs.buscar(List.of(), 15);

        assertTrue(resultado.getPasos().isEmpty());
        assertEquals(BigDecimal.ZERO, resultado.getCostoTotal());
    }

    @Test
    void bfsConUnSoloProducto() {
        List<EstadoReposicion> productos = List.of(
                new EstadoReposicion(1L, "Solo", 2, 5, new BigDecimal("10.00"), 1.0, 20)
        );

        BFSBusqueda bfs = new BFSBusqueda();
        ResultadoBusqueda resultado = bfs.buscar(productos, 20);

        assertEquals(1, resultado.getPasos().size());
        assertEquals(18, resultado.getPasos().get(0).getCantidad());
        assertEquals(new BigDecimal("180.00"), resultado.getPasos().get(0).getCosto());
    }
}
