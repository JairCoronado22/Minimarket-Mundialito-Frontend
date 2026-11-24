package com.mundialito.producto;

import jakarta.annotation.PostConstruct;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/productos")
@Validated
public class ProductoController {
    private final ProductoRepository productoRepository;

    public ProductoController(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    @PostConstruct
    @Transactional
    public void asignarCodigosFaltantes() {
        long start = System.currentTimeMillis();
        // Usar query directo para solo productos sin código válido, en lugar de cargar todos
        List<Producto> sinCodigo = productoRepository.findByCodigoBarrasIsNullOrBlank();
        if (sinCodigo.isEmpty()) {
            long elapsed = System.currentTimeMillis() - start;
            System.out.println("[ProductoController] Todos los productos tienen código de barras válido (" + elapsed + "ms).");
            return;
        }

        // Obtener todos los códigos existentes en un solo query para evitar N+1
        List<String> codigosExistentes = productoRepository.findAllCodigosBarras();
        Set<String> codigosUsados = new HashSet<>(codigosExistentes);

        int count = 0;
        for (Producto producto : sinCodigo) {
            String codigo = generarCodigoBarrasDisponible(producto.getId(), codigosUsados);
            producto.setCodigoBarras(codigo);
            productoRepository.save(producto);
            codigosUsados.add(codigo);
            count++;
        }
        long elapsed = System.currentTimeMillis() - start;
        if (count > 0) {
            System.out.println("[ProductoController] Se asignaron códigos de barras a " + count + " productos en " + elapsed + "ms.");
        }
    }

    private boolean esEan13Valido(String codigo) {
        if (codigo == null || codigo.length() != 13) return false;
        for (int i = 0; i < 13; i++) {
            if (codigo.charAt(i) < '0' || codigo.charAt(i) > '9') return false;
        }
        // Verificar dígito verificador
        int sum = 0;
        for (int i = 0; i < 12; i++) {
            int digit = Character.getNumericValue(codigo.charAt(i));
            sum += (i % 2 == 0) ? digit : digit * 3;
        }
        int expectedCheck = (10 - (sum % 10)) % 10;
        int actualCheck = Character.getNumericValue(codigo.charAt(12));
        return expectedCheck == actualCheck;
    }

    @GetMapping
    public List<Producto> listar() {
        return productoRepository.findAll();
    }

    @GetMapping("/{id}")
    public Producto obtener(@PathVariable Long id) {
        return buscarPorId(id);
    }

    @GetMapping("/codigo/{codigoBarras}")
    public Producto obtenerPorCodigoBarras(@PathVariable String codigoBarras) {
        return productoRepository.findByCodigoBarras(codigoBarras.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Producto no encontrado para ese código de barras"));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Producto> crear(@Valid @RequestBody Producto producto) {
        producto.setId(null);
        Producto creado = guardar(producto);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    public Producto actualizar(@PathVariable Long id, @Valid @RequestBody Producto producto) {
        buscarPorId(id);
        producto.setId(id);
        return guardar(producto);
    }

    @PostMapping("/{id}/ingresos")
    @Transactional
    public Producto registrarIngreso(
            @PathVariable Long id,
            @Valid @RequestBody IngresoStockRequest request) {
        Producto producto = productoRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
        try {
            producto.setStockGondola(Math.addExact(producto.getStockGondola(), request.cantidad()));
        } catch (ArithmeticException exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "El stock supera el límite permitido.", exception);
        }
        return productoRepository.saveAndFlush(producto);
    }

    @PostMapping("/regenerar-codigos")
    @Transactional
    public ResponseEntity<String> regenerarCodigos() {
        int count = 0;
        Set<String> codigosUsados = new HashSet<>(productoRepository.findAllCodigosBarras());
        for (Producto producto : productoRepository.findAll()) {
            if (producto.getCodigoBarras() == null || producto.getCodigoBarras().isBlank()) {
                String codigo = generarCodigoBarrasDisponible(producto.getId(), codigosUsados);
                producto.setCodigoBarras(codigo);
                productoRepository.saveAndFlush(producto);
                codigosUsados.add(codigo);
                count++;
            }
        }
        return ResponseEntity.ok("Se asignaron códigos de barras a " + count + " productos.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        Producto producto = buscarPorId(id);
        try {
            productoRepository.delete(producto);
            productoRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede eliminar un producto incluido en ventas registradas.", exception);
        }
        return ResponseEntity.noContent().build();
    }

    private Producto guardar(Producto producto) {
        // Generar código de barras EAN-13 automáticamente si no se proporciona
        if (producto.getCodigoBarras() == null) {
            // Guardar primero para obtener el ID de la base de datos
            Producto temporal = productoRepository.saveAndFlush(producto);
            Set<String> codigosUsados = new HashSet<>(productoRepository.findAllCodigosBarras());
            String codigoGenerado = generarCodigoBarrasDisponible(temporal.getId(), codigosUsados);
            temporal.setCodigoBarras(codigoGenerado);
            return productoRepository.saveAndFlush(temporal);
        }
        try {
            return productoRepository.saveAndFlush(producto);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El código de barras ya está asignado a otro producto.", exception);
        }
    }

    /**
     * Genera un código de barras EAN-13 con prefijo peruano (775) basado en el ID del producto.
     * Formato: prefijo 775 + ID (rellenado a nueve dígitos) + dígito verificador.
     */
    private String generarCodigoBarras(Long id) {
        if (id == null || id <= 0 || id > 999999999L) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No hay un correlativo disponible para generar un código EAN-13 único.");
        }

        String base = "775" + String.format("%09d", id);
        // Calcular dígito verificador EAN-13
        int checksum = calcularDigitoVerificadorEan13(base);
        return base + checksum;
    }

    private String generarCodigoBarrasDisponible(Long id, Set<String> codigosUsados) {
        long sequence = id;
        while (sequence <= 999999999L) {
            String codigo = generarCodigoBarras(sequence);
            if (!codigosUsados.contains(codigo)) return codigo;
            sequence++;
        }

        throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "No hay un correlativo disponible para generar un código EAN-13 único.");
    }

    private int calcularDigitoVerificadorEan13(String base12) {
        int sum = 0;
        for (int i = 0; i < base12.length(); i++) {
            int digit = Character.getNumericValue(base12.charAt(i));
            // Posiciones impares (0,2,4...) se suman directas, pares (1,3,5...) se multiplican por 3
            sum += (i % 2 == 0) ? digit : digit * 3;
        }
        return (10 - (sum % 10)) % 10;
    }

    private Producto buscarPorId(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
    }
}
