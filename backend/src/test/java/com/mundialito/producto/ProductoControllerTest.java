package com.mundialito.producto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

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

    @Test
    void generaCodigosEan13UnicosConIdsDeMasDeCincoCifras() {
        AtomicLong nextId = new AtomicLong(100000);
        when(productoRepository.saveAndFlush(any(Producto.class)))
                .thenAnswer(invocation -> {
                    Producto producto = invocation.getArgument(0);
                    if (producto.getId() == null) {
                        producto.setId(nextId.getAndIncrement());
                    }
                    return producto;
                });

        Producto primero = productoController.crear(nuevoProducto()).getBody();
        Producto segundo = productoController.crear(nuevoProducto()).getBody();

        assertEquals("7750001000006", primero.getCodigoBarras());
        assertEquals("7750001000013", segundo.getCodigoBarras());
        assertNotEquals(primero.getCodigoBarras(), segundo.getCodigoBarras());
        assertTrue(primero.getCodigoBarras().matches("775[0-9]{10}"));
    }

    @Test
    void omiteUnCorrelativoQueYaEstaAsignado() {
        AtomicLong nextId = new AtomicLong(100000);
        when(productoRepository.findAllCodigosBarras()).thenReturn(List.of("7750001000006"));
        when(productoRepository.saveAndFlush(any(Producto.class)))
                .thenAnswer(invocation -> {
                    Producto producto = invocation.getArgument(0);
                    if (producto.getId() == null) {
                        producto.setId(nextId.getAndIncrement());
                    }
                    return producto;
                });

        Producto creado = productoController.crear(nuevoProducto()).getBody();

        assertEquals("7750001000013", creado.getCodigoBarras());
    }

    private Producto nuevoProducto() {
        Producto producto = new Producto();
        producto.setNombre("Producto de prueba");
        producto.setPrecio(new BigDecimal("1.00"));
        producto.setStockGondola(0);
        producto.setStockAlmacen(0);
        return producto;
    }
}
