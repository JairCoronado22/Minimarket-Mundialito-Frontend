package com.mundialito.producto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ProductoControllerTest {
    @Mock
    private ProductoRepository productoRepository;

    @InjectMocks
    private ProductoController productoController;

    @Test
    void registraIngresoSumandoStockAlProductoBloqueado() {
        Producto producto = new Producto();
        producto.setId(1L);
        producto.setNombre("Arroz");
        producto.setPrecio(new BigDecimal("5.80"));
        producto.setStockGondola(4);
        producto.setStockAlmacen(12);
        when(productoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(producto));
        when(productoRepository.saveAndFlush(producto)).thenReturn(producto);

        Producto actualizado = productoController.registrarIngreso(1L, new IngresoStockRequest(3));

        assertEquals(7, actualizado.getStockGondola());
        verify(productoRepository).findByIdForUpdate(1L);
        verify(productoRepository).saveAndFlush(producto);
    }

    @Test
    void noRegistraIngresoSiElProductoNoExiste() {
        when(productoRepository.findByIdForUpdate(1L)).thenReturn(Optional.empty());

        assertThrows(
                ResponseStatusException.class,
                () -> productoController.registrarIngreso(1L, new IngresoStockRequest(3)));
    }

    @Test
    void rechazaUnIngresoQueDesbordaElStockMaximo() {
        Producto producto = new Producto();
        producto.setStockGondola(Integer.MAX_VALUE);
        when(productoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(producto));

        assertThrows(
                ResponseStatusException.class,
                () -> productoController.registrarIngreso(1L, new IngresoStockRequest(1)));

        verify(productoRepository, never()).saveAndFlush(producto);
    }
}
