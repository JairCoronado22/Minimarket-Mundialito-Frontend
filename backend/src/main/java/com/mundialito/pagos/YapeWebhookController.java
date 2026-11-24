package com.mundialito.pagos;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/pagos")
public class YapeWebhookController {

    private final YapeWebhookService webhookService;

    public YapeWebhookController(YapeWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    /**
     * Recibe el webhook de MacroDroid cuando llega una notificación de Yape.
     * Acepta JSON: {"mensaje": "..."} o texto plano directo: "Yape! Juan Pérez te envió S/ 2.5."
     * Ejemplo JSON: {"mensaje": "Yape! Juan Pérez te envió S/ 5.00"}
     * Ejemplo texto plano: "Confirmación de Pago Aida Isu* te envió un pago por S/ 2.5. El cód. de seguridad es: 899"
     */
    @PostMapping(path = "/yape-webhook", consumes = MediaType.ALL_VALUE)
    public ResponseEntity<Map<String, Object>> recibirWebhook(
            @RequestBody(required = false) String body) {
        
        String mensaje = extractMessage(body);
        
        if (mensaje == null || mensaje.trim().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "El cuerpo de la solicitud no contiene un mensaje válido");
        }

        NotificacionPago notificacion = webhookService.procesarWebhook(mensaje);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "estado", "recibido",
                "id", notificacion.getId(),
                "monto", notificacion.getMonto(),
                "remitente", notificacion.getRemitente(),
                "mensaje", "Notificación de Yape procesada correctamente"
        ));
    }

    /**
     * Extrae el mensaje del cuerpo de la solicitud.
     * Si es JSON con clave "mensaje", lo extrae; si es texto plano, lo usa directamente.
     */
    private String extractMessage(String body) {
        if (body == null || body.trim().isEmpty()) {
            return null;
        }

        String trimmed = body.trim();
        
        // Si empieza con {, intentar parsear como JSON
        if (trimmed.startsWith("{")) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(trimmed);
                JsonNode mensajeNode = root.get("mensaje");
                if (mensajeNode != null && mensajeNode.isTextual()) {
                    return mensajeNode.asText();
                }
            } catch (Exception e) {
                // No es JSON válido, usar como texto plano
            }
        }

        // Texto plano directo
        return trimmed;
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
