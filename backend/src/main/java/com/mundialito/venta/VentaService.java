package com.mundialito.venta;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.mundialito.producto.Producto;
import com.mundialito.producto.ProductoRepository;

@Service
public class VentaService {
    private static final Set<String> MEDIOS_PAGO_REGISTRABLES = Set.of(
            "EFECTIVO", "TARJETA", "YAPE");

    private final ProductoRepository productoRepository;
    private final VentaRepository ventaRepository;

    public VentaService(ProductoRepository productoRepository, VentaRepository ventaRepository) {
        this.productoRepository = productoRepository;
        this.ventaRepository = ventaRepository;
    }

    @Transactional(readOnly = true)
    public List<Venta> listar() {
        return ventaRepository.findAll();
    }

    @Transactional
    public Venta registrar(CrearVentaRequest request) {
        String medioPago = request.medioPago().trim().toUpperCase(Locale.ROOT);
        if (!MEDIOS_PAGO_REGISTRABLES.contains(medioPago)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Medio de pago no disponible. Se permiten EFECTIVO, TARJETA y YAPE; "
                            + "Tarjeta y Yape solo se registran manualmente, no se procesan en línea.");
        }

        Map<Long, Integer> cantidades = new TreeMap<>();
        for (CrearVentaRequest.ItemVentaRequest item : request.items()) {
            try {
                cantidades.merge(item.productoId(), item.cantidad(), Math::addExact);
            } catch (ArithmeticException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "La cantidad solicitada para un producto es demasiado grande", exception);
            }
        }

        Map<Long, Producto> productos = new TreeMap<>();
        for (Long productoId : cantidades.keySet()) {
            Producto producto = productoRepository.findByIdForUpdate(productoId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Producto " + productoId + " no encontrado"));
            int cantidad = cantidades.get(productoId);
            if (producto.getStockGondola() < cantidad) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Stock insuficiente para " + producto.getNombre());
            }
            productos.put(productoId, producto);
        }

        BigDecimal total = BigDecimal.ZERO;
        Map<Long, BigDecimal> subtotales = new TreeMap<>();
        for (Map.Entry<Long, Integer> entry : cantidades.entrySet()) {
            Producto producto = productos.get(entry.getKey());
            BigDecimal subtotal = producto.getPrecio()
                    .multiply(BigDecimal.valueOf(entry.getValue()));
            subtotales.put(entry.getKey(), subtotal);
            total = total.add(subtotal);
        }

        Venta venta = new Venta(OffsetDateTime.now(),
                request.cajero().trim(), request.terminal().trim(),
                medioPago, "PAGADA", total);
        for (Map.Entry<Long, Integer> entry : cantidades.entrySet()) {
            Producto producto = productos.get(entry.getKey());
            BigDecimal subtotal = subtotales.get(entry.getKey());
            venta.agregarItem(new DetalleVenta(producto.getId(), producto.getNombre(),
                    entry.getValue(), producto.getPrecio(), subtotal));
            producto.setStockGondola(producto.getStockGondola() - entry.getValue());
        }

        return ventaRepository.save(venta);
    }
}
