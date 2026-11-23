package com.mundialito.pagos;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mundialito.venta.Venta;
import com.mundialito.venta.VentaRepository;
import com.mundialito.venta.VentaService;

@Service
public class YapeWebhookService {
    private static final Logger log = LoggerFactory.getLogger(YapeWebhookService.class);

    /*
     * Patrones de notificaciones de Yape que MacroDroid captura:
     *
     * Ejemplo 1: "Yape! Juan Pérez te envió S/ 5.00"
     * Ejemplo 2: "Yape - Transferencia recibida: S/ 150.50 de Juan Pérez"
     * Ejemplo 3: "S/ 25.00 recibido desde María López"
     *
     * El patrón principal busca "S/ X.XX" para extraer el monto.
     * El remitente se intenta extraer del contexto del mensaje.
     */
    private static final Pattern MONTO_PATTERN = Pattern.compile("S/\\s*([0-9]+(?:\\.[0-9]{1,2})?)");
    private static final Pattern ENVIADO_PATTERN = Pattern.compile(
            "[!\\s](.+?)\\s+te\\s+envi\\u00f3\\s+S/", Pattern.CASE_INSENSITIVE);
    private static final Pattern DE_PATTERN = Pattern.compile(
            "de\\s+(.+?)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern DESDE_PATTERN = Pattern.compile(
            "desde\\s+(.+?)\\s*$", Pattern.CASE_INSENSITIVE);

    private final NotificacionPagoRepository repository;
    private final VentaRepository ventaRepository;
    private final VentaService ventaService;

    public YapeWebhookService(NotificacionPagoRepository repository,
            VentaRepository ventaRepository, VentaService ventaService) {
        this.repository = repository;
        this.ventaRepository = ventaRepository;
        this.ventaService = ventaService;
    }

    /**
     * Procesa el mensaje de notificación de Yape enviado por MacroDroid.
     * Si se encuentra una venta PENDIENTE con el mismo monto, la confirma automáticamente.
     */
    @Transactional
    public NotificacionPago procesarWebhook(String mensajeRaw) {
        String mensaje = mensajeRaw.trim();
        if (mensaje.isEmpty()) {
            throw new IllegalArgumentException("El mensaje no puede estar vacío");
        }

        BigDecimal monto = extraerMonto(mensaje);
        String remitente = extraerRemitente(mensaje);

        NotificacionPago notificacion = new NotificacionPago(
                mensaje, remitente, monto, OffsetDateTime.now(), false);

        // Si se extrajo el monto, intentar confirmar la venta PENDIENTE más reciente
        if (monto != null) {
            List<Venta> ventasPendientes = ventaRepository
                    .findByEstadoAndTotalOrderByFechaDesc("PENDIENTE", monto);

            if (!ventasPendientes.isEmpty()) {
                Venta venta = ventasPendientes.get(0);
                try {
                    ventaService.confirmarVenta(venta.getId());
                    notificacion.setProcesada(true);
                    log.info("Webhook Yape confirmado: venta {} con monto {}", venta.getId(), monto);
                } catch (Exception e) {
                    log.warn("No se pudo confirmar venta {} con monto {}: {}",
                            venta.getId(), monto, e.getMessage());
                }
            } else {
                log.info("Webhook Yape recibido (monto {}) sin venta PENDIENTE que coincida", monto);
            }
        }

        return repository.save(notificacion);
    }

    private BigDecimal extraerMonto(String mensaje) {
        Matcher matcher = MONTO_PATTERN.matcher(mensaje);
        if (matcher.find()) {
            try {
                return new BigDecimal(matcher.group(1).replace(",", "."));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private String extraerRemitente(String mensaje) {
        // Intenta: "Yape! Juan Pérez te envió S/ 5.00"
        Matcher matcher = ENVIADO_PATTERN.matcher(mensaje);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        // Intenta: "... de Juan Pérez"
        matcher = DE_PATTERN.matcher(mensaje);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        // Intenta: "... desde María López"
        matcher = DESDE_PATTERN.matcher(mensaje);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        return "Desconocido";
    }

    @Transactional(readOnly = true)
    public List<NotificacionPago> listarTodas() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public List<NotificacionPago> listarNoProcesadas() {
        return repository.findByProcesada(false);
    }
}
