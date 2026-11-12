package com.mundialito.venta;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.mundialito.producto.Producto;
import com.mundialito.producto.ProductoRepository;

@ExtendWith(MockitoExtension.class)
class VentaServiceTest {
    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private VentaRepository ventaRepository;

    @InjectMocks
    private VentaService ventaService;

    private Producto producto;

    @BeforeEach
    void setUp() {
        producto = new Producto();
        producto.setId(1L);
        producto.setNombre("Arroz");
        producto.setPrecio(new BigDecimal("5.80"));
        producto.setStockGondola(4);
        producto.setStockAlmacen(12);
    }

    @Test
    void registraVentaConPrecioDeBaseDeDatosYDescuentaStock() {
        when(productoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(producto));
        when(ventaRepository.save(org.mockito.ArgumentMatchers.any(Venta.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        CrearVentaRequest request = new CrearVentaRequest("Cajero", "Caja 01", "EFECTIVO",
                List.of(new CrearVentaRequest.ItemVentaRequest(1L, 2)));

        Venta venta = ventaService.registrar(request);

        assertEquals(new BigDecimal("11.60"), venta.getTotal());
        assertEquals(2, venta.getItems().get(0).getCantidad());
        assertEquals(new BigDecimal("5.80"), venta.getItems().get(0).getPrecioUnitario());
        assertEquals(2, producto.getStockGondola());
        verify(ventaRepository).save(venta);
    }

    @Test
    void noRegistraVentaSiElStockEsInsuficiente() {
        when(productoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(producto));
        CrearVentaRequest request = new CrearVentaRequest("Cajero", "Caja 01", "EFECTIVO",
                List.of(new CrearVentaRequest.ItemVentaRequest(1L, 5)));

        assertThrows(ResponseStatusException.class, () -> ventaService.registrar(request));

        assertEquals(4, producto.getStockGondola());
        verify(ventaRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void noMarcaComoPagadaUnaVentaConMedioDePagoNoConfirmado() {
        CrearVentaRequest request = new CrearVentaRequest("Cajero", "Caja 01", "CULQI",
                List.of(new CrearVentaRequest.ItemVentaRequest(1L, 1)));

        assertThrows(ResponseStatusException.class, () -> ventaService.registrar(request));

        verify(productoRepository, never()).findByIdForUpdate(1L);
        verify(ventaRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @ParameterizedTest
    @ValueSource(strings = { "TARJETA", "YAPE" })
    void registraVentasConMediosDigitalesSinProcesarUnCobroReal(String medioPago) {
        when(productoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(producto));
        when(ventaRepository.save(org.mockito.ArgumentMatchers.any(Venta.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        CrearVentaRequest request = new CrearVentaRequest("Cajero", "Caja 01", medioPago,
                List.of(new CrearVentaRequest.ItemVentaRequest(1L, 1)));

        Venta venta = ventaService.registrar(request);

        assertEquals(medioPago, venta.getMedioPago());
        assertEquals("PAGADA", venta.getEstado());
        assertEquals(3, producto.getStockGondola());
        verify(ventaRepository).save(venta);
    }

    @Test
    void rechazaPlinMientrasNoEsteHabilitado() {
        CrearVentaRequest request = new CrearVentaRequest("Cajero", "Caja 01", "PLIN",
                List.of(new CrearVentaRequest.ItemVentaRequest(1L, 1)));

        assertThrows(ResponseStatusException.class, () -> ventaService.registrar(request));

        verify(productoRepository, never()).findByIdForUpdate(1L);
        verify(ventaRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
