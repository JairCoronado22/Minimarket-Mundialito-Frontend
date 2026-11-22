package com.mundialito.ia.busqueda;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AStarBusquedaTest {

    @Test
    void aStarEncuentraSolucionConTresProductos() {
        List<EstadoReposicion> productos = List.of(
                new EstadoReposicion(1L, "Producto A", 3, 10, new BigDecimal("5.00"), 2.0, 15),
                new EstadoReposicion(2L, "Producto B", 5, 8, new BigDecimal("3.00"), 3.0, 15),
                new EstadoReposicion(3L, "Producto C", 1, 20, new BigDecimal("7.00"), 1.5, 15)
        );

        AStarBusqueda aStar = new AStarBusqueda();
        ResultadoBusqueda resultado = aStar.buscar(productos, 15);

        assertEquals("A*", resultado.getAlgoritmo());
        assertEquals(3, resultado.getPasos().size());
        assertTrue(resultado.getNodosExpandidos() > 0);
    }

    @Test
    void aStarOrdenaPorUrgencia() {
        List<EstadoReposicion> productos = List.of(
                new EstadoReposicion(1L, "Bajo urgencia", 10, 10, new BigDecimal("5.00"), 1.0, 15),
                new EstadoReposicion(2L, "Alta urgencia", 1, 20, new BigDecimal("7.00"), 5.0, 15)
        );

        AStarBusqueda aStar = new AStarBusqueda();
        ResultadoBusqueda resultado = aStar.buscar(productos, 15);

        assertEquals(2, resultado.getPasos().size());
        // El producto con mayor urgencia (menor ratio stock/demanda) debería ir primero
        assertEquals("Alta urgencia", resultado.getPasos().get(0).getNombreProducto());
    }
}
