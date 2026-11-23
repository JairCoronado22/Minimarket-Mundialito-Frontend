package com.mundialito.pagos;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/pagos")
public class YapeWebhookController {

    private final YapeWebhookService webhookService;

    public YapeWebhookController(YapeWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    /**
     * Recibe el webhook de MacroDroid cuando llega una notificación de Yape.
     * MacroDroid envía: {"mensaje": "{not_title} {not_text}"}
     * Ejemplo: {"mensaje": "Yape! Juan Pérez te envió S/ 5.00"}
     */
    @PostMapping("/yape-webhook")
    public ResponseEntity<Map<String, Object>> recibirWebhook(@RequestBody YapeWebhookRequest request) {
        if (request.mensaje() == null || request.mensaje().trim().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "El campo 'mensaje' es requerido");
        }

        NotificacionPago notificacion = webhookService.procesarWebhook(request.mensaje());

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "estado", "recibido",
                "id", notificacion.getId(),
                "monto", notificacion.getMonto(),
                "remitente", notificacion.getRemitente(),
                "mensaje", "Notificación de Yape procesada correctamente"
        ));
    }

    /**
     * Lista todas las notificaciones de pago recibidas.
     */
    @GetMapping("/notificaciones")
    public List<NotificacionPago> listarNotificaciones() {
        return webhookService.listarTodas();
    }

    /**
     * Lista las notificaciones aún no procesadas manualmente.
     */
    @GetMapping("/notificaciones/pending")
    public List<NotificacionPago> listarPendientes() {
        return webhookService.listarNoProcesadas();
    }
}
