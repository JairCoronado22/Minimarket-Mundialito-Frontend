package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class HillClimbingBusquedaTest {

    @Test
    void hillClimbingEncuentraSolucion() {
        List<EstadoReposicion> productos = List.of(
                new EstadoReposicion(1L, "Producto A", 3, 10, new BigDecimal("5.00"), 2.0, 15),
                new EstadoReposicion(2L, "Producto B", 5, 8, new BigDecimal("3.00"), 3.0, 15),
                new EstadoReposicion(3L, "Producto C", 1, 20, new BigDecimal("7.00"), 1.5, 15)
        );

        HillClimbingBusqueda hc = new HillClimbingBusqueda();
        ResultadoBusqueda resultado = hc.buscar(productos, 15);

        assertEquals("Hill Climbing", resultado.getAlgoritmo());
        assertEquals(3, resultado.getPasos().size());
        assertTrue(resultado.getNodosExpandidos() > 0);
    }

    @Test
    void hillClimbingConListaVacia() {
        HillClimbingBusqueda hc = new HillClimbingBusqueda();
        ResultadoBusqueda resultado = hc.buscar(List.of(), 15);

        assertTrue(resultado.getPasos().isEmpty());
    }
}
