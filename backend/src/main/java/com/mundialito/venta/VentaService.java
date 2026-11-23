package com.mundialito.venta;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
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

    @Transactional(readOnly = true)
    public Optional<Venta> buscarPorId(Integer id) {
        return ventaRepository.findById(id);
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

        // Yape crea la venta en estado PENDIENTE esperando confirmación del webhook
        String estado = "YAPE".equals(medioPago) ? "PENDIENTE" : "PAGADA";
        Venta venta = new Venta(OffsetDateTime.now(),
                request.cajero().trim(), request.terminal().trim(),
                medioPago, estado, total);
        for (Map.Entry<Long, Integer> entry : cantidades.entrySet()) {
            Producto producto = productos.get(entry.getKey());
            BigDecimal subtotal = subtotales.get(entry.getKey());
            venta.agregarItem(new DetalleVenta(producto.getId(), producto.getNombre(),
                    entry.getValue(), producto.getPrecio(), subtotal));
            // Solo descontar stock si la venta es PAGADA (no PENDIENTE)
            if ("PAGADA".equals(estado)) {
                producto.setStockGondola(producto.getStockGondola() - entry.getValue());
            }
        }

        return ventaRepository.save(venta);
    }

    /**
     * Confirma una venta PENDIENTE (por ejemplo, tras recibir el webhook de Yape).
     * Cambia el estado a PAGADO y descuenta el stock de góndola.
     */
    @Transactional
    public Venta confirmarVenta(Integer ventaId) {
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Venta " + ventaId + " no encontrada"));

        if (!"PENDIENTE".equals(venta.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La venta ya está en estado " + venta.getEstado() + "; solo se pueden confirmar ventas PENDIENTE");
        }

        venta.setEstado("PAGADA");

        // Descontar el stock de góndola ahora que el pago está confirmado
        for (DetalleVenta detalle : venta.getItems()) {
            Producto producto = productoRepository.findByIdForUpdate(detalle.getProductoId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Producto " + detalle.getProductoId() + " no encontrado"));
            if (producto.getStockGondola() < detalle.getCantidad()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Stock insuficiente para " + producto.getNombre()
                                + " al confirmar venta (posible venta duplicada)");
            }
            producto.setStockGondola(producto.getStockGondola() - detalle.getCantidad());
        }

        return ventaRepository.save(venta);
    }
}
